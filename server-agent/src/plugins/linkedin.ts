import { Router } from 'express';
import { chromium, Browser, Page } from 'playwright';
import { writeFile, readFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { Plugin } from '../types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const router = Router();

// State
let browser: Browser | null = null;
let isLoggedIn = false;
const SESSION_PATH = join(__dirname, '../../data/linkedin-session.json');
const COOKIES_PATH = join(__dirname, '../../data/linkedin-cookies.json');

// Post queue (in-memory, could be moved to file/db)
interface QueuedPost {
  id: string;
  content: string;
  scheduledFor: Date;
  status: 'pending' | 'processing' | 'published' | 'failed';
  error?: string;
  publishedAt?: Date;
}
const postQueue: QueuedPost[] = [];
const postHistory: QueuedPost[] = [];

// Initialize browser
async function init() {
  try {
    // Ensure data directory exists
    await mkdir(join(__dirname, '../../data'), { recursive: true });
    
    browser = await chromium.launch({
      headless: true, // Set to false for debugging
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    
    // Try to restore session
    await restoreSession();
    
    console.log('  → LinkedIn plugin initialized');
    
    // Start queue processor
    setInterval(processQueue, 60000); // Check every minute
  } catch (error) {
    console.error('  → LinkedIn plugin init failed:', error);
  }
}

// Save cookies for session persistence
async function saveCookies(page: Page) {
  try {
    const cookies = await page.context().cookies();
    await writeFile(COOKIES_PATH, JSON.stringify(cookies, null, 2));
  } catch (error) {
    console.error('Failed to save cookies:', error);
  }
}

// Load cookies to restore session
async function loadCookies(page: Page) {
  try {
    const cookiesData = await readFile(COOKIES_PATH, 'utf-8');
    const cookies = JSON.parse(cookiesData);
    await page.context().addCookies(cookies);
    return true;
  } catch {
    return false;
  }
}

// Check if we're logged in
async function checkLoginStatus(page: Page): Promise<boolean> {
  try {
    await page.goto('https://www.linkedin.com/feed/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    // Check for feed elements that only appear when logged in
    const feedExists = await page.locator('.feed-shared-update-v2').first().isVisible({ timeout: 5000 }).catch(() => false);
    const startPostButton = await page.locator('[data-test-id="post-editor-button"]').isVisible({ timeout: 3000 }).catch(() => false);
    
    return feedExists || startPostButton;
  } catch {
    return false;
  }
}

// Restore previous session
async function restoreSession() {
  if (!browser) return;
  
  try {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });
    const page = await context.newPage();
    
    const cookiesLoaded = await loadCookies(page);
    if (cookiesLoaded) {
      isLoggedIn = await checkLoginStatus(page);
      if (isLoggedIn) {
        console.log('  → LinkedIn session restored');
      }
    }
    
    await page.close();
    await context.close();
  } catch (error) {
    console.error('Session restore failed:', error);
  }
}

// Get login status
router.get('/status', async (_req, res) => {
  res.json({
    loggedIn: isLoggedIn,
    browserActive: !!browser,
    queueLength: postQueue.filter(p => p.status === 'pending').length,
    totalPublished: postHistory.filter(p => p.status === 'published').length,
  });
});

// Start login flow - returns URL to open in browser for manual login
router.post('/login/start', async (_req, res) => {
  if (!browser) {
    return res.status(503).json({ error: 'Browser not available' });
  }

  try {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });
    const page = await context.newPage();
    
    await page.goto('https://www.linkedin.com/login', { waitUntil: 'domcontentloaded' });
    
    // Wait for user to log in manually (up to 5 minutes)
    const loginTimeout = 5 * 60 * 1000;
    const startTime = Date.now();
    
    // Poll for login completion
    const checkLogin = async (): Promise<boolean> => {
      while (Date.now() - startTime < loginTimeout) {
        const url = page.url();
        if (url.includes('/feed') || url.includes('/mynetwork')) {
          return true;
        }
        await new Promise(r => setTimeout(r, 2000));
      }
      return false;
    };

    // Return immediately - login check happens async
    res.json({
      success: true,
      message: 'Login page opened. Complete login in the browser window.',
      timeout: loginTimeout / 1000,
    });

    // Wait for login in background
    const loggedIn = await checkLogin();
    if (loggedIn) {
      await saveCookies(page);
      isLoggedIn = true;
      console.log('LinkedIn login successful');
    }
    
    await page.close();
    await context.close();
  } catch (error) {
    res.status(500).json({ error: `Login failed: ${(error as Error).message}` });
  }
});

// Login with credentials (use with caution - prefer session restore)
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  if (!browser) {
    return res.status(503).json({ error: 'Browser not available' });
  }

  try {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });
    const page = await context.newPage();

    await page.goto('https://www.linkedin.com/login', { waitUntil: 'domcontentloaded' });
    
    // Fill login form
    await page.fill('#username', email);
    await page.fill('#password', password);
    await page.click('[type="submit"]');

    // Wait for navigation
    await page.waitForURL(/\/(feed|checkpoint|mynetwork)/, { timeout: 30000 });

    // Check if we hit a checkpoint (verification required)
    if (page.url().includes('checkpoint')) {
      await page.close();
      await context.close();
      return res.json({
        success: false,
        requiresVerification: true,
        message: 'LinkedIn requires additional verification. Please login manually.',
      });
    }

    // Save session
    await saveCookies(page);
    isLoggedIn = true;

    await page.close();
    await context.close();

    res.json({ success: true, message: 'Logged in successfully' });
  } catch (error) {
    res.status(500).json({ error: `Login failed: ${(error as Error).message}` });
  }
});

// Logout
router.post('/logout', async (_req, res) => {
  isLoggedIn = false;
  try {
    await writeFile(COOKIES_PATH, '[]');
  } catch {}
  res.json({ success: true });
});

// Create a post
router.post('/post', async (req, res) => {
  const { content } = req.body;

  if (!content || typeof content !== 'string') {
    return res.status(400).json({ error: 'Content is required' });
  }

  if (!isLoggedIn) {
    return res.status(401).json({ error: 'Not logged in to LinkedIn' });
  }

  if (!browser) {
    return res.status(503).json({ error: 'Browser not available' });
  }

  try {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });
    const page = await context.newPage();
    await loadCookies(page);

    // Go to feed
    await page.goto('https://www.linkedin.com/feed/', { waitUntil: 'domcontentloaded' });

    // Click "Start a post" button
    await page.click('[data-test-id="post-editor-button"], .share-box-feed-entry__trigger');
    
    // Wait for modal
    await page.waitForSelector('.ql-editor[data-placeholder]', { timeout: 10000 });

    // Type the content
    await page.fill('.ql-editor[data-placeholder]', content);

    // Small delay to let LinkedIn process
    await new Promise(r => setTimeout(r, 1000));

    // Click Post button
    await page.click('.share-actions__primary-action');

    // Wait for post to be submitted
    await page.waitForSelector('.artdeco-toast-item--visible', { timeout: 15000 }).catch(() => {});

    // Save updated cookies
    await saveCookies(page);

    const post: QueuedPost = {
      id: crypto.randomUUID(),
      content,
      scheduledFor: new Date(),
      status: 'published',
      publishedAt: new Date(),
    };
    postHistory.unshift(post);

    await page.close();
    await context.close();

    res.json({ success: true, postId: post.id, message: 'Post published successfully' });
  } catch (error) {
    console.error('Post failed:', error);
    res.status(500).json({ error: `Failed to post: ${(error as Error).message}` });
  }
});

// Schedule a post
router.post('/schedule', async (req, res) => {
  const { content, scheduledFor } = req.body;

  if (!content || !scheduledFor) {
    return res.status(400).json({ error: 'Content and scheduledFor are required' });
  }

  const post: QueuedPost = {
    id: crypto.randomUUID(),
    content,
    scheduledFor: new Date(scheduledFor),
    status: 'pending',
  };

  postQueue.push(post);
  res.json({ success: true, post });
});

// Get queue
router.get('/queue', (_req, res) => {
  res.json(postQueue.filter(p => p.status === 'pending'));
});

// Get history
router.get('/history', (_req, res) => {
  res.json(postHistory.slice(0, 50));
});

// Cancel scheduled post
router.delete('/queue/:id', (req, res) => {
  const index = postQueue.findIndex(p => p.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Post not found' });
  }

  postQueue[index].status = 'failed';
  postQueue[index].error = 'Cancelled';
  res.json({ success: true });
});

// Process scheduled posts queue
async function processQueue() {
  if (!isLoggedIn || !browser) return;

  const now = new Date();
  const duePost = postQueue.find(
    p => p.status === 'pending' && new Date(p.scheduledFor) <= now
  );

  if (!duePost) return;

  duePost.status = 'processing';

  try {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });
    const page = await context.newPage();
    await loadCookies(page);

    await page.goto('https://www.linkedin.com/feed/', { waitUntil: 'domcontentloaded' });
    await page.click('[data-test-id="post-editor-button"], .share-box-feed-entry__trigger');
    await page.waitForSelector('.ql-editor[data-placeholder]', { timeout: 10000 });
    await page.fill('.ql-editor[data-placeholder]', duePost.content);
    await new Promise(r => setTimeout(r, 1000));
    await page.click('.share-actions__primary-action');
    await page.waitForSelector('.artdeco-toast-item--visible', { timeout: 15000 }).catch(() => {});

    await saveCookies(page);
    await page.close();
    await context.close();

    duePost.status = 'published';
    duePost.publishedAt = new Date();
    postHistory.unshift({ ...duePost });

    console.log(`Published scheduled post: ${duePost.id}`);
  } catch (error) {
    duePost.status = 'failed';
    duePost.error = (error as Error).message;
    console.error(`Failed to publish scheduled post: ${duePost.id}`, error);
  }
}

const plugin: Plugin = {
  name: 'linkedin',
  description: 'LinkedIn posting via browser automation',
  routes: router,
  init,
};

export default plugin;


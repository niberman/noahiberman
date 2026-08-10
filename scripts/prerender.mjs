// Prerender the public routes to real HTML files.
//
// Why this exists: the site is a client-rendered SPA, so before this script
// every route returned the same index.html. No major AI crawler executes
// JavaScript, so /blog, /inoah and /book did not exist to GPTBot, ClaudeBot,
// PerplexityBot or their peers, and the per-route <title>, description and
// BlogPosting JSON-LD that SEO.tsx injects in a useEffect were never seen by
// anything but a browser.
//
// Deliberately no headless browser. react-snap and vite-plugin-prerender both
// need Chromium at build time, which means a browser download inside the
// Vercel build. This emits the head and a static content shell per route from
// the same data the app renders from, which is enough for a crawler and costs
// the build nothing.
//
// The shell lives inside #root and is replaced on mount: src/main.tsx uses
// createRoot().render(), not hydrateRoot(), so React discards it wholesale.
// index.html already relies on this for the homepage hero. Non-home routes
// will shift slightly when React takes over, which is the accepted trade for
// being legible to crawlers that never run the bundle.
//
// Vercel applies vercel.json rewrites AFTER the filesystem check, so a real
// file at dist/blog/index.html wins over the /(.*) -> /index.html fallback.

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { marked } from 'marked'

const SITE = 'https://noahiberman.com'
const DIST = path.resolve('dist')

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

// ---------------------------------------------------------------- blog data

async function fetchPosts() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
  if (!url || !key) {
    console.warn(
      '[prerender] No Supabase credentials in the environment. Prerendering the static routes only; no blog posts will be emitted.'
    )
    return null
  }
  const endpoint =
    `${url.replace(/\/$/, '')}/rest/v1/blog_posts` +
    `?is_published=eq.true` +
    `&select=title,slug,excerpt,content,tags,published_at,updated_at` +
    `&order=published_at.desc`
  try {
    const res = await fetch(endpoint, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    })
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
    return await res.json()
  } catch (err) {
    // A blog fetch failure must not fail the deploy. The static routes still
    // prerender and the sitemap still emits; the posts are simply absent.
    console.warn(`[prerender] Could not read blog_posts (${err.message}). Continuing without posts.`)
    return null
  }
}

// ------------------------------------------------------------ head rewriting

function setMeta(html, selectorAttr, name, content) {
  const re = new RegExp(
    `(<meta\\s+${selectorAttr}="${name}"\\s+content=")[^"]*(")`,
    'i'
  )
  return re.test(html) ? html.replace(re, `$1${esc(content)}$2`) : html
}

function rewriteHead(html, route) {
  const url = `${SITE}${route.path}`
  html = html.replace(/<title>[^<]*<\/title>/i, `<title>${esc(route.title)}</title>`)
  html = setMeta(html, 'name', 'title', route.title)
  html = setMeta(html, 'name', 'description', route.description)
  html = setMeta(html, 'property', 'og:title', route.title)
  html = setMeta(html, 'property', 'og:description', route.description)
  html = setMeta(html, 'property', 'og:url', url)
  html = setMeta(html, 'property', 'og:type', route.ogType || 'website')
  html = setMeta(html, 'property', 'og:image:alt', route.title)
  html = setMeta(html, 'name', 'twitter:title', route.title)
  html = setMeta(html, 'name', 'twitter:description', route.description)
  html = setMeta(html, 'name', 'twitter:url', url)
  html = setMeta(html, 'name', 'twitter:image:alt', route.title)
  html = html.replace(
    /(<link rel="canonical" href=")[^"]*(")/i,
    `$1${url}$2`
  )
  // The hreflang alternates and the logo preload are homepage-specific.
  html = html.replace(
    /\s*<link rel="alternate" hreflang="[^"]*" href="[^"]*" \/>/g,
    ''
  )
  return html
}

// --------------------------------------------------------- structured data

function ldBlocks(html) {
  const re = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g
  const out = []
  let m
  while ((m = re.exec(html))) out.push({ raw: m[0], body: m[1], index: m.index })
  return out
}

function rewriteStructuredData(html, route) {
  const blocks = ldBlocks(html)
  const url = `${SITE}${route.path}`

  // Drop the FAQPage. Its @id and its Q&A are the homepage's; repeating it on
  // /blog would mark up questions that are not visible on that page, which is
  // exactly what Google's FAQ policy prohibits.
  for (const b of blocks) {
    let parsed
    try {
      parsed = JSON.parse(b.body)
    } catch {
      continue
    }
    if (parsed['@type'] === 'FAQPage') {
      html = html.replace(b.raw, '')
      continue
    }
    if (Array.isArray(parsed['@graph'])) {
      const graph = parsed['@graph'].filter((n) => n['@type'] !== 'ProfilePage')
      graph.push({
        '@type': 'WebPage',
        '@id': `${url}#webpage`,
        url,
        name: route.title,
        description: route.description,
        isPartOf: { '@id': `${SITE}/#website` },
        about: { '@id': `${SITE}/#noah` },
      })
      if (route.extraNodes) graph.push(...route.extraNodes)
      const next =
        '<script type="application/ld+json">\n' +
        JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }, null, 2) +
        '\n    </script>'
      html = html.replace(b.raw, next)
    }
  }
  return html
}

// ------------------------------------------------------------ body swapping

function swapRoot(html, shell) {
  const start = html.indexOf('<div id="root">')
  if (start === -1) throw new Error('prerender: #root not found in dist/index.html')
  // Vite hoists the module script into <head> at build time, so #root is the
  // last thing in <body>. Anchor on </body>, not on the next <script>.
  const endAnchor = html.indexOf('</body>', start)
  if (endAnchor === -1) throw new Error('prerender: no </body> after #root')
  const closeIdx = html.lastIndexOf('</div>', endAnchor)
  if (closeIdx === -1 || closeIdx < start)
    throw new Error('prerender: could not find the end of #root')
  return (
    html.slice(0, start) +
    `<div id="root">\n${shell}\n  </div>\n` +
    html.slice(closeIdx + '</div>'.length).replace(/^[ \t]*/, '')
  )
}

const page = (inner) => `    <div class="min-h-screen flex flex-col relative">
      <div class="flex-1 relative z-10">
        <main class="min-h-screen relative pt-24 pb-16">
          <div class="container mx-auto px-4 sm:px-6">
            <div class="max-w-3xl mx-auto">
${inner}
            </div>
          </div>
        </main>
      </div>
    </div>`

// -------------------------------------------------------------------- routes

const fmtDate = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC',
      })
    : ''

function blogIndexShell(posts) {
  const items = posts.length
    ? posts
        .map(
          (p) => `              <article class="mb-10">
                <h2 class="text-xl sm:text-2xl font-display font-semibold text-primary-foreground mb-2"><a href="/blog/${esc(
                  p.slug
                )}">${esc(p.title)}</a></h2>
                ${p.published_at ? `<p class="text-sm text-muted-foreground mb-2">${esc(fmtDate(p.published_at))}</p>` : ''}
                ${p.excerpt ? `<p class="text-muted-foreground leading-relaxed">${esc(p.excerpt)}</p>` : ''}
              </article>`
        )
        .join('\n')
    : `              <p class="text-muted-foreground leading-relaxed">No posts published yet.</p>`
  return page(`              <h1 class="text-3xl sm:text-4xl font-display font-bold text-primary-foreground mb-8">Writing</h1>
${items}`)
}

function postShell(post) {
  let body = ''
  try {
    body = post.content ? marked.parse(post.content, { async: false }) : ''
  } catch {
    body = `<p>${esc(post.content || '')}</p>`
  }
  return page(`              <h1 class="text-3xl sm:text-4xl font-display font-bold text-primary-foreground mb-3">${esc(
    post.title
  )}</h1>
              ${post.published_at ? `<p class="text-sm text-muted-foreground mb-6">${esc(fmtDate(post.published_at))}</p>` : ''}
              ${post.excerpt ? `<p class="text-lg text-muted-foreground mb-8">${esc(post.excerpt)}</p>` : ''}
              <div class="prose prose-invert max-w-none text-muted-foreground leading-relaxed">
${body}
              </div>`)
}

function textShell(heading, paragraphs) {
  return page(`              <h1 class="text-3xl sm:text-4xl font-display font-bold text-primary-foreground mb-8">${esc(
    heading
  )}</h1>
${paragraphs
  .map((p) =>
    p.startsWith('## ')
      ? `              <h2 class="text-xl sm:text-2xl font-display font-semibold text-primary-foreground mt-8 mb-3">${esc(
          p.slice(3)
        )}</h2>`
      : `              <p class="text-muted-foreground leading-relaxed mb-4">${esc(p)}</p>`
  )
  .join('\n')}`)
}

const LEGAL = JSON.parse(await readFile(path.resolve('src/data/legal.json'), 'utf8'))

function buildRoutes(posts) {
  const routes = [
    {
      path: '/blog',
      title: 'Writing | Noah Berman',
      description:
        'Notes from Noah Berman on building software, flying, and running a one-person company in Denver, Colorado.',
      shell: blogIndexShell(posts),
      sitemap: { changefreq: 'weekly', priority: '0.8' },
    },
    {
      path: '/inoah',
      title: 'iNoah | Noah Berman',
      description:
        'iNoah is an AI assistant that answers questions about Noah Berman, his background, his flying, and the work he has shipped.',
      shell: textShell('iNoah', [
        'iNoah is an AI assistant that answers questions about Noah Berman: his background, his flying, the software he has built, and how to reach him.',
        'Ask it anything you would ask Noah in a first conversation. It answers from a knowledge base Noah maintains, not from the open web, so it will say when it does not know something rather than guess.',
      ]),
      sitemap: { changefreq: 'monthly', priority: '0.7' },
    },
    {
      path: '/book',
      title: 'Book a meeting | Noah Berman',
      description:
        'Book time with Noah Berman. Pick a meeting type and a slot, and it lands on his calendar.',
      shell: textShell('Book a meeting', [
        'Pick a meeting type and a time that works. The slots shown are real openings on Noah’s calendar, and booking one sends the invite immediately.',
        'If nothing on the calendar fits, email noah@noahiberman.com and he will find a time.',
      ]),
      sitemap: { changefreq: 'monthly', priority: '0.7' },
    },
    {
      path: '/terms',
      title: 'Terms of Use | Noah Berman',
      description: 'Terms of use for noahiberman.com.',
      shell: textShell('Terms of Use', LEGAL.terms),
      sitemap: { changefreq: 'yearly', priority: '0.2' },
    },
    {
      path: '/privacy',
      title: 'Privacy Policy | Noah Berman',
      description:
        'What noahiberman.com collects, why, who processes it, and how to have it deleted.',
      shell: textShell('Privacy Policy', LEGAL.privacy),
      sitemap: { changefreq: 'yearly', priority: '0.2' },
    },
  ]

  for (const p of posts) {
    const url = `${SITE}/blog/${p.slug}`
    routes.push({
      path: `/blog/${p.slug}`,
      title: `${p.title} | Noah Berman`,
      description: p.excerpt || `${p.title}, written by Noah Berman.`,
      ogType: 'article',
      shell: postShell(p),
      lastmod: (p.updated_at || p.published_at || '').slice(0, 10),
      sitemap: { changefreq: 'monthly', priority: '0.6' },
      extraNodes: [
        {
          '@type': 'BlogPosting',
          '@id': `${url}#post`,
          headline: p.title,
          description: p.excerpt || undefined,
          url,
          datePublished: p.published_at || undefined,
          dateModified: p.updated_at || p.published_at || undefined,
          keywords: Array.isArray(p.tags) && p.tags.length ? p.tags : undefined,
          author: { '@id': `${SITE}/#noah` },
          publisher: { '@id': `${SITE}/#noah` },
          mainEntityOfPage: { '@id': `${url}#webpage` },
        },
      ],
    })
  }
  return routes
}

// ---------------------------------------------------------------------- run

const template = await readFile(path.join(DIST, 'index.html'), 'utf8')
const posts = (await fetchPosts()) ?? []
const routes = buildRoutes(posts)

for (const route of routes) {
  let html = rewriteHead(template, route)
  html = rewriteStructuredData(html, route)
  html = swapRoot(html, route.shell)
  const dir = path.join(DIST, route.path)
  await mkdir(dir, { recursive: true })
  await writeFile(path.join(dir, 'index.html'), html, 'utf8')
}

// sitemap ---------------------------------------------------------------
const today = new Date().toISOString().slice(0, 10)
const urls = [
  { loc: `${SITE}/`, lastmod: today, changefreq: 'weekly', priority: '1.0' },
  ...routes.map((r) => ({
    loc: `${SITE}${r.path}`,
    lastmod: r.lastmod || today,
    changefreq: r.sitemap.changefreq,
    priority: r.sitemap.priority,
  })),
]
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<!-- Generated by scripts/prerender.mjs at build time. Do not hand-edit; the
     previous hand-maintained file listed four URLs, carried a lastmod of
     2026-03-25, and contained no blog posts at all. -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>
`
await writeFile(path.join(DIST, 'sitemap.xml'), sitemap, 'utf8')

// llms.txt writing inventory --------------------------------------------
const llmsPath = path.join(DIST, 'llms.txt')
if (existsSync(llmsPath) && posts.length) {
  const llms = await readFile(llmsPath, 'utf8')
  const section =
    '\n## Writing\n\n' +
    posts
      .map((p) => {
        const dek = p.excerpt ? `: ${p.excerpt}` : ''
        const when = p.published_at ? ` (${p.published_at.slice(0, 10)})` : ''
        return `- [${p.title}](${SITE}/blog/${p.slug})${when}${dek}`
      })
      .join('\n') +
    '\n'
  const marker = '\n## Contact\n'
  const out = llms.includes(marker)
    ? llms.replace(marker, `${section}${marker}`)
    : llms + section
  await writeFile(llmsPath, out, 'utf8')
}

console.log(
  `[prerender] ${routes.length} routes written (${posts.length} blog post${
    posts.length === 1 ? '' : 's'
  }), sitemap has ${urls.length} URLs.`
)

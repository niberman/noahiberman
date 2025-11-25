import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Linkedin,
  Send,
  Clock,
  History,
  Link,
  Unlink,
  RefreshCw,
  Check,
  AlertTriangle,
  Loader2,
  Calendar,
  Zap,
  X,
  Server,
} from 'lucide-react';
import {
  useLinkedInStatus,
  useLinkedInLogin,
  useLinkedInLogout,
  useLinkedInPost,
  useLinkedInSchedule,
  useLinkedInQueue,
  useLinkedInHistory,
  useLinkedInCancelPost,
  isLinkedInConfigured,
  type LinkedInPost,
} from '@/hooks/useLinkedInAgent';

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
}

// Login Dialog
function LoginDialog({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [open, setOpen] = useState(false);
  const login = useLinkedInLogin();

  const handleLogin = async () => {
    const result = await login.mutateAsync({ email, password });
    if (result.success) {
      setOpen(false);
      setEmail('');
      setPassword('');
      onSuccess();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-[#0A66C2] hover:bg-[#004182]">
          <Link className="h-4 w-4 mr-2" />
          Connect LinkedIn
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connect LinkedIn</DialogTitle>
          <DialogDescription>
            Enter your LinkedIn credentials. The server will log in via browser automation.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {login.error && (
            <p className="text-sm text-destructive">{login.error.message}</p>
          )}
          {login.data?.requiresVerification && (
            <p className="text-sm text-yellow-500">
              LinkedIn requires additional verification. Check your email/phone.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleLogin}
            disabled={login.isPending || !email || !password}
          >
            {login.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : null}
            Connect
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Connection status component
function ConnectionStatus({ isConnected, onConnect }: { isConnected: boolean; onConnect: () => void }) {
  const logout = useLinkedInLogout();
  const { data: status } = useLinkedInStatus();

  if (isConnected) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
        <Check className="h-4 w-4 text-green-500" />
        <div className="flex-1">
          <p className="text-sm font-medium text-green-400">Connected</p>
          <p className="text-xs text-muted-foreground">
            {status?.totalPublished || 0} posts published
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
          className="text-muted-foreground hover:text-destructive"
        >
          <Unlink className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-6 text-center">
      <Linkedin className="h-12 w-12 text-[#0A66C2] mb-4" />
      <h3 className="text-lg font-medium mb-2">Connect LinkedIn</h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-sm">
        Connect your LinkedIn account to enable automated posting via browser automation.
      </p>
      <LoginDialog onSuccess={onConnect} />
    </div>
  );
}

// Create/Post Tab
function CreateTab({ isConnected }: { isConnected: boolean }) {
  const [content, setContent] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('09:00');
  const postNow = useLinkedInPost();
  const schedule = useLinkedInSchedule();

  const handlePostNow = async () => {
    if (!content.trim()) return;
    await postNow.mutateAsync(content);
    setContent('');
  };

  const handleSchedule = async () => {
    if (!content.trim() || !scheduleDate) return;
    const scheduledFor = new Date(`${scheduleDate}T${scheduleTime}`).toISOString();
    await schedule.mutateAsync({ content, scheduledFor });
    setContent('');
    setScheduleDate('');
  };

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <Link className="h-8 w-8 mb-2" />
        <p className="text-sm">Connect LinkedIn to create posts</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Write your LinkedIn post..."
        className="min-h-[150px] resize-none"
      />

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{content.length} characters</span>
        <span>{(content.match(/#\w+/g) || []).length} hashtags</span>
      </div>

      <div className="flex gap-2">
        <Button
          onClick={handlePostNow}
          disabled={postNow.isPending || !content.trim()}
          className="flex-1"
        >
          {postNow.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Send className="h-4 w-4 mr-2" />
          )}
          Post Now
        </Button>
      </div>

      <div className="border-t pt-4 space-y-3">
        <p className="text-sm text-muted-foreground">Or schedule for later:</p>
        <div className="flex gap-2">
          <Input
            type="date"
            value={scheduleDate}
            onChange={(e) => setScheduleDate(e.target.value)}
            className="flex-1"
          />
          <Input
            type="time"
            value={scheduleTime}
            onChange={(e) => setScheduleTime(e.target.value)}
            className="w-28"
          />
        </div>
        <Button
          variant="outline"
          onClick={handleSchedule}
          disabled={schedule.isPending || !content.trim() || !scheduleDate}
          className="w-full"
        >
          {schedule.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Calendar className="h-4 w-4 mr-2" />
          )}
          Schedule Post
        </Button>
      </div>
    </div>
  );
}

// Queue Tab
function QueueTab() {
  const { data: queue, isLoading } = useLinkedInQueue();
  const cancelPost = useLinkedInCancelPost();

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (!queue || queue.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <Calendar className="h-8 w-8 mb-2" />
        <p className="text-sm">No scheduled posts</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[300px]">
      <div className="space-y-3 pr-4">
        {queue.map((item) => (
          <div
            key={item.id}
            className="p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-secondary" />
                <span className="text-sm">
                  {new Date(item.scheduledFor).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{item.status}</Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                  onClick={() => cancelPost.mutate(item.id)}
                  disabled={cancelPost.isPending}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <p className="text-sm line-clamp-2 text-muted-foreground">{item.content}</p>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

// History Tab
function HistoryTab() {
  const { data: posts, isLoading } = useLinkedInHistory();

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-muted/50 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (!posts || posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <History className="h-8 w-8 mb-2" />
        <p className="text-sm">No posts yet</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[300px]">
      <div className="space-y-3 pr-4">
        {posts.map((post) => (
          <div
            key={post.id}
            className="p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <Badge
                variant="outline"
                className={
                  post.status === 'published'
                    ? 'text-green-500 border-green-500/40'
                    : post.status === 'failed'
                    ? 'text-destructive border-destructive/40'
                    : ''
                }
              >
                {post.status}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {post.publishedAt ? formatTimeAgo(post.publishedAt) : formatTimeAgo(post.scheduledFor)}
              </span>
            </div>
            <p className="text-sm line-clamp-3">{post.content}</p>
            {post.error && (
              <p className="text-xs text-destructive mt-2">{post.error}</p>
            )}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

// Not Configured State
function NotConfigured() {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <Server className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-medium mb-2">Server Not Connected</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-4">
        LinkedIn automation requires the server agent. Configure your server URL first.
      </p>
      <code className="text-xs bg-muted px-3 py-2 rounded-lg">
        VITE_SERVER_AGENT_URL=https://agents.noahiberman.com
      </code>
    </div>
  );
}

// Main Component
export function LinkedInAgentCard() {
  const { data: status, isLoading, error, refetch } = useLinkedInStatus();
  const isConfigured = isLinkedInConfigured();
  const isConnected = status?.loggedIn ?? false;

  return (
    <Card className="hover:shadow-elegant transition-shadow duration-300">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Linkedin className="h-5 w-5 text-[#0A66C2]" />
            <CardTitle>LinkedIn Agent</CardTitle>
          </div>
          {isConfigured && status && (
            <Badge
              variant="outline"
              className={
                isConnected
                  ? 'text-green-500 border-green-500/40'
                  : 'text-muted-foreground'
              }
            >
              {isConnected ? (
                <>
                  <Zap className="h-3 w-3 mr-1" />
                  Connected
                </>
              ) : (
                'Disconnected'
              )}
            </Badge>
          )}
        </div>
        <CardDescription>
          {isConnected
            ? `${status?.queueLength || 0} scheduled • ${status?.totalPublished || 0} published`
            : 'Browser-based LinkedIn automation'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!isConfigured ? (
          <NotConfigured />
        ) : isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertTriangle className="h-8 w-8 text-destructive mb-2" />
            <p className="text-sm text-muted-foreground mb-2">Failed to connect to server</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" /> Retry
            </Button>
          </div>
        ) : !isConnected ? (
          <ConnectionStatus isConnected={false} onConnect={() => refetch()} />
        ) : (
          <Tabs defaultValue="create" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="create" className="text-xs">
                <Send className="h-3 w-3 mr-1" />
                Create
              </TabsTrigger>
              <TabsTrigger value="queue" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                Queue ({status?.queueLength || 0})
              </TabsTrigger>
              <TabsTrigger value="history" className="text-xs">
                <History className="h-3 w-3 mr-1" />
                History
              </TabsTrigger>
            </TabsList>
            <TabsContent value="create">
              <CreateTab isConnected={isConnected} />
            </TabsContent>
            <TabsContent value="queue">
              <QueueTab />
            </TabsContent>
            <TabsContent value="history">
              <HistoryTab />
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}

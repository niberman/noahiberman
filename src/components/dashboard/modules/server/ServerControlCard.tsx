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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Server,
  Cpu,
  HardDrive,
  MemoryStick,
  Container,
  Play,
  Square,
  RotateCcw,
  FileText,
  Terminal,
  Wifi,
  WifiOff,
  AlertTriangle,
  RefreshCw,
  Send,
} from 'lucide-react';
import {
  useServerHealth,
  useServerSystem,
  useDockerContainers,
  useDockerAction,
  useServices,
  useServiceAction,
  useLogFiles,
  useLogFile,
  useShellExec,
  useCommandHistory,
  isServerConfigured,
} from '@/hooks/useServerControl';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

// System Overview Tab
function SystemTab() {
  const { data: system, isLoading, error, refetch } = useServerSystem();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (error || !system) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <AlertTriangle className="h-8 w-8 mb-2" />
        <p>Unable to load system info</p>
        <Button variant="ghost" size="sm" onClick={() => refetch()} className="mt-2">
          <RefreshCw className="h-4 w-4 mr-2" /> Retry
        </Button>
      </div>
    );
  }

  const stats = [
    {
      icon: Cpu,
      label: 'CPU',
      value: `${system.cpu.usage.toFixed(1)}%`,
      detail: `${system.cpu.cores} cores`,
      color: system.cpu.usage > 80 ? 'text-destructive' : system.cpu.usage > 60 ? 'text-yellow-500' : 'text-green-500',
    },
    {
      icon: MemoryStick,
      label: 'Memory',
      value: `${system.memory.usagePercent.toFixed(1)}%`,
      detail: `${formatBytes(system.memory.used)} / ${formatBytes(system.memory.total)}`,
      color: system.memory.usagePercent > 80 ? 'text-destructive' : system.memory.usagePercent > 60 ? 'text-yellow-500' : 'text-green-500',
    },
    {
      icon: HardDrive,
      label: 'Disk',
      value: `${system.disk.usagePercent.toFixed(1)}%`,
      detail: `${formatBytes(system.disk.used)} / ${formatBytes(system.disk.total)}`,
      color: system.disk.usagePercent > 90 ? 'text-destructive' : system.disk.usagePercent > 75 ? 'text-yellow-500' : 'text-green-500',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{system.hostname}</span>
        <span>Uptime: {formatUptime(system.uptime)}</span>
      </div>

      <div className="grid gap-3">
        {stats.map((stat) => (
          <div key={stat.label} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <stat.icon className={`h-5 w-5 ${stat.color}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{stat.label}</span>
                <span className={`text-sm font-mono ${stat.color}`}>{stat.value}</span>
              </div>
              <p className="text-xs text-muted-foreground truncate">{stat.detail}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">{system.platform}</p>
    </div>
  );
}

// Docker Tab
function DockerTab() {
  const { data: containers, isLoading, error } = useDockerContainers();
  const dockerAction = useDockerAction();

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 bg-muted/50 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <Container className="h-8 w-8 mb-2" />
        <p className="text-sm">Docker not available</p>
      </div>
    );
  }

  if (!containers || containers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <Container className="h-8 w-8 mb-2" />
        <p className="text-sm">No containers found</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[300px]">
      <div className="space-y-2 pr-4">
        {containers.map((container) => (
          <div
            key={container.id}
            className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
          >
            <div className={`w-2 h-2 rounded-full ${container.state === 'running' ? 'bg-green-500' : 'bg-muted-foreground'}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{container.name}</p>
              <p className="text-xs text-muted-foreground truncate">{container.image}</p>
            </div>
            <Badge variant="outline" className="text-xs">
              {container.state}
            </Badge>
            <div className="flex gap-1">
              {container.state !== 'running' ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => dockerAction.mutate({ containerId: container.id, action: 'start' })}
                  disabled={dockerAction.isPending}
                >
                  <Play className="h-3 w-3" />
                </Button>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => dockerAction.mutate({ containerId: container.id, action: 'stop' })}
                    disabled={dockerAction.isPending}
                  >
                    <Square className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => dockerAction.mutate({ containerId: container.id, action: 'restart' })}
                    disabled={dockerAction.isPending}
                  >
                    <RotateCcw className="h-3 w-3" />
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

// Services Tab
function ServicesTab() {
  const { data: services, isLoading, error } = useServices();
  const serviceAction = useServiceAction();

  // Filter to show only important/running services
  const filteredServices = services?.filter(
    (s) => s.status === 'running' || ['nginx', 'docker', 'ssh', 'cloudflared'].some((n) => s.name.includes(n))
  ).slice(0, 20);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 bg-muted/50 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <Server className="h-8 w-8 mb-2" />
        <p className="text-sm">Services not available</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[300px]">
      <div className="space-y-2 pr-4">
        {filteredServices?.map((service) => (
          <div
            key={service.name}
            className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
          >
            <div className={`w-2 h-2 rounded-full ${
              service.status === 'running' ? 'bg-green-500' : 
              service.status === 'failed' ? 'bg-destructive' : 'bg-muted-foreground'
            }`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{service.name}</p>
            </div>
            <Badge variant="outline" className="text-xs">
              {service.status}
            </Badge>
            <div className="flex gap-1">
              {service.status !== 'running' ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => serviceAction.mutate({ serviceName: service.name, action: 'start' })}
                  disabled={serviceAction.isPending}
                >
                  <Play className="h-3 w-3" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => serviceAction.mutate({ serviceName: service.name, action: 'restart' })}
                  disabled={serviceAction.isPending}
                >
                  <RotateCcw className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

// Logs Tab
function LogsTab() {
  const [selectedLog, setSelectedLog] = useState<string>('');
  const { data: logFiles } = useLogFiles();
  const { data: logContent, isLoading } = useLogFile(selectedLog, 50);

  return (
    <div className="space-y-3">
      <select
        value={selectedLog}
        onChange={(e) => setSelectedLog(e.target.value)}
        className="w-full p-2 rounded-lg bg-muted/50 border-0 text-sm focus:ring-2 focus:ring-secondary"
      >
        <option value="">Select a log file...</option>
        {logFiles?.map((log) => (
          <option key={log.path} value={log.path}>
            {log.path.split('/').pop()} ({formatBytes(log.size)})
          </option>
        ))}
      </select>

      {selectedLog && (
        <ScrollArea className="h-[250px] rounded-lg bg-black/50 p-3">
          {isLoading ? (
            <div className="text-muted-foreground text-xs">Loading...</div>
          ) : (
            <pre className="text-xs font-mono text-green-400 whitespace-pre-wrap">
              {logContent?.lines.join('\n') || 'No log content'}
            </pre>
          )}
        </ScrollArea>
      )}
    </div>
  );
}

// Terminal Tab
function TerminalTab() {
  const [command, setCommand] = useState('');
  const shellExec = useShellExec();
  const { data: history } = useCommandHistory();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (command.trim()) {
      shellExec.mutate({ command: command.trim() });
      setCommand('');
    }
  };

  const lastResult = shellExec.data;

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          placeholder="Enter command..."
          className="font-mono text-sm bg-muted/50"
          disabled={shellExec.isPending}
        />
        <Button type="submit" size="icon" disabled={shellExec.isPending || !command.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>

      <ScrollArea className="h-[250px] rounded-lg bg-black/50 p-3">
        {shellExec.isPending && (
          <div className="text-muted-foreground text-xs mb-2">Running...</div>
        )}
        {lastResult && (
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">
              $ {lastResult.command}
              {lastResult.exitCode !== 0 && (
                <span className="text-destructive ml-2">(exit: {lastResult.exitCode})</span>
              )}
            </div>
            <pre className="text-xs font-mono text-green-400 whitespace-pre-wrap">
              {lastResult.stdout}
            </pre>
            {lastResult.stderr && (
              <pre className="text-xs font-mono text-destructive whitespace-pre-wrap">
                {lastResult.stderr}
              </pre>
            )}
          </div>
        )}
        {!lastResult && !shellExec.isPending && (
          <div className="text-muted-foreground text-xs">
            Enter a command above to execute on the server.
          </div>
        )}
      </ScrollArea>

      {history && history.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">Recent:</span>
          {history.slice(0, 5).map((cmd, i) => (
            <button
              key={i}
              onClick={() => setCommand(cmd.command)}
              className="text-xs px-2 py-1 rounded bg-muted/50 hover:bg-muted transition-colors truncate max-w-[100px]"
            >
              {cmd.command}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Not Configured State
function NotConfigured() {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <Server className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-medium mb-2">Server Not Connected</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-4">
        Add your server agent URL to connect to your remote server.
      </p>
      <code className="text-xs bg-muted px-3 py-2 rounded-lg">
        VITE_SERVER_AGENT_URL=https://agents.noahiberman.com
      </code>
    </div>
  );
}

// Main Component
export function ServerControlCard() {
  const { data: health, isLoading: healthLoading, error: healthError } = useServerHealth();
  const isConfigured = isServerConfigured();
  const isConnected = !!health && !healthError;

  return (
    <Card className="hover:shadow-elegant transition-shadow duration-300">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="h-5 w-5 text-secondary" />
            <CardTitle>Server Control</CardTitle>
          </div>
          {isConfigured && (
            <Badge
              variant="outline"
              className={isConnected ? 'text-green-500 border-green-500/40' : 'text-destructive border-destructive/40'}
            >
              {healthLoading ? (
                <RefreshCw className="h-3 w-3 animate-spin mr-1" />
              ) : isConnected ? (
                <Wifi className="h-3 w-3 mr-1" />
              ) : (
                <WifiOff className="h-3 w-3 mr-1" />
              )}
              {isConnected ? 'Connected' : 'Offline'}
            </Badge>
          )}
        </div>
        <CardDescription>
          {isConfigured ? 'Manage your remote server via Cloudflare tunnel' : 'Connect to your server'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!isConfigured ? (
          <NotConfigured />
        ) : !isConnected && !healthLoading ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <WifiOff className="h-12 w-12 text-destructive mb-4" />
            <h3 className="text-lg font-medium mb-2">Connection Failed</h3>
            <p className="text-sm text-muted-foreground">
              Unable to reach your server agent. Make sure it's running.
            </p>
          </div>
        ) : (
          <Tabs defaultValue="system" className="w-full">
            <TabsList className="grid w-full grid-cols-5 mb-4">
              <TabsTrigger value="system" className="text-xs">
                <Cpu className="h-3 w-3 mr-1" />
                System
              </TabsTrigger>
              <TabsTrigger value="docker" className="text-xs">
                <Container className="h-3 w-3 mr-1" />
                Docker
              </TabsTrigger>
              <TabsTrigger value="services" className="text-xs">
                <Server className="h-3 w-3 mr-1" />
                Services
              </TabsTrigger>
              <TabsTrigger value="logs" className="text-xs">
                <FileText className="h-3 w-3 mr-1" />
                Logs
              </TabsTrigger>
              <TabsTrigger value="terminal" className="text-xs">
                <Terminal className="h-3 w-3 mr-1" />
                Shell
              </TabsTrigger>
            </TabsList>
            <TabsContent value="system">
              <SystemTab />
            </TabsContent>
            <TabsContent value="docker">
              <DockerTab />
            </TabsContent>
            <TabsContent value="services">
              <ServicesTab />
            </TabsContent>
            <TabsContent value="logs">
              <LogsTab />
            </TabsContent>
            <TabsContent value="terminal">
              <TerminalTab />
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}


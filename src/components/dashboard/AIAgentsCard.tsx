import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Calendar, Activity, AlertTriangle } from "lucide-react";
import { useAgents } from "@/hooks/useDashboardData";
import type { Agent } from "@/types/dashboard";

const getStatusColor = (status: Agent["status"]) => {
  switch (status) {
    case "active":
      return "bg-accent text-accent-foreground";
    case "idle":
      return "bg-muted text-muted-foreground";
    case "processing":
      return "bg-secondary text-secondary-foreground";
    case "error":
      return "bg-destructive text-destructive-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
};

export const AIAgentsCard = () => {
  const { data: agents, isLoading, isError, error } = useAgents();
  const agentList = agents ?? [];
  const activeCount = agentList.filter((a) => a.status === "active").length;

  return (
    <Card className="hover:shadow-elegant transition-shadow duration-300">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" />
            <CardTitle>AI Agents</CardTitle>
          </div>
          <Badge variant="outline" className="text-xs">
            {activeCount} Active
          </Badge>
        </div>
        <CardDescription>Manage your autonomous AI assistants</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && (
          <div className="space-y-2">
            <div className="h-12 bg-muted/50 rounded animate-pulse" />
            <div className="h-12 bg-muted/40 rounded animate-pulse" />
            <div className="h-12 bg-muted/30 rounded animate-pulse" />
          </div>
        )}

        {isError && (
          <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4" />
            <span>{error?.message || "Unable to load agents right now."}</span>
          </div>
        )}

        {!isLoading && !isError && agentList.length === 0 && (
          <div className="rounded-md border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
            No agents yet. Use the Upload Agent tools to create your first automations.
          </div>
        )}

        {/* Agent Summary */}
        <div className="space-y-2">
          {agentList.map((agent) => (
            <div
              key={agent.id}
              className="flex items-center justify-between p-3 rounded-md bg-muted/50 hover:bg-muted transition-colors"
            >
              <div>
                <p className="font-medium text-sm">{agent.name}</p>
                <p className="text-xs text-muted-foreground">{agent.type}</p>
              </div>
              <Badge className={getStatusColor(agent.status)} variant="secondary">
                {agent.status}
              </Badge>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-2">
          <Button variant="outline" size="sm" className="w-full">
            <Sparkles className="mr-2 h-4 w-4" />
            Generate Post
          </Button>
          <Button variant="outline" size="sm" className="w-full">
            <Calendar className="mr-2 h-4 w-4" />
            Scheduler
          </Button>
        </div>
        <Button variant="ghost" size="sm" className="w-full">
          <Activity className="mr-2 h-4 w-4" />
          Activity Log
        </Button>
      </CardContent>
    </Card>
  );
};


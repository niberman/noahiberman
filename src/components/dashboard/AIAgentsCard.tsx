import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Calendar, Activity } from "lucide-react";

interface Agent {
  id: string;
  name: string;
  type: string;
  status: "active" | "idle" | "processing";
}

export const AIAgentsCard = () => {
  const [agents] = useState<Agent[]>([
    { id: "1", name: "LinkedIn Post Generator", type: "Content", status: "active" },
    { id: "2", name: "Auto-Commenter", type: "Engagement", status: "idle" },
    { id: "3", name: "Scheduler", type: "Automation", status: "processing" },
  ]);

  const getStatusColor = (status: Agent["status"]) => {
    switch (status) {
      case "active":
        return "bg-accent text-accent-foreground";
      case "idle":
        return "bg-muted text-muted-foreground";
      case "processing":
        return "bg-secondary text-secondary-foreground";
    }
  };

  return (
    <Card className="hover:shadow-elegant transition-shadow duration-300">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" />
            <CardTitle>AI Agents</CardTitle>
          </div>
          <Badge variant="outline" className="text-xs">
            {agents.filter((a) => a.status === "active").length} Active
          </Badge>
        </div>
        <CardDescription>Manage your autonomous AI assistants</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Agent Summary */}
        <div className="space-y-2">
          {agents.map((agent) => (
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


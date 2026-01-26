import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ChatShellProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function ChatShell({ title, description, children, footer }: ChatShellProps) {
  return (
    <Card className="border-border/60 bg-card/90 backdrop-blur">
      <CardHeader className="space-y-2">
        <CardTitle className="text-2xl sm:text-3xl">{title}</CardTitle>
        {description ? (
          <CardDescription className="text-base text-muted-foreground">
            {description}
          </CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-6">
        {children}
        {footer}
      </CardContent>
    </Card>
  );
}

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Users, Plus, Calendar, Mail } from "lucide-react";

interface Contact {
  id: string;
  name: string;
  email: string;
  lastContacted: string;
  followUpDate?: string;
}

export const CRMCard = () => {
  const [contacts] = useState<Contact[]>([
    {
      id: "1",
      name: "Sarah Johnson",
      email: "sarah@example.com",
      lastContacted: "2 days ago",
      followUpDate: "Nov 25",
    },
    {
      id: "2",
      name: "Michael Chen",
      email: "mchen@example.com",
      lastContacted: "1 week ago",
    },
    {
      id: "3",
      name: "Emma Davis",
      email: "emma.d@example.com",
      lastContacted: "3 days ago",
      followUpDate: "Nov 28",
    },
  ]);

  const upcomingFollowUps = contacts.filter((c) => c.followUpDate);

  return (
    <Card className="hover:shadow-elegant transition-shadow duration-300">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-accent" />
            <CardTitle>Personal CRM</CardTitle>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add New Contact</DialogTitle>
                <DialogDescription>
                  Add a new contact to your personal CRM
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" placeholder="John Doe" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="john@example.com" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">Phone (optional)</Label>
                  <Input id="phone" type="tel" placeholder="+1 (555) 000-0000" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Add notes about this contact..."
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Add Contact</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <CardDescription>Manage your network and relationships</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Recent Contacts */}
        <div>
          <h4 className="text-sm font-medium mb-2 text-muted-foreground">
            Recent Contacts
          </h4>
          <div className="space-y-2">
            {contacts.slice(0, 3).map((contact) => (
              <div
                key={contact.id}
                className="flex items-start justify-between p-3 rounded-md bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{contact.name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <Mail className="h-3 w-3" />
                    {contact.email}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                  {contact.lastContacted}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Follow-ups */}
        {upcomingFollowUps.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2 text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Upcoming Follow-ups
            </h4>
            <div className="space-y-2">
              {upcomingFollowUps.map((contact) => (
                <div
                  key={contact.id}
                  className="flex items-center justify-between p-2 rounded-md bg-accent/10 border border-accent/20"
                >
                  <span className="text-sm font-medium">{contact.name}</span>
                  <span className="text-xs text-accent">{contact.followUpDate}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};


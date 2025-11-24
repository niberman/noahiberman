import { useEffect, useMemo, useState } from "react";
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
import { Users, Plus, Calendar, Mail, AlertTriangle } from "lucide-react";
import { useCRMContacts, useCreateCRMContact } from "@/hooks/useDashboardData";
import { useToast } from "@/hooks/use-toast";

const emptyContact = {
  name: "",
  email: "",
  phone: "",
  notes: "",
};

export const CRMCard = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [contactForm, setContactForm] = useState(emptyContact);
  const { toast } = useToast();

  const { data: contacts, isLoading, isError, error } = useCRMContacts();
  const createContact = useCreateCRMContact();

  useEffect(() => {
    if (createContact.isSuccess) {
      setIsDialogOpen(false);
      setContactForm(emptyContact);
    }
  }, [createContact.isSuccess]);

  const upcomingFollowUps = useMemo(
    () => (contacts ?? []).filter((c) => c.follow_up_date),
    [contacts]
  );

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "Never";
    try {
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
      }).format(new Date(dateString));
    } catch {
      return dateString;
    }
  };

  const formatRelativeTime = (dateString?: string | null) => {
    if (!dateString) return "New";
    const now = Date.now();
    const timestamp = new Date(dateString).getTime();
    const diffInDays = Math.floor((now - timestamp) / (1000 * 60 * 60 * 24));
    if (Number.isNaN(diffInDays)) return "Recently";
    if (diffInDays === 0) return "Today";
    if (diffInDays === 1) return "1 day ago";
    if (diffInDays < 7) return `${diffInDays} days ago`;
    const diffInWeeks = Math.floor(diffInDays / 7);
    return diffInWeeks === 1 ? "1 week ago" : `${diffInWeeks} weeks ago`;
  };

  const handleCreateContact = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!contactForm.name.trim()) {
      toast({
        variant: "destructive",
        title: "Name is required",
        description: "Please add at least a name for this contact.",
      });
      return;
    }

    try {
      await createContact.mutateAsync(contactForm);
      toast({
        title: "Contact saved",
        description: `${contactForm.name} has been added to your CRM.`,
      });
    } catch (mutationError: unknown) {
      const message =
        mutationError instanceof Error
          ? mutationError.message
          : "Please try again shortly.";
      toast({
        variant: "destructive",
        title: "Unable to save contact",
        description: message,
      });
    }
  };

  return (
    <Card className="hover:shadow-elegant transition-shadow duration-300">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-accent" />
            <CardTitle>Personal CRM</CardTitle>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <form onSubmit={handleCreateContact}>
                <DialogHeader>
                  <DialogTitle>Add New Contact</DialogTitle>
                  <DialogDescription>
                    Add a new relationship touchpoint to your personal CRM.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      placeholder="John Doe"
                      value={contactForm.name}
                      onChange={(e) =>
                        setContactForm((prev) => ({ ...prev, name: e.target.value }))
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="john@example.com"
                      value={contactForm.email}
                      onChange={(e) =>
                        setContactForm((prev) => ({ ...prev, email: e.target.value }))
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="phone">Phone (optional)</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+1 (555) 000-0000"
                      value={contactForm.phone}
                      onChange={(e) =>
                        setContactForm((prev) => ({ ...prev, phone: e.target.value }))
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      placeholder="Add notes about this contact..."
                      rows={3}
                      value={contactForm.notes}
                      onChange={(e) =>
                        setContactForm((prev) => ({ ...prev, notes: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={createContact.isPending}>
                    {createContact.isPending ? "Saving..." : "Add Contact"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        <CardDescription>Manage your network and relationships</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && (
          <div className="space-y-2">
            <div className="h-14 rounded bg-muted/50 animate-pulse" />
            <div className="h-14 rounded bg-muted/30 animate-pulse" />
            <div className="h-14 rounded bg-muted/20 animate-pulse" />
          </div>
        )}

        {isError && (
          <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4" />
            <span>{error?.message || "Unable to load your CRM contacts."}</span>
          </div>
        )}

        {!isLoading && !isError && (contacts?.length ?? 0) === 0 && (
          <div className="rounded-md border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
            No contacts yet. Start building your CRM by adding your first relationship.
          </div>
        )}

        {/* Recent Contacts */}
        {!!(contacts?.length ?? 0) && (
          <div>
            <h4 className="text-sm font-medium mb-2 text-muted-foreground">
              Recent Contacts
            </h4>
            <div className="space-y-2">
              {contacts!.slice(0, 3).map((contact) => (
                <div
                  key={contact.id}
                  className="flex items-start justify-between p-3 rounded-md bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{contact.name}</p>
                    {contact.email && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <Mail className="h-3 w-3" />
                        {contact.email}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                    {formatRelativeTime(contact.last_contacted_at)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

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
                  <span className="text-xs text-accent">
                    {formatDate(contact.follow_up_date)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};


import { useState } from "react";
import { Ban, Brain, Globe, Loader2, Lock, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  useDeleteKnowledgeEntry,
  useKnowledgeEntries,
  useSaveKnowledgeEntry,
  useSetVisibility,
  type KnowledgeEntry,
} from "@/hooks/use-inoah-knowledge";

type TierFilter = "private" | "review" | "public" | "never" | "all";

const TIER_FILTERS: { key: TierFilter; label: string }[] = [
  { key: "private", label: "Private" },
  { key: "review", label: "Review queue" },
  { key: "public", label: "Public" },
  { key: "never", label: "Never" },
  { key: "all", label: "All" },
];

const DAY_MS = 24 * 60 * 60 * 1000;

function matchesFilter(entry: KnowledgeEntry, filter: TierFilter): boolean {
  if (filter === "all") return true;
  if (filter === "review") {
    return (
      entry.visibility === "private" &&
      !!entry.ingested_at &&
      Date.now() - new Date(entry.ingested_at).getTime() < DAY_MS
    );
  }
  return entry.visibility === filter;
}

/**
 * The corpus iNoah answers from: review, promote, demote, delete. The persona
 * and retrieval knobs are deliberately not editable here — `public-persona.md`
 * in Drive is the source of truth for the prompt, and a second edit surface
 * only competed with it.
 */
export default function InoahKnowledgeManager() {
  // isPending, not isLoading: between react-query's retries isLoading goes false
  // while data is still undefined, which rendered an empty card with no explanation.
  const { data: entries, isPending, error } = useKnowledgeEntries();
  const saveEntry = useSaveKnowledgeEntry();
  const deleteEntry = useDeleteKnowledgeEntry();
  const setVisibility = useSetVisibility();
  const { toast } = useToast();

  const [editing, setEditing] = useState<KnowledgeEntry | "new" | null>(null);
  const [content, setContent] = useState("");
  const [collection, setCollection] = useState("knowledge");
  // Private is the landing view: everything new lands there awaiting review.
  const [filter, setFilter] = useState<TierFilter>("private");
  const [promoting, setPromoting] = useState<KnowledgeEntry | null>(null);
  const [confirmText, setConfirmText] = useState("");

  const visible = (entries ?? []).filter((e) => matchesFilter(e, filter));

  const handlePromote = async () => {
    if (!promoting) return;
    try {
      await setVisibility.mutateAsync({ id: promoting.id, visibility: "public" });
      toast({ title: "Published", description: "This entry is now in the public tier." });
      setPromoting(null);
      setConfirmText("");
    } catch (err) {
      toast({
        title: "Could not publish",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleDemote = async (entry: KnowledgeEntry) => {
    try {
      await setVisibility.mutateAsync({ id: entry.id, visibility: "private" });
      toast({ title: "Made private" });
    } catch (err) {
      toast({
        title: "Could not demote",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const openEditor = (entry: KnowledgeEntry | "new") => {
    setEditing(entry);
    setContent(entry === "new" ? "" : entry.content);
    setCollection(entry === "new" ? "knowledge" : entry.collection);
  };

  const handleSave = async () => {
    try {
      await saveEntry.mutateAsync({
        id: editing !== "new" && editing ? editing.id : undefined,
        content,
        collection,
      });
      toast({ title: "Saved", description: "iNoah can answer from this now." });
      setEditing(null);
    } catch (err) {
      toast({
        title: "Could not save",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (entry: KnowledgeEntry) => {
    try {
      await deleteEntry.mutateAsync(entry.id);
      toast({ title: "Deleted" });
      if (editing !== "new" && editing?.id === entry.id) setEditing(null);
    } catch (err) {
      toast({
        title: "Could not delete",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="bg-card/95 backdrop-blur">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-secondary flex-shrink-0" />
            <CardTitle className="text-lg sm:text-xl">iNoah Knowledge Base</CardTitle>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => openEditor("new")}
            disabled={editing === "new"}
            className="w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add entry
          </Button>
        </div>
        <CardDescription className="text-sm">
          What iNoah retrieves and answers from. Each entry is embedded on save; the
          closest few to a visitor's question get injected into its context.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {editing && (
          <div className="rounded-lg border border-secondary/40 bg-muted/30 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">
                {editing === "new" ? "New entry" : "Edit entry"}
              </h4>
              <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="entry-content">Content</Label>
              <Textarea
                id="entry-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="One self-contained fact or story. Write it the way you'd want it repeated back — retrieval pulls the whole entry, so keep each one to a single topic."
                className="min-h-[160px] text-sm"
              />
              <p className="text-xs text-muted-foreground">
                {content.trim().length} characters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="entry-collection">Collection</Label>
              <Input
                id="entry-collection"
                value={collection}
                onChange={(e) => setCollection(e.target.value)}
                placeholder="knowledge"
                className="max-w-xs"
              />
              <p className="text-xs text-muted-foreground">
                A label for grouping — e.g. aviation, ventures, personal.
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button
                variant="secondary"
                onClick={handleSave}
                disabled={!content.trim() || saveEntry.isPending}
              >
                {saveEntry.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                {saveEntry.isPending ? "Embedding…" : "Save"}
              </Button>
            </div>
          </div>
        )}

        {isPending && (
          <p className="text-sm text-muted-foreground py-4">Loading entries…</p>
        )}

        {error && (
          <p className="text-sm text-destructive py-4">
            {error instanceof Error ? error.message : "Could not load entries."}
          </p>
        )}

        <div className="flex flex-wrap gap-1.5">
          {TIER_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs transition-colors",
                filter === f.key
                  ? "border-secondary/60 bg-secondary/20 text-foreground"
                  : "border-border/60 text-muted-foreground hover:text-foreground"
              )}
            >
              {f.label}
              <span className="ml-1.5 text-[10px] opacity-70">
                {(entries ?? []).filter((e) => matchesFilter(e, f.key)).length}
              </span>
            </button>
          ))}
        </div>

        {!isPending && !error && visible.length === 0 && !editing && (
          <p className="text-sm text-muted-foreground py-4">
            Nothing in this view.
          </p>
        )}

        <ul className="space-y-2">
          {visible.map((entry) => (
            <li
              key={entry.id}
              className="rounded-lg border border-border/60 bg-background/40 p-3 sm:p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground/90 line-clamp-3 whitespace-pre-wrap">
                    {entry.content}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <TierBadge visibility={entry.visibility} />
                    <Badge variant="secondary" className="text-[11px]">
                      {entry.collection}
                    </Badge>
                    {entry.source_uri && (
                      <a
                        href={entry.source_uri}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-muted-foreground underline underline-offset-2 hover:text-foreground"
                      >
                        source
                      </a>
                    )}
                    <span className="text-[11px] text-muted-foreground">
                      {formatStamp(entry.updated_at ?? entry.created_at)}
                    </span>
                  </div>
                </div>
                <div className="flex flex-shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center">
                  {entry.visibility === "private" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => {
                        setPromoting(entry);
                        setConfirmText("");
                      }}
                    >
                      <Globe className="h-3.5 w-3.5 mr-1" />
                      Publish
                    </Button>
                  )}
                  {entry.visibility === "public" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => handleDemote(entry)}
                      disabled={setVisibility.isPending}
                    >
                      <Lock className="h-3.5 w-3.5 mr-1" />
                      Make private
                    </Button>
                  )}
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEditor(entry)}>
                      <Pencil className="h-4 w-4" />
                      <span className="sr-only">Edit</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(entry)}
                      disabled={deleteEntry.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>

      <Dialog
        open={!!promoting}
        onOpenChange={(open) => {
          if (!open) {
            setPromoting(null);
            setConfirmText("");
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Publish this entry</DialogTitle>
            <DialogDescription>
              This text becomes readable by anyone on the internet.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-64 overflow-y-auto rounded-md border border-border/60 bg-muted/30 p-3">
            <p className="text-sm whitespace-pre-wrap">{promoting?.content}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-publish">
              Type <span className="font-mono font-semibold">publish</span> to confirm
            </Label>
            <Input
              id="confirm-publish"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              autoComplete="off"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPromoting(null);
                setConfirmText("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="secondary"
              onClick={handlePromote}
              disabled={confirmText !== "publish" || setVisibility.isPending}
            >
              {setVisibility.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Publish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

/** The tier a row sits in. 'never' is terminal and gets no control anywhere. */
function TierBadge({ visibility }: { visibility: KnowledgeEntry["visibility"] }) {
  if (visibility === "public") {
    return (
      <Badge className="text-[11px] bg-green-500/15 text-green-500 border-green-500/30" variant="outline">
        <Globe className="h-3 w-3 mr-1" />
        public
      </Badge>
    );
  }
  if (visibility === "never") {
    return (
      <Badge variant="outline" className="text-[11px] opacity-60 cursor-not-allowed">
        <Ban className="h-3 w-3 mr-1" />
        never
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-[11px]">
      <Lock className="h-3 w-3 mr-1" />
      private
    </Badge>
  );
}

function formatStamp(value: string | null | undefined) {
  if (!value) return "";
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

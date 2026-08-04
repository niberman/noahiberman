import { useEffect, useState } from "react";
import { Brain, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  useDeleteKnowledgeEntry,
  useInoahSettings,
  useKnowledgeEntries,
  useSaveInoahSettings,
  useSaveKnowledgeEntry,
  type InoahSettings,
  type KnowledgeEntry,
} from "@/hooks/use-inoah-knowledge";

/**
 * Everything iNoah answers from: the retrieved knowledge entries and the
 * persona prompt they are injected into. Both were previously baked into the
 * edge function and needed a redeploy to change.
 */
export default function InoahKnowledgeManager() {
  return (
    <div className="space-y-8 sm:space-y-10">
      <KnowledgeEntries />
      <PersonaSettings />
    </div>
  );
}

function KnowledgeEntries() {
  // isPending, not isLoading: between react-query's retries isLoading goes false
  // while data is still undefined, which rendered an empty card with no explanation.
  const { data: entries, isPending, error } = useKnowledgeEntries();
  const saveEntry = useSaveKnowledgeEntry();
  const deleteEntry = useDeleteKnowledgeEntry();
  const { toast } = useToast();

  const [editing, setEditing] = useState<KnowledgeEntry | "new" | null>(null);
  const [content, setContent] = useState("");
  const [collection, setCollection] = useState("knowledge");

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

        {!isPending && !error && entries?.length === 0 && !editing && (
          <p className="text-sm text-muted-foreground py-4">
            No entries yet. iNoah is answering from its persona prompt alone.
          </p>
        )}

        <ul className="space-y-2">
          {entries?.map((entry) => (
            <li
              key={entry.id}
              className="rounded-lg border border-border/60 bg-background/40 p-3 sm:p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground/90 line-clamp-3 whitespace-pre-wrap">
                    {entry.content}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge variant="secondary" className="text-[11px]">
                      {entry.collection}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground">
                      {formatStamp(entry.updated_at ?? entry.created_at)}
                    </span>
                  </div>
                </div>
                <div className="flex flex-shrink-0 gap-1">
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
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function PersonaSettings() {
  const { data: settings, isPending } = useInoahSettings();
  const saveSettings = useSaveInoahSettings();
  const { toast } = useToast();
  const [draft, setDraft] = useState<InoahSettings | null>(null);

  useEffect(() => {
    if (settings) setDraft(settings);
  }, [settings]);

  const handleSave = async () => {
    if (!draft) return;
    try {
      await saveSettings.mutateAsync(draft);
      toast({ title: "Saved", description: "New answers use this immediately." });
    } catch (err) {
      toast({
        title: "Could not save",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="bg-card/95 backdrop-blur">
      <CardHeader>
        <CardTitle className="text-lg sm:text-xl">Persona &amp; retrieval</CardTitle>
        <CardDescription className="text-sm">
          The voice iNoah answers in, and how much of the knowledge base it pulls per
          question.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {isPending && <p className="text-sm text-muted-foreground">Loading…</p>}

        {!isPending && !draft && (
          <p className="text-sm text-muted-foreground">
            No settings row found — run the{" "}
            <code className="text-xs">inoah_knowledge_base</code> migration.
          </p>
        )}

        {draft && (
          <>
            <div className="space-y-2">
              <Label htmlFor="system-prompt">System prompt</Label>
              <Textarea
                id="system-prompt"
                value={draft.system_prompt}
                onChange={(e) => setDraft({ ...draft, system_prompt: e.target.value })}
                className="min-h-[280px] font-mono text-xs leading-relaxed"
              />
              <p className="text-xs text-muted-foreground">
                Who iNoah is and how it writes. Formatting rules that stop it leaking
                reasoning are appended automatically and are not editable here.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="match-count">Entries per answer</Label>
                <Input
                  id="match-count"
                  type="number"
                  min={1}
                  max={20}
                  value={draft.match_count}
                  onChange={(e) =>
                    setDraft({ ...draft, match_count: Number(e.target.value) })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  How many entries get injected. More context, slower answers.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="match-threshold">Similarity threshold</Label>
                <Input
                  id="match-threshold"
                  type="number"
                  min={0}
                  max={1}
                  step={0.05}
                  value={draft.match_threshold}
                  onChange={(e) =>
                    setDraft({ ...draft, match_threshold: Number(e.target.value) })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  0–1. Raise it to only use close matches, lower it if answers miss
                  entries you know are there.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t">
              <span className="text-xs text-muted-foreground">
                {settings?.updated_at && `Last updated ${formatStamp(settings.updated_at)}`}
              </span>
              <Button
                variant="secondary"
                onClick={handleSave}
                disabled={saveSettings.isPending || !draft.system_prompt.trim()}
                className="w-full sm:w-auto"
              >
                {saveSettings.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                Save
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function formatStamp(value: string | null | undefined) {
  if (!value) return "";
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

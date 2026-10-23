import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Hash, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useCreateNote, useDeleteNote, useUpdateNote } from "@/lib/queries";
import { ApiError, type Note } from "@/lib/api";
import { cn, firstLine } from "@/lib/utils";

interface NoteEditorProps {
  note: Note | null;
  /** true when the editor is showing a brand-new (unsaved) note */
  isNew: boolean;
  onClose: () => void;
  onSaved: (note: Note) => void;
}

export function NoteEditor({ note, isNew, onClose, onSaved }: NoteEditorProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [preview, setPreview] = useState(false);
  const [dirty, setDirty] = useState(false);

  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();

  // Load the selected note into local editing state.
  useEffect(() => {
    setTitle(note?.title ?? "");
    setContent(note?.content ?? "");
    setTags(note?.tags ?? []);
    setTagDraft("");
    setPreview(false);
    setDirty(isNew);
  }, [note?.id, isNew]);

  const saving = createNote.isPending || updateNote.isPending;
  const error =
    (createNote.error as ApiError | null) ??
    (updateNote.error as ApiError | null);

  const effectiveTitle = title.trim() || firstLine(content) || "Untitled note";

  const canSave = useMemo(
    () => (title.trim().length > 0 || content.trim().length > 0) && dirty && !saving,
    [title, content, dirty, saving],
  );

  function addTag(raw: string) {
    const t = raw.trim().toLowerCase().replace(/\s+/g, "-");
    if (!t || t.length > 64) return;
    setTags((prev) => (prev.includes(t) ? prev : [...prev, t]));
    setTagDraft("");
  }

  function onTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === "," || e.key === " ") {
      e.preventDefault();
      addTag(tagDraft);
    } else if (e.key === "Backspace" && tagDraft === "" && tags.length > 0) {
      setTags((prev) => prev.slice(0, -1));
    }
  }

  async function save() {
    if (!canSave) return;
    const input = { title: effectiveTitle, content, tags };
    const saved =
      isNew || !note
        ? await createNote.mutateAsync(input)
        : await updateNote.mutateAsync({ id: note.id, input });
    setDirty(false);
    onSaved(saved);
  }

  async function remove() {
    if (!note || isNew) return;
    if (!window.confirm(`Delete "${note.title}"? This cannot be undone.`)) return;
    await deleteNote.mutateAsync(note.id);
    onClose();
  }

  return (
    <div className="flex h-full flex-col">
      {/* Editor header */}
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <Input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setDirty(true);
          }}
          placeholder="Note title"
          className="h-8 border-transparent bg-transparent px-1 text-base font-semibold focus-visible:border-input"
        />
        <div className="ml-auto flex items-center gap-1.5">
          <Button
            variant={preview ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setPreview((p) => !p)}
          >
            {preview ? "Edit" : "Preview"}
          </Button>
          <Button
            size="sm"
            onClick={() => void save()}
            disabled={!canSave}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
          {!isNew && note && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={() => void remove()}
              aria-label="Delete note"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 lg:hidden"
            onClick={onClose}
            aria-label="Close editor"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {error && (
        <div className="border-b bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error.fieldError("title") ??
            error.fieldError("content") ??
            error.message}
        </div>
      )}

      {/* Body */}
      <div className="min-h-0 flex-1">
        {preview ? (
          <div className="h-full overflow-y-auto px-5 py-4">
            {content.trim() ? (
              <div className="prose-notes max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nothing to preview.</p>
            )}
          </div>
        ) : (
          <Textarea
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              setDirty(true);
            }}
            placeholder="Write in Markdown…  # Heading, **bold**, - list, `code`"
            className="h-full min-h-0 resize-none rounded-none border-0 px-5 py-4 font-mono text-[13px] leading-relaxed focus-visible:ring-0"
          />
        )}
      </div>

      {/* Tags footer */}
      <div className="flex flex-wrap items-center gap-2 border-t px-4 py-3">
        <Hash className="h-4 w-4 text-muted-foreground" />
        {tags.map((t) => (
          <span
            key={t}
            className="inline-flex items-center gap-1 rounded bg-muted py-0.5 pl-1.5 pr-1 text-xs text-muted-foreground"
          >
            #{t}
            <button
              className="rounded-sm p-0.5 hover:bg-muted-foreground/20"
              onClick={() => setTags((prev) => prev.filter((x) => x !== t))}
              aria-label={`Remove tag ${t}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <Input
          value={tagDraft}
          onChange={(e) => setTagDraft(e.target.value)}
          onKeyDown={onTagKeyDown}
          onBlur={() => tagDraft && addTag(tagDraft)}
          placeholder="Add tag…"
          className="h-7 w-28 border-transparent bg-transparent px-1 text-xs focus-visible:border-input"
        />
        <Separator orientation="vertical" className="mx-1 h-5" />
        <span className={cn("text-xs text-muted-foreground", dirty && "text-primary")}>
          {dirty ? "Unsaved changes" : note ? "Saved" : "New note"}
        </span>
      </div>
    </div>
  );
}

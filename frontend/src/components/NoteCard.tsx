import { Hash } from "lucide-react";
import { cn } from "@/lib/utils";
import { relativeTime } from "@/lib/utils";
import type { Note } from "@/lib/api";

interface NoteCardProps {
  note: Note;
  selected: boolean;
  onSelect: (id: number) => void;
}

export function NoteCard({ note, selected, onSelect }: NoteCardProps) {
  return (
    <button
      onClick={() => onSelect(note.id)}
      className={cn(
        "w-full border-b px-4 py-3.5 text-left transition-colors",
        selected
          ? "bg-accent"
          : "bg-transparent hover:bg-accent/40",
      )}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="truncate text-sm font-semibold leading-tight">
          {note.title}
        </h3>
        <span className="shrink-0 text-[11px] text-muted-foreground">
          {relativeTime(note.updatedAt)}
        </span>
      </div>

      <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-muted-foreground">
        {note.excerpt || "No content"}
      </p>

      {note.tags.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {note.tags.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-0.5 rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground"
            >
              <Hash className="h-3 w-3" />
              {t}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}

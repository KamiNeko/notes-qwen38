import {
  Hash,
  Layers,
  Plus,
  Search,
  Tag as TagIcon,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import type { TagCount } from "@/lib/api";

interface SidebarProps {
  tags: TagCount[];
  activeTag: string | null;
  onSelectTag: (tag: string | null) => void;
  onNewNote: () => void;
  search: string;
  onSearchChange: (value: string) => void;
  totalCount: number;
}

export function Sidebar({
  tags,
  activeTag,
  onSelectTag,
  onNewNote,
  search,
  onSearchChange,
  totalCount,
}: SidebarProps) {
  const { user } = useAuth();

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r bg-card">
      {/* Search */}
      <div className="px-3 pb-1 pt-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search notes…"
            className="h-8 border-input bg-[#1d1d1d] pl-8 text-xs"
          />
        </div>
      </div>

      {/* Primary nav */}
      <nav className="mt-2 space-y-0.5 px-2">
        <button
          className={cn(
            "flex w-full items-center justify-between rounded-md px-2.5 py-2 text-sm transition-colors",
            !activeTag
              ? "bg-accent font-medium text-foreground"
              : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
          )}
          onClick={() => onSelectTag(null)}
        >
          <span className="flex items-center gap-2.5">
            <Layers className="h-4 w-4" />
            All notes
          </span>
          <span className="text-xs text-muted-foreground">{totalCount}</span>
        </button>
        <button
          className={cn(
            "flex w-full items-center justify-between rounded-md px-2.5 py-2 text-sm transition-colors",
            activeTag
              ? "bg-accent font-medium text-foreground"
              : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
          )}
          onClick={() => onSelectTag(tags[0]?.name ?? null)}
        >
          <span className="flex items-center gap-2.5">
            <TagIcon className="h-4 w-4" />
            Tagged
          </span>
          <span className="text-xs text-muted-foreground">
            {tags.reduce((s, t) => s + t.count, 0)}
          </span>
        </button>
      </nav>

      {/* Tags */}
      <div className="mt-4 flex items-center gap-1.5 px-4">
        <Hash className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Tags
        </span>
      </div>

      <ScrollArea className="min-h-0 flex-1 px-2 py-2">
        <div className="space-y-0.5">
          {tags.length === 0 && (
            <p className="px-2 py-1 text-xs text-muted-foreground">
              No tags yet.
            </p>
          )}
          {tags.map((t) => (
            <button
              key={t.name}
              className={cn(
                "flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-sm transition-colors",
                activeTag === t.name
                  ? "bg-accent font-medium text-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
              )}
              onClick={() => onSelectTag(activeTag === t.name ? null : t.name)}
            >
              <span className="flex min-w-0 items-center gap-2">
                <Hash className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{t.name}</span>
              </span>
              <span className="ml-2 text-xs text-muted-foreground">
                {t.count}
              </span>
            </button>
          ))}
        </div>
      </ScrollArea>

      {/* Status bar */}
      <Separator />
      <div className="flex h-11 shrink-0 items-center gap-2 px-3">
        <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
        <span className="min-w-0 truncate text-xs text-muted-foreground">
          Signed in as{" "}
          <span className="text-foreground">{user?.displayName}</span>
        </span>
        <button
          className="ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          onClick={onNewNote}
          aria-label="New note"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
}

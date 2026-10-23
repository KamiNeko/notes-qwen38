import { useEffect, useRef } from "react";
import {
  ArrowDownUp,
  Check,
  LogOut,
  NotebookPen,
  Plus,
  RefreshCw,
  Search,
  User as UserIcon,
  X,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth";
import type { NoteQuery } from "@/lib/api";

type Sort = NonNullable<NoteQuery["sort"]>;

const SORT_LABELS: Record<Sort, string> = {
  recent: "Recently updated",
  oldest: "Oldest first",
  title: "Title A–Z",
};

interface TopBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  sort: Sort;
  onSortChange: (sort: Sort) => void;
  onNewNote: () => void;
  onRefresh: () => void;
  refreshing?: boolean;
}

export function TopBar({
  search,
  onSearchChange,
  sort,
  onSortChange,
  onNewNote,
  onRefresh,
  refreshing,
}: TopBarProps) {
  const { user, logout } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);

  // Ctrl/Cmd+K focuses search, like the screenshot hint.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const initials = (user?.displayName ?? "?")
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-card px-4">
      {/* Brand */}
      <div className="flex w-52 shrink-0 items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/40 bg-primary/10 text-primary">
          <NotebookPen className="h-4 w-4" />
        </div>
        <span className="text-lg font-semibold tracking-tight">Strata</span>
      </div>

      {/* Global search */}
      <div className="relative mx-auto w-full max-w-xl">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search notes…"
          className="h-9 border-input bg-[#1d1d1d] pl-8 pr-16"
        />
        {search ? (
          <button
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => onSearchChange("")}
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        ) : (
          <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            Ctrl K
          </kbd>
        )}
      </div>

      {/* Actions */}
      <div className="ml-auto flex shrink-0 items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground"
          onClick={onRefresh}
          aria-label="Refresh notes"
        >
          <RefreshCw
            className={refreshing ? "h-4 w-4 animate-spin" : "h-4 w-4"}
          />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground"
              aria-label="Sort notes"
            >
              <ArrowDownUp className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Sort by</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {(Object.keys(SORT_LABELS) as Sort[]).map((s) => (
              <DropdownMenuItem key={s} onSelect={() => onSortChange(s)}>
                <Check
                  className={s === sort ? "h-4 w-4" : "h-4 w-4 opacity-0"}
                />
                {SORT_LABELS[s]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="ghost"
          size="icon"
          className="text-foreground"
          onClick={onNewNote}
          aria-label="New note"
        >
          <Plus className="h-4 w-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="ml-1 h-9 w-9 rounded-full p-0">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/15 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span>{user?.displayName}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {user?.email}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 text-muted-foreground">
              <UserIcon className="h-4 w-4" />
              Signed in
            </DropdownMenuItem>
            <DropdownMenuItem
              className="gap-2"
              onSelect={() => void logout()}
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

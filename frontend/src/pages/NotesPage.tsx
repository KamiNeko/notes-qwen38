import { useMemo, useState } from "react";
import { ChevronDown, FileText, Hash, NotebookPen, Plus } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { NoteCard } from "@/components/NoteCard";
import { NoteEditor } from "@/components/NoteEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotes, useTags } from "@/lib/queries";
import type { Note, NoteQuery } from "@/lib/api";

type Sort = NonNullable<NoteQuery["sort"]>;

const SORT_LABELS: Record<Sort, string> = {
  recent: "Recently updated",
  oldest: "Oldest first",
  title: "Title A–Z",
};

export function NotesPage() {
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>("recent");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);

  const query = useMemo(
    () => ({
      q: search.trim() || undefined,
      tag: activeTag ?? undefined,
      sort,
    }),
    [search, activeTag, sort],
  );

  const notesQuery = useNotes(query);
  const tagsQuery = useTags();

  const notes = notesQuery.data?.items ?? [];
  const total = notesQuery.data?.total ?? notes.length;
  const selected: Note | null =
    notes.find((n) => n.id === selectedId) ?? null;

  function openNote(id: number) {
    setCreating(false);
    setSelectedId(id);
  }

  function newNote() {
    setSelectedId(null);
    setCreating(true);
  }

  function onSaved(note: Note) {
    setCreating(false);
    setSelectedId(note.id);
  }

  const showList = !creating || selectedId !== null || notes.length > 0;

  return (
    <div className="flex h-full overflow-hidden">
      <Sidebar
        tags={tagsQuery.data ?? []}
        activeTag={activeTag}
        onSelectTag={setActiveTag}
        onNewNote={newNote}
        search={search}
        onSearchChange={setSearch}
        totalCount={total}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          search={search}
          onSearchChange={setSearch}
          sort={sort}
          onSortChange={setSort}
          onNewNote={newNote}
          onRefresh={() => void notesQuery.refetch()}
          refreshing={notesQuery.isFetching}
        />

        <div className="flex min-h-0 flex-1">
          {/* Note list column */}
          {showList && (
            <div className="flex w-[340px] shrink-0 flex-col border-r xl:w-[380px]">
              {/* List header */}
              <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
                <div className="min-w-0">
                  <h1 className="truncate text-base font-semibold">
                    {activeTag ? `#${activeTag}` : "All notes"}
                  </h1>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {total} note{total === 1 ? "" : "s"}
                    {search && (
                      <>
                        {" matching "}
                        <span className="text-foreground">“{search}”</span>
                      </>
                    )}
                  </p>
                </div>
                <Button
                  size="sm"
                  className="shrink-0 gap-1.5"
                  onClick={newNote}
                >
                  <Plus className="h-3.5 w-3.5" />
                  New
                </Button>
              </div>

              {/* Tag filter */}
              <div className="border-b px-3 py-2.5">
                <div className="relative">
                  <Hash className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    list="strata-tags"
                    value={activeTag ?? ""}
                    onChange={(e) =>
                      setActiveTag(e.target.value.trim() || null)
                    }
                    placeholder="Filter by tag…"
                    className="h-8 border-input bg-[#1d1d1d] pl-8 text-xs"
                  />
                  <datalist id="strata-tags">
                    {(tagsQuery.data ?? []).map((t) => (
                      <option key={t.name} value={t.name} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Sort row */}
              <div className="flex items-center gap-1.5 border-b px-4 py-2 text-xs text-muted-foreground">
                <span>Sort:</span>
                <button
                  className="flex items-center gap-1 font-medium text-foreground hover:text-primary"
                  onClick={() =>
                    setSort(
                      sort === "recent"
                        ? "oldest"
                        : sort === "oldest"
                          ? "title"
                          : "recent",
                    )
                  }
                >
                  {SORT_LABELS[sort]}
                  <ChevronDown className="h-3 w-3" />
                </button>
              </div>

              <ScrollArea className="min-h-0 flex-1">
                {notesQuery.isLoading && (
                  <p className="px-4 py-3 text-sm text-muted-foreground">
                    Loading notes…
                  </p>
                )}

                {!notesQuery.isLoading && notes.length === 0 && (
                  <div className="px-4 py-10 text-center">
                    <FileText className="mx-auto h-6 w-6 text-muted-foreground" />
                    <p className="mt-2 text-sm font-medium">No notes found</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {search || activeTag
                        ? "Try a different search or clear the tag filter."
                        : "Create your first note to get started."}
                    </p>
                  </div>
                )}

                {notes.map((n) => (
                  <NoteCard
                    key={n.id}
                    note={n}
                    selected={n.id === selectedId && !creating}
                    onSelect={openNote}
                  />
                ))}
              </ScrollArea>
            </div>
          )}

          {/* Detail / editor column */}
          <div className="min-w-0 flex-1 bg-background">
            {creating || selected ? (
              <NoteEditor
                key={creating ? "new" : selected!.id}
                note={selected}
                isNew={creating}
                onClose={() => {
                  setCreating(false);
                  setSelectedId(null);
                }}
                onSaved={onSaved}
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border bg-card">
                  <NotebookPen className="h-8 w-8 text-muted-foreground" />
                </div>
                <h2 className="mt-4 text-lg font-semibold">
                  Select a note to start editing
                </h2>
                <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                  Pick a note from the list to read or edit it, or{" "}
                  <button
                    className="text-primary underline underline-offset-2 hover:text-primary/80"
                    onClick={newNote}
                  >
                    create a new one
                  </button>
                  .
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

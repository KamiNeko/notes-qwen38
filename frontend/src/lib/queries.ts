import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notesApi, tagsApi, type NoteInput, type NoteQuery } from "@/lib/api";

export function useNotes(query: NoteQuery) {
  return useQuery({
    queryKey: ["notes", query],
    queryFn: () => notesApi.list(query),
    staleTime: 15_000,
  });
}

export function useTags() {
  return useQuery({
    queryKey: ["tags"],
    queryFn: () => tagsApi.list(),
    staleTime: 30_000,
  });
}

function useInvalidateNotes() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["notes"] });
    qc.invalidateQueries({ queryKey: ["tags"] });
  };
}

export function useCreateNote() {
  const qc = useQueryClient();
  const invalidate = useInvalidateNotes();
  return useMutation({
    mutationFn: (input: NoteInput) => notesApi.create(input),
    onSuccess: (note) => {
      invalidate();
      qc.setQueryData(["note", note.id], note);
    },
  });
}

export function useUpdateNote() {
  const qc = useQueryClient();
  const invalidate = useInvalidateNotes();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: NoteInput }) =>
      notesApi.update(id, input),
    onSuccess: (note) => {
      invalidate();
      qc.setQueryData(["note", note.id], note);
    },
  });
}

export function useDeleteNote() {
  const invalidate = useInvalidateNotes();
  return useMutation({
    mutationFn: (id: number) => notesApi.remove(id),
    onSuccess: invalidate,
  });
}

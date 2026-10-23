// ---------------------------------------------------------------------------
// Types mirroring the .NET contracts (camelCase JSON)
// ---------------------------------------------------------------------------
export interface User {
  id: number;
  email: string;
  displayName: string;
  createdAt: string;
}

export interface Note {
  id: number;
  title: string;
  excerpt: string;
  content: string;
  contentFormat: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface NoteListResponse {
  items: Note[];
  total: number;
  page: number;
  pageSize: number;
}

export interface TagCount {
  name: string;
  count: number;
}

export interface NoteInput {
  title: string;
  content: string;
  tags: string[];
}

export class ApiError extends Error {
  status: number;
  /** field -> messages from ASP.NET validation problems */
  errors: Record<string, string[]>;

  constructor(status: number, message: string, errors: Record<string, string[]> = {}) {
    super(message);
    this.status = status;
    this.errors = errors;
  }

  /** First message for a field, if any. */
  fieldError(field: string): string | undefined {
    return this.errors[field]?.[0];
  }
}

const BASE = import.meta.env.VITE_API_BASE_URL ?? "/api";

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include", // send the httpOnly auth cookie
    ...init,
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const errors: Record<string, string[]> =
      data && typeof data === "object" && data.errors
        ? (data.errors as Record<string, string[]>)
        : {};
    const message =
      (data && typeof data === "object" && (data.title as string)) ||
      `Request failed (${res.status})`;
    throw new ApiError(res.status, message, errors);
  }
  return data as T;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
export const authApi = {
  register: (email: string, displayName: string, password: string) =>
    request<{ user: User }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, displayName, password }),
    }),
  login: (email: string, password: string) =>
    request<{ user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  logout: () => request<void>("/auth/logout", { method: "POST" }),
  me: () => request<User>("/auth/me"),
};

// ---------------------------------------------------------------------------
// Notes & tags
// ---------------------------------------------------------------------------
export interface NoteQuery {
  q?: string;
  tag?: string;
  sort?: "recent" | "oldest" | "title";
}

export const notesApi = {
  list: (query: NoteQuery) => {
    const params = new URLSearchParams();
    if (query.q) params.set("q", query.q);
    if (query.tag) params.set("tag", query.tag);
    if (query.sort) params.set("sort", query.sort);
    const qs = params.toString();
    return request<NoteListResponse>(`/notes${qs ? `?${qs}` : ""}`);
  },
  get: (id: number) => request<Note>(`/notes/${id}`),
  create: (input: NoteInput) =>
    request<Note>("/notes", { method: "POST", body: JSON.stringify(input) }),
  update: (id: number, input: NoteInput) =>
    request<Note>(`/notes/${id}`, { method: "PUT", body: JSON.stringify(input) }),
  remove: (id: number) => request<void>(`/notes/${id}`, { method: "DELETE" }),
};

export const tagsApi = {
  list: () => request<TagCount[]>("/tags"),
};

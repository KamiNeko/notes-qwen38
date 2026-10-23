using Microsoft.EntityFrameworkCore;
using Strata.Api.Contracts;
using Strata.Api.Data;

namespace Strata.Api.Endpoints;

public static class NotesEndpoints
{
    public static IEndpointRouteBuilder MapNotesEndpoints(this IEndpointRouteBuilder app)
    {
        var notes = app.MapGroup("/api/notes").RequireAuthorization().WithTags("Notes");

        notes.MapGet("/", ListNotes);
        notes.MapGet("/{id:int}", GetNote);
        notes.MapPost("/", CreateNote);
        notes.MapPut("/{id:int}", UpdateNote);
        notes.MapDelete("/{id:int}", DeleteNote);

        var tags = app.MapGroup("/api/tags").RequireAuthorization().WithTags("Tags");
        tags.MapGet("/", ListTags);

        return app;
    }

    // -----------------------------------------------------------------------
    // GET /api/notes?q=&tag=&sort=&page=&pageSize=
    // -----------------------------------------------------------------------
    private static async Task<IResult> ListNotes(
        HttpContext http, StrataDbContext db,
        string? q, string? tag, string? sort, int page = 1, int pageSize = 50)
    {
        var userId = AuthEndpoints.CurrentUserId(http);
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 200);

        var query = db.Notes
            .Where(n => n.UserId == userId && !n.DeletedAt.HasValue)
            .Include(n => n.NoteTags).ThenInclude(nt => nt.Tag)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(q))
        {
            var pattern = $"%{q.Trim()}%";
            query = query.Where(n =>
                EF.Functions.ILike(n.Title, pattern) || EF.Functions.ILike(n.Content, pattern));
        }

        if (!string.IsNullOrWhiteSpace(tag))
        {
            var tagName = tag.Trim().ToLower();
            query = query.Where(n => n.NoteTags.Any(nt => nt.Tag!.Name == tagName));
        }

        query = sort switch
        {
            "oldest" => query.OrderBy(n => n.CreatedAt),
            "title" => query.OrderBy(n => n.Title),
            _ => query.OrderByDescending(n => n.UpdatedAt),
        };

        var total = await query.CountAsync();
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(n => ToDto(n))
            .ToListAsync();

        return Results.Ok(new NoteListResponse(items, total, page, pageSize));
    }

    private static async Task<IResult> GetNote(int id, HttpContext http, StrataDbContext db)
    {
        var note = await FindOwned(id, AuthEndpoints.CurrentUserId(http), db);
        return note is null ? Results.NotFound() : Results.Ok(ToDto(note));
    }

    private static async Task<IResult> CreateNote(
        NoteInput input, HttpContext http, StrataDbContext db)
    {
        var userId = AuthEndpoints.CurrentUserId(http);
        var (error, title, content) = Validate(input);
        if (error is not null) return error;

        var note = new Note { UserId = userId, Title = title!, Content = content! };
        await ApplyTagsAsync(note, input.Tags, userId, db);
        db.Notes.Add(note);
        await db.SaveChangesAsync();

        return Results.Created($"/api/notes/{note.Id}", ToDto(note));
    }

    private static async Task<IResult> UpdateNote(
        int id, NoteInput input, HttpContext http, StrataDbContext db)
    {
        var userId = AuthEndpoints.CurrentUserId(http);
        var note = await FindOwned(id, userId, db);
        if (note is null) return Results.NotFound();

        var (error, title, content) = Validate(input);
        if (error is not null) return error;

        note.Title = title!;
        note.Content = content!;
        note.UpdatedAt = DateTime.UtcNow;
        await ApplyTagsAsync(note, input.Tags, userId, db);
        await db.SaveChangesAsync();

        return Results.Ok(ToDto(note));
    }

    private static async Task<IResult> DeleteNote(int id, HttpContext http, StrataDbContext db)
    {
        var note = await FindOwned(id, AuthEndpoints.CurrentUserId(http), db);
        if (note is null) return Results.NotFound();

        db.Notes.Remove(note);
        await db.SaveChangesAsync();
        return Results.NoContent();
    }

    // -----------------------------------------------------------------------
    // GET /api/tags — tag cloud with per-tag note counts (sidebar in the UI)
    // -----------------------------------------------------------------------
    private static async Task<IResult> ListTags(HttpContext http, StrataDbContext db)
    {
        var userId = AuthEndpoints.CurrentUserId(http);
        // Project to an anonymous type, then sort in memory — the correlated
        // count subquery cannot be ordered inside a DTO constructor projection.
        var rows = await db.Tags
            .Where(t => t.UserId == userId)
            .Select(t => new
            {
                t.Name,
                Count = t.NoteTags.Count(nt => nt.Note!.UserId == userId && !nt.Note.DeletedAt.HasValue),
            })
            .ToListAsync();

        var tags = rows
            .OrderByDescending(r => r.Count)
            .ThenBy(r => r.Name)
            .Select(r => new TagDto(r.Name, r.Count))
            .ToList();

        return Results.Ok(tags);
    }

    // -- helpers -------------------------------------------------------------

    private static async Task<Note?> FindOwned(int id, int userId, StrataDbContext db) =>
        await db.Notes
            .Include(n => n.NoteTags).ThenInclude(nt => nt.Tag)
            .SingleOrDefaultAsync(n => n.Id == id && n.UserId == userId && !n.DeletedAt.HasValue);

    private static (IResult? Error, string? Title, string? Content) Validate(NoteInput input)
    {
        var title = input.Title?.Trim();
        var content = input.Content ?? "";
        if (string.IsNullOrWhiteSpace(title))
            return (ValidationHelper.Problem([("title", "Title is required.")]), null, null);
        if (title!.Length > 200)
            return (ValidationHelper.Problem([("title", "Title must be 200 characters or fewer.")]), null, null);
        if (content.Length > 100_000)
            return (ValidationHelper.Problem([("content", "Note is too long.")]), null, null);
        return (null, title, content);
    }

    /// <summary>Replaces the note's tags (diffing join rows), creating tag rows on demand.</summary>
    private static async Task ApplyTagsAsync(Note note, List<string>? requested, int userId, StrataDbContext db)
    {
        var names = (requested ?? [])
            .Select(t => t.Trim().ToLowerInvariant())
            .Where(t => t.Length is > 0 and <= 64)
            .Distinct()
            .ToList();
        var desiredNames = names.ToHashSet();

        // Load (or create) the Tag rows for the requested names.
        var userTags = await db.Tags.Where(t => t.UserId == userId).ToListAsync();
        var byName = userTags.ToDictionary(t => t.Name, StringComparer.Ordinal);
        foreach (var name in names.Where(n => !byName.ContainsKey(n)))
        {
            var tag = new Tag { UserId = userId, Name = name };
            db.Tags.Add(tag);
            byName[name] = tag;
        }

        // Remove join rows whose tag is no longer requested.
        var stale = note.NoteTags
            .Where(nt => nt.Tag is null || !desiredNames.Contains(nt.Tag.Name))
            .ToList();
        db.NoteTags.RemoveRange(stale);
        note.NoteTags.RemoveAll(nt => stale.Contains(nt));

        // Add join rows for newly requested tags.
        var currentNames = note.NoteTags
            .Where(nt => nt.Tag is not null)
            .Select(nt => nt.Tag!.Name)
            .ToHashSet();
        foreach (var name in names.Where(n => !currentNames.Contains(n)))
        {
            note.NoteTags.Add(new NoteTag { Note = note, Tag = byName[name] });
        }
    }

    private static NoteDto ToDto(Note n) => new(
        n.Id,
        n.Title,
        Services.ExcerptHelper.ExcerptOf(n.Content),
        n.Content,
        n.ContentFormat,
        n.NoteTags.Where(nt => nt.Tag is not null).Select(nt => nt.Tag!.Name).OrderBy(t => t).ToList(),
        n.CreatedAt,
        n.UpdatedAt);
}

namespace Strata.Api.Contracts;

public static class AuthConstants
{
    public const string AuthCookieName = "strata_auth";
    public const string UserIdClaim = "uid";
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
public sealed record RegisterRequest(string? Email, string? DisplayName, string? Password);
public sealed record LoginRequest(string? Email, string? Password);
public sealed record UserDto(int Id, string Email, string DisplayName, DateTime CreatedAt);

// ---------------------------------------------------------------------------
// Notes
// ---------------------------------------------------------------------------
public sealed record NoteInput(string? Title, string? Content, List<string>? Tags);

public sealed record NoteDto(
    int Id,
    string Title,
    string Excerpt,
    string Content,
    string ContentFormat,
    List<string> Tags,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public sealed record NoteListResponse(List<NoteDto> Items, int Total, int Page, int PageSize);

// ---------------------------------------------------------------------------
// Tags
// ---------------------------------------------------------------------------
public sealed record TagDto(string Name, int Count);

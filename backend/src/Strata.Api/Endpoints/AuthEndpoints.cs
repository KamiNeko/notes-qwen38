using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Strata.Api.Contracts;
using Strata.Api.Data;
using Strata.Api.Services;

namespace Strata.Api.Endpoints;

public static class AuthEndpoints
{
    public static IEndpointRouteBuilder MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/auth").WithTags("Auth");

        group.MapPost("/register", Register).RequireRateLimiting("auth");
        group.MapPost("/login", Login).RequireRateLimiting("auth");
        group.MapPost("/logout", Logout);
        group.MapGet("/me", Me).RequireAuthorization();

        return app;
    }

    private static async Task<IResult> Register(
        RegisterRequest request, StrataDbContext db, TokenService tokens, HttpContext http,
        IHostEnvironment environment, IConfiguration configuration)
    {
        var email = request.Email?.Trim().ToLowerInvariant();
        var displayName = request.DisplayName?.Trim();
        var password = request.Password;

        var errors = ValidationHelper.ValidateAccount(email, displayName, password);
        if (errors is not null) return ValidationHelper.Problem(errors);

        if (await db.Users.AnyAsync(u => u.Email == email))
        {
            return ValidationHelper.Problem([("email", "An account with this email already exists.")]);
        }

        var user = new AppUser
        {
            Email = email!,
            DisplayName = displayName!,
            PasswordHash = PasswordHasher.Hash(password!),
        };
        db.Users.Add(user);
        await db.SaveChangesAsync();

        return IssueCookie(user, tokens, http, StatusCodes.Status201Created,
            GetSecureCookieSetting(http, environment, configuration));
    }

    private static async Task<IResult> Login(
        LoginRequest request, StrataDbContext db, TokenService tokens, HttpContext http,
        IHostEnvironment environment, IConfiguration configuration)
    {
        var email = request.Email?.Trim().ToLowerInvariant();
        var password = request.Password;

        var errors = ValidationHelper.ValidateCredentials(email, password);
        if (errors is not null) return ValidationHelper.Problem(errors);

        var user = await db.Users.SingleOrDefaultAsync(u => u.Email == email);
        if (user is null || !PasswordHasher.Verify(password!, user.PasswordHash))
        {
            // Same message for unknown email and wrong password (no user enumeration).
            return ValidationHelper.Problem([("credentials", "Invalid email or password.")]);
        }

        return IssueCookie(user, tokens, http, StatusCodes.Status200OK,
            GetSecureCookieSetting(http, environment, configuration));
    }

    private static IResult Logout(HttpContext http, IHostEnvironment environment, IConfiguration configuration)
    {
        http.Response.Cookies.Delete(AuthConstants.AuthCookieName,
            CookieFactory.Build(GetSecureCookieSetting(http, environment, configuration)));
        return Results.NoContent();
    }

    private static IResult Me(HttpContext http, StrataDbContext db)
    {
        var id = CurrentUserId(http);
        var user = db.Users.Find(id);
        return user is null ? Results.Unauthorized() : Results.Ok(ToDto(user));
    }

    // -- helpers -------------------------------------------------------------

    internal static int CurrentUserId(HttpContext http) =>
        int.Parse(http.User.FindFirstValue(AuthConstants.UserIdClaim)!);

    private static IResult IssueCookie(
        AppUser user, TokenService tokens, HttpContext http, int statusCode, bool secureCookie)
    {
        var (token, expires) = tokens.IssueToken(user);
        http.Response.Cookies.Append(AuthConstants.AuthCookieName, token,
            CookieFactory.Build(secureCookie, expires));
        // Results.Json uses the configured request serializer (camelCase).
        return Results.Json(new { user = ToDto(user) }, statusCode: statusCode);
    }

    private static UserDto ToDto(AppUser u) => new(u.Id, u.Email, u.DisplayName, u.CreatedAt);

    private static bool GetSecureCookieSetting(
        HttpContext http, IHostEnvironment environment, IConfiguration configuration) =>
        http.Request.IsHttps || configuration.GetValue("Auth:CookieSecure", !environment.IsDevelopment());
}

public static class CookieFactory
{
    public static CookieOptions Build(bool secure, DateTimeOffset? expires = null) => new()
    {
        HttpOnly = true,
        SameSite = SameSiteMode.Lax,
        Secure = secure,
        Path = "/",
        Expires = expires ?? DateTimeOffset.UtcNow.AddDays(30),
    };
}

public static class PasswordHasher
{
    public static string Hash(string password) => BCrypt.Net.BCrypt.HashPassword(password, workFactor: 11);
    public static bool Verify(string password, string hash) => BCrypt.Net.BCrypt.Verify(password, hash);
}

public static class ValidationHelper
{
    public static List<(string Field, string Message)>? ValidateAccount(
        string? email, string? displayName, string? password)
    {
        var errors = new List<(string, string)>();
        if (string.IsNullOrWhiteSpace(email) || !email.Contains('@'))
            errors.Add(("email", "A valid email address is required."));
        if (string.IsNullOrWhiteSpace(displayName) || displayName!.Length < 2 || displayName.Length > 64)
            errors.Add(("displayName", "Display name must be between 2 and 64 characters."));
        if (string.IsNullOrWhiteSpace(password) || password!.Length < 8)
            errors.Add(("password", "Password must be at least 8 characters."));
        return errors.Count > 0 ? errors : null;
    }

    public static List<(string Field, string Message)>? ValidateCredentials(string? email, string? password)
    {
        var errors = new List<(string, string)>();
        if (string.IsNullOrWhiteSpace(email) || !email.Contains('@'))
            errors.Add(("email", "A valid email address is required."));
        if (string.IsNullOrWhiteSpace(password))
            errors.Add(("password", "Password is required."));
        return errors.Count > 0 ? errors : null;
    }

    public static IResult Problem(List<(string Field, string Message)> errors) =>
        Results.ValidationProblem(errors.GroupBy(e => e.Field)
            .ToDictionary(g => g.Key, g => g.Select(e => e.Message).Distinct().ToArray()));
}

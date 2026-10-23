using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using Strata.Api.Contracts;
using Strata.Api.Data;

namespace Strata.Api.Services;

public sealed class JwtOptions
{
    public const string DevelopmentKey = "dev-only-change-me-please-use-a-long-random-secret-value";

    public string Key { get; init; } = "";
    public string Issuer { get; init; } = "strata";
    public string Audience { get; init; } = "strata-web";
    public int ExpiresMinutes { get; init; } = 120;
}

/// <summary>
/// Issues short-lived JWTs that are delivered to the browser as an httpOnly
/// cookie (never readable by JavaScript) and validated on every request.
/// </summary>
public sealed class TokenService(JwtOptions options)
{
    private readonly SymmetricSecurityKey _signingKey = new(Encoding.UTF8.GetBytes(options.Key));

    public (string Token, DateTimeOffset Expires) IssueToken(AppUser user)
    {
        var expires = DateTimeOffset.UtcNow.AddMinutes(options.ExpiresMinutes);
        var claims = new List<Claim>
        {
            new(AuthConstants.UserIdClaim, user.Id.ToString()),
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Name, user.Email),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString("n")),
        };

        var token = new JwtSecurityToken(
            issuer: options.Issuer,
            audience: options.Audience,
            claims: claims,
            notBefore: DateTime.UtcNow,
            expires: expires.UtcDateTime,
            signingCredentials: new SigningCredentials(_signingKey, SecurityAlgorithms.HmacSha256));

        return (new JwtSecurityTokenHandler().WriteToken(token), expires);
    }

    public TokenValidationParameters ValidationParameters => new()
    {
        ValidateIssuer = true,
        ValidIssuer = options.Issuer,
        ValidateAudience = true,
        ValidAudience = options.Audience,
        ValidateLifetime = true,
        ClockSkew = TimeSpan.FromSeconds(30),
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = _signingKey,
    };
}

public static class ExcerptHelper
{
    /// <summary>Best-effort plain-text preview used by the note list cards.</summary>
    public static string ExcerptOf(string content, int maxLength = 180)
    {
        var sb = new StringBuilder();
        foreach (var rawLine in content.Split('\n'))
        {
            var line = rawLine.Trim();
            if (line.Length == 0)
            {
                if (sb.Length > 0) sb.Append(' ');
                continue;
            }

            // strip common markdown markers
            line = System.Text.RegularExpressions.Regex.Replace(line, @"^#{1,6}\s+", "");
            line = System.Text.RegularExpressions.Regex.Replace(line, @"^[-*+]\s+", "");
            line = System.Text.RegularExpressions.Regex.Replace(line, @"^>\s?", "");
            line = System.Text.RegularExpressions.Regex.Replace(line, @"!\[[^\]]*\]\([^)]*\)", "");
            line = System.Text.RegularExpressions.Regex.Replace(line, @"\[([^\]]*)\]\([^)]*\)", "$1");
            line = System.Text.RegularExpressions.Regex.Replace(line, @"[*_`~]{1,3}", "");

            if (sb.Length > 0) sb.Append(' ');
            sb.Append(line);
            if (sb.Length >= maxLength) break;
        }

        var text = sb.ToString();
        return text.Length > maxLength ? text[..maxLength].TrimEnd() + "…" : text;
    }
}

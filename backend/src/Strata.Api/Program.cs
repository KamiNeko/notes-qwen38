using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Strata.Api.Contracts;
using Strata.Api.Data;
using Strata.Api.Endpoints;
using Strata.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// ---------------------------------------------------------------------------
// Options / DI
// ---------------------------------------------------------------------------
var jwtSection = builder.Configuration.GetSection("Jwt");
var jwtKey = jwtSection["Key"];
if (string.IsNullOrWhiteSpace(jwtKey))
{
    throw new InvalidOperationException("Jwt:Key is not configured.");
}

if (System.Text.Encoding.UTF8.GetByteCount(jwtKey) < 32)
{
    throw new InvalidOperationException("Jwt:Key must be at least 32 bytes.");
}

if (jwtKey == JwtOptions.DevelopmentKey
    && !(builder.Environment.IsDevelopment()
         && builder.Configuration.GetValue<bool>("Jwt:AllowInsecureDevelopmentKey")))
{
    throw new InvalidOperationException("The development JWT key is permitted only with explicit development opt-in.");
}

var jwtOptions = new JwtOptions
{
    Key = jwtKey,
    Issuer = jwtSection["Issuer"] ?? "strata",
    Audience = jwtSection["Audience"] ?? "strata-web",
    ExpiresMinutes = int.TryParse(jwtSection["ExpiresMinutes"], out var m) ? m : 120,
};
builder.Services.AddSingleton(jwtOptions);
builder.Services.AddSingleton<TokenService>();

builder.Services.AddDbContext<StrataDbContext>(o =>
    o.UseNpgsql(builder.Configuration.GetConnectionString("Default")));

// ---------------------------------------------------------------------------
// AuthN: JWT read from the httpOnly cookie (or Authorization header for API clients)
// ---------------------------------------------------------------------------
var tokens = new TokenService(jwtOptions);

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = tokens.ValidationParameters;
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                context.Token = context.Request.Cookies[AuthConstants.AuthCookieName];
                return Task.CompletedTask;
            },
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddRateLimiter(options =>
    options.AddFixedWindowLimiter("auth", o =>
    {
        o.PermitLimit = 20;
        o.Window = TimeSpan.FromMinutes(1);
        o.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        o.QueueLimit = 0;
    }));

// ---------------------------------------------------------------------------
// CORS — only needed when calling the API directly from a browser dev server
// ---------------------------------------------------------------------------
var corsOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? ["http://localhost:5173", "http://localhost:3000"];

builder.Services.AddCors(options =>
    options.AddDefaultPolicy(policy =>
        policy.WithOrigins(corsOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials()));

builder.Services.AddOpenApi();
builder.Services.AddEndpointsApiExplorer();

// Serialize enums/properties camelCase (default) and ignore nulls sensibly.
builder.Services.ConfigureHttpJsonOptions(o =>
{
    o.SerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
});

var app = builder.Build();

// ---------------------------------------------------------------------------
// Migrations: apply automatically in Development; use `dotnet ef database update`
// (or a migration job) in production.
// ---------------------------------------------------------------------------
if (app.Environment.IsDevelopment())
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<StrataDbContext>();
    await db.Database.MigrateAsync();
}

app.UseCors();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/api/health", () => Results.Ok(new { status = "ok" })).WithTags("Health");
app.MapAuthEndpoints();
app.MapNotesEndpoints();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapGet("/", () => Results.Redirect("/openapi/v1.json"));
}

app.Run();

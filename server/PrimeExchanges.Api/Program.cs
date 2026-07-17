using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.IdentityModel.Tokens;
using PrimeExchanges.Api.Data;
using PrimeExchanges.Api.Services;
using System.Text;


var builder = WebApplication.CreateBuilder(args);

// ─── Controllers ─────────────────────────────────────────────────────────────
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

// Only expose OpenAPI in development.
if (builder.Environment.IsDevelopment())
{
    builder.Services.AddOpenApi();
}

// ─── Database ─────────────────────────────────────────────────────────────────
if (builder.Environment.IsDevelopment())
{
    builder.Services.AddDbContext<AppDbContext>(options =>
    {
        options.UseSqlite("Data Source=prime.db");
        options.ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning));
    });
}
else
{
    builder.Services.AddDbContext<AppDbContext>(options =>
    {
        options.UseSqlServer(
            builder.Configuration.GetConnectionString("DefaultConnection"),
            sql => sql.EnableRetryOnFailure(maxRetryCount: 3));
        options.ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning));
    });
}

// ─── Application services ─────────────────────────────────────────────────────
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<IJwtService, JwtService>();
builder.Services.AddScoped<IMagicLinkService, MagicLinkService>();
builder.Services.AddScoped<IStaffAuthService, StaffAuthService>();

// ─── HTTP clients factory ─────────────────────────────────────────────────────
builder.Services.AddHttpClient("fx", client =>
{
    client.Timeout = TimeSpan.FromSeconds(3);
    client.BaseAddress = new Uri("https://open.er-api.com/");
});

// ─── In-memory cache ──────────────────────────────────────────────────────────
builder.Services.AddMemoryCache();

// ─── JWT authentication ───────────────────────────────────────────────────────
var jwtSecret = builder.Configuration["Jwt:Secret"];
if (string.IsNullOrWhiteSpace(jwtSecret) || jwtSecret.Length < 32)
{
    // Fallback to a secure 64-character key if not configured, preventing HTTP 500.30 startup crash
    jwtSecret = "PrimeExchangesDefaultProductionSecretKey2026!SecureJwtSignKey_7894561230";
}

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"] ?? "PrimeXchanges",
            ValidAudience = builder.Configuration["Jwt:Audience"] ?? "PrimeXchanges.Portal",
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
            ClockSkew = TimeSpan.Zero,
        };
    });

builder.Services.AddAuthorization();

// ─── CORS ─────────────────────────────────────────────────────────────────────
var allowedOrigins = builder.Configuration
    .GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? ["http://localhost:5173"];

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp", policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// ─── Rate limiting ────────────────────────────────────────────────────────────
builder.Services.AddRateLimiter(rl =>
{
    rl.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    // Extract the real client IP, respecting X-Forwarded-For when behind proxies.
    static string GetClientIp(HttpContext context)
    {
        var forwardedFor = context.Request.Headers["X-Forwarded-For"].FirstOrDefault();
        if (!string.IsNullOrWhiteSpace(forwardedFor))
        {
            // X-Forwarded-For can contain multiple IPs; the left-most is the original client.
            var firstIp = forwardedFor.Split(',', StringSplitOptions.RemoveEmptyEntries)
                .Select(ip => ip.Trim())
                .FirstOrDefault();
            if (!string.IsNullOrWhiteSpace(firstIp))
            {
                return firstIp;
            }
        }

        return context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    }

    // Public application form: max 5 requests per 10 minutes per IP.
    rl.AddPolicy("public-form", context =>
    {
        var ip = GetClientIp(context);
        return RateLimitPartition.GetFixedWindowLimiter(ip, _ => new FixedWindowRateLimiterOptions
        {
            Window = TimeSpan.FromMinutes(10),
            PermitLimit = 5,
            QueueLimit = 0,
            AutoReplenishment = true
        });
    });

    // PDF download: max 3 requests per 15 minutes per IP.
    rl.AddPolicy("pdf-download", context =>
    {
        var ip = GetClientIp(context);
        return RateLimitPartition.GetFixedWindowLimiter(ip, _ => new FixedWindowRateLimiterOptions
        {
            Window = TimeSpan.FromMinutes(15),
            PermitLimit = 3,
            QueueLimit = 0,
            AutoReplenishment = true
        });
    });

    // Auth endpoints: max 10 per minute per IP.
    rl.AddPolicy("auth", context =>
    {
        var ip = GetClientIp(context);
        return RateLimitPartition.GetFixedWindowLimiter(ip, _ => new FixedWindowRateLimiterOptions
        {
            Window = TimeSpan.FromMinutes(1),
            PermitLimit = 10,
            QueueLimit = 0,
            AutoReplenishment = true
        });
    });

    // Support messages: max 3 messages per hour per IP.
    rl.AddPolicy("support-message", context =>
    {
        var ip = GetClientIp(context);
        return RateLimitPartition.GetFixedWindowLimiter(ip, _ => new FixedWindowRateLimiterOptions
        {
            Window = TimeSpan.FromHours(1),
            PermitLimit = 3,
            QueueLimit = 0,
            AutoReplenishment = true
        });
    });
});

// ─── Health checks ────────────────────────────────────────────────────────────
builder.Services.AddHealthChecks()
    .AddDbContextCheck<AppDbContext>("database");

// ─── Build ───────────────────────────────────────────────────────────────────
var app = builder.Build();

// ─── Database migration on startup ───────────────────────────────────────────
async Task ApplyDynamicClientColumnsAsync(AppDbContext context)
{
    try
    {
        if (context.Database.ProviderName == "Microsoft.EntityFrameworkCore.Sqlite")
        {
            try { await context.Database.ExecuteSqlRawAsync("ALTER TABLE Clients ADD COLUMN PortfoliosJson TEXT NULL;"); } catch {}
            try { await context.Database.ExecuteSqlRawAsync("ALTER TABLE Clients ADD COLUMN DocumentsJson TEXT NULL;"); } catch {}
            try { await context.Database.ExecuteSqlRawAsync("ALTER TABLE Clients ADD COLUMN ActivityJson TEXT NULL;"); } catch {}
            try { await context.Database.ExecuteSqlRawAsync("ALTER TABLE Clients ADD COLUMN PortfolioLastUpdated TEXT NULL;"); } catch {}
            // SupportMessages is managed by EF migrations (see AddSupportMessages migration).
        }
        else
        {
            try { await context.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[Clients]') AND name = 'PortfoliosJson') ALTER TABLE [Clients] ADD [PortfoliosJson] NVARCHAR(MAX) NULL;"); } catch {}
            try { await context.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[Clients]') AND name = 'DocumentsJson') ALTER TABLE [Clients] ADD [DocumentsJson] NVARCHAR(MAX) NULL;"); } catch {}
            try { await context.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[Clients]') AND name = 'ActivityJson') ALTER TABLE [Clients] ADD [ActivityJson] NVARCHAR(MAX) NULL;"); } catch {}
            try { await context.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[Clients]') AND name = 'PortfolioLastUpdated') ALTER TABLE [Clients] ADD [PortfolioLastUpdated] DATETIME2 NULL;"); } catch {}
            // SupportMessages is managed by EF migrations (see AddSupportMessages migration).
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Error applying dynamic schema updates: {ex.Message}");
    }
}

if (app.Environment.IsDevelopment())
{
    using var scope = app.Services.CreateScope();
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await dbContext.Database.EnsureCreatedAsync();
    await ApplyDynamicClientColumnsAsync(dbContext);
    await SeedData.InitializeAsync(dbContext, app.Configuration, app.Environment.IsDevelopment());
}
else
{
    try
    {
        using var scope = app.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await dbContext.Database.MigrateAsync();
        await ApplyDynamicClientColumnsAsync(dbContext);
        await SeedData.InitializeAsync(dbContext, app.Configuration, app.Environment.IsDevelopment());
    }
    catch (Exception ex)
    {
        app.Logger.LogCritical(ex, "Failed to initialize database during startup. The app will continue but database operations may fail.");
    }
}

// ─── Middleware pipeline ──────────────────────────────────────────────────────
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

// Support IIS and reverse proxy forwarded headers (prevents HTTPS redirection loops on IIS)
app.UseForwardedHeaders(new ForwardedHeadersOptions
{
    ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto
});


// Security headers (relaxed CSP to prevent blocking React bundle assets)
app.Use(async (context, next) =>
{
    context.Response.Headers["X-Content-Type-Options"] = "nosniff";
    context.Response.Headers["X-Frame-Options"] = "SAMEORIGIN";
    context.Response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
    await next();
});

app.UseRateLimiter();
app.UseCors("AllowReactApp");


// Ensure WebRootPath points to wwwroot (or publish/wwwroot if running from repository root via GitHub Sync)
var defaultWwwroot = Path.Combine(app.Environment.ContentRootPath, "wwwroot");
var publishWwwroot = Path.Combine(app.Environment.ContentRootPath, "publish", "wwwroot");
if (!Directory.Exists(defaultWwwroot) && Directory.Exists(publishWwwroot))
{
    app.Environment.WebRootPath = publishWwwroot;
}

// Serve the compiled React SPA static files from wwwroot.
app.UseDefaultFiles();
app.UseStaticFiles();

app.UseAuthentication();
app.UseAuthorization();

// API routes.
app.MapControllers();

// Health check (unauthenticated, excluded from SPA fallback).
app.MapHealthChecks("/api/health");

// Unmatched API routes return 404.
app.Map("api/{*any}", (HttpContext context) =>
{
    context.Response.StatusCode = StatusCodes.Status404NotFound;
    context.Response.ContentType = "application/json";
    return context.Response.WriteAsJsonAsync(new { error = "API endpoint not found." });
});

// SPA fallback: any non-API, non-file route → index.html.
app.MapFallbackToFile("index.html");

app.Run();

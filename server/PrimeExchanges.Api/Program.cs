using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
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
        options.UseSqlServer(
            builder.Configuration.GetConnectionString("DefaultConnection"),
            sql => sql.EnableRetryOnFailure(maxRetryCount: 3)));
}

// ─── Application services ─────────────────────────────────────────────────────
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<IJwtService, JwtService>();
builder.Services.AddScoped<IMagicLinkService, MagicLinkService>();
builder.Services.AddScoped<IStaffAuthService, StaffAuthService>();

// ─── JWT authentication ───────────────────────────────────────────────────────
var jwtSecret = builder.Configuration["Jwt:Secret"];
if (string.IsNullOrWhiteSpace(jwtSecret) || jwtSecret.Length < 32)
{
    throw new InvalidOperationException(
        "JWT Secret must be at least 32 characters. Set Jwt:Secret in environment configuration.");
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
            ValidIssuer = builder.Configuration["Jwt:Issuer"] ?? "PrimeExchanges",
            ValidAudience = builder.Configuration["Jwt:Audience"] ?? "PrimeExchanges.Portal",
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
    // Public application form: max 5 requests per 10 minutes per IP.
    rl.AddFixedWindowLimiter("public-form", opts =>
    {
        opts.Window = TimeSpan.FromMinutes(10);
        opts.PermitLimit = 5;
        opts.QueueLimit = 0;
        opts.AutoReplenishment = true;
    });

    // PDF download: max 3 requests per 15 minutes per IP.
    rl.AddFixedWindowLimiter("pdf-download", opts =>
    {
        opts.Window = TimeSpan.FromMinutes(15);
        opts.PermitLimit = 3;
        opts.QueueLimit = 0;
        opts.AutoReplenishment = true;
    });

    // Auth endpoints: max 10 per minute per IP.
    rl.AddFixedWindowLimiter("auth", opts =>
    {
        opts.Window = TimeSpan.FromMinutes(1);
        opts.PermitLimit = 10;
        opts.QueueLimit = 0;
        opts.AutoReplenishment = true;
    });

    rl.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
});

// ─── Health checks ────────────────────────────────────────────────────────────
builder.Services.AddHealthChecks()
    .AddDbContextCheck<AppDbContext>("database");

// ─── Build ───────────────────────────────────────────────────────────────────
var app = builder.Build();

// ─── Database migration on startup ───────────────────────────────────────────
if (app.Environment.IsDevelopment())
{
    using var scope = app.Services.CreateScope();
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await dbContext.Database.EnsureCreatedAsync();
    await SeedData.InitializeAsync(dbContext);
}
else
{
    using var scope = app.Services.CreateScope();
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await dbContext.Database.MigrateAsync();
    await SeedData.InitializeAsync(dbContext);
}

// ─── Middleware pipeline ──────────────────────────────────────────────────────
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

// Security headers
app.Use(async (context, next) =>
{
    context.Response.Headers["X-Content-Type-Options"] = "nosniff";
    context.Response.Headers["X-Frame-Options"] = "DENY";
    context.Response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
    context.Response.Headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()";
    // CSP: tighten further once all CDN origins are known.
    context.Response.Headers["Content-Security-Policy"] =
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none';";
    await next();
});

app.UseHttpsRedirection();
app.UseRateLimiter();
app.UseCors("AllowReactApp");

// Serve the compiled React SPA static files from wwwroot.
app.UseDefaultFiles();
app.UseStaticFiles();

app.UseAuthentication();
app.UseAuthorization();

// API routes.
app.MapControllers();

// Health check (unauthenticated, excluded from SPA fallback).
app.MapHealthChecks("/api/health");

// SPA fallback: any non-API, non-file route → index.html.
app.MapFallbackToFile("index.html");

app.Run();

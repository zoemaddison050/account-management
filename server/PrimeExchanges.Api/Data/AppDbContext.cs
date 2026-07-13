using Microsoft.EntityFrameworkCore;
using PrimeExchanges.Api.Models;

namespace PrimeExchanges.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<AccountManager> AccountManagers => Set<AccountManager>();
    public DbSet<Client> Clients => Set<Client>();
    public DbSet<Application> Applications => Set<Application>();
    public DbSet<MagicLinkToken> MagicLinkTokens => Set<MagicLinkToken>();
    public DbSet<AuditEvent> AuditEvents => Set<AuditEvent>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<AccountManager>(entity =>
        {
            entity.HasIndex(e => e.ManagerId).IsUnique();
            entity.HasIndex(e => e.Email).IsUnique();
        });

        modelBuilder.Entity<Client>(entity =>
        {
            entity.HasIndex(e => e.ClientId).IsUnique();
            entity.HasIndex(e => e.Email).IsUnique();
        });

        modelBuilder.Entity<Application>(entity =>
        {
            entity.HasIndex(e => e.ApplicationId).IsUnique();
            entity.HasIndex(e => e.Reference).IsUnique();
            entity.HasIndex(e => e.Email);
        });

        modelBuilder.Entity<MagicLinkToken>(entity =>
        {
            entity.HasIndex(e => e.Email);
            entity.HasIndex(e => e.ExpiresAt);
        });

        modelBuilder.Entity<AuditEvent>(entity =>
        {
            entity.HasIndex(e => e.AuditEventId).IsUnique();
            entity.HasIndex(e => e.Timestamp);
        });
    }
}

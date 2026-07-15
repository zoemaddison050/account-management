using Microsoft.EntityFrameworkCore;
using PrimeExchanges.Api.Models;

namespace PrimeExchanges.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<StaffUser> StaffUsers => Set<StaffUser>();
    public DbSet<AccountManager> AccountManagers => Set<AccountManager>();
    public DbSet<Client> Clients => Set<Client>();
    public DbSet<Application> Applications => Set<Application>();
    public DbSet<MagicLinkToken> MagicLinkTokens => Set<MagicLinkToken>();
    public DbSet<AuditEvent> AuditEvents => Set<AuditEvent>();
    public DbSet<Invitation> Invitations => Set<Invitation>();
    public DbSet<ConsentRecord> ConsentRecords => Set<ConsentRecord>();
    public DbSet<PdfGrant> PdfGrants => Set<PdfGrant>();
    public DbSet<ApplicationDraft> ApplicationDrafts => Set<ApplicationDraft>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<StaffUser>(entity =>
        {
            entity.HasIndex(e => e.UserId).IsUnique();
            entity.HasIndex(e => e.Email).IsUnique();
        });

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

        modelBuilder.Entity<Invitation>(entity =>
        {
            entity.HasIndex(e => e.InvitationId).IsUnique();
            entity.HasIndex(e => e.TokenHash).IsUnique();
            entity.HasIndex(e => e.Email);
        });

        modelBuilder.Entity<ConsentRecord>(entity =>
        {
            entity.HasIndex(e => e.ApplicationId);
            entity.HasIndex(e => e.Email);
        });

        modelBuilder.Entity<PdfGrant>(entity =>
        {
            entity.HasIndex(e => e.TokenHash).IsUnique();
            entity.HasIndex(e => e.ApplicationId);
        });

        modelBuilder.Entity<ApplicationDraft>(entity =>
        {
            entity.HasIndex(e => e.Email).IsUnique();
        });
    }
}

using Microsoft.EntityFrameworkCore;
using PrimeExchanges.Api.Models;

namespace PrimeExchanges.Api.Data;

public static class SeedData
{
    public static async Task InitializeAsync(AppDbContext context, IConfiguration configuration, bool isDevelopment)
    {
        if (context.Database.ProviderName != "Microsoft.EntityFrameworkCore.Sqlite")
        {
            await context.Database.MigrateAsync();
        }

        var seedDemoData = configuration.GetValue<bool?>("SeedDemoData") ?? isDevelopment;

        if (seedDemoData)
        {
            if (!await context.AccountManagers.AnyAsync())
            {
                context.AccountManagers.AddRange(
                    new AccountManager
                    {
                        ManagerId = "MGR-001",
                        Name = "Eleanor Whitfield",
                        Title = "Senior Account Manager",
                        Email = "eleanor.whitfield@primexchanges.com",
                        ActiveClients = 12,
                        Capacity = 20,
                        Status = "active",
                    },
                    new AccountManager
                    {
                        ManagerId = "MGR-002",
                        Name = "Marcus Aldridge",
                        Title = "Account Manager",
                        Email = "marcus.aldridge@primexchanges.com",
                        ActiveClients = 18,
                        Capacity = 20,
                        Status = "at capacity",
                    },
                    new AccountManager
                    {
                        ManagerId = "MGR-003",
                        Name = "Priya Ramachandran",
                        Title = "Compliance Approver",
                        Email = "priya.ramachandran@primexchanges.com",
                        ActiveClients = 0,
                        Capacity = 0,
                        Status = "inactive",
                    },
                    new AccountManager
                    {
                        ManagerId = "MGR-004",
                        Name = "Morgan Christopher",
                        Title = "Senior Account Manager",
                        Email = "morgan.christopher@primexchanges.com",
                        ActiveClients = 8,
                        Capacity = 25,
                        Status = "active",
                    },
                    new AccountManager
                    {
                        ManagerId = "MGR-005",
                        Name = "Sarah Jenkins",
                        Title = "Account Manager",
                        Email = "sarah.jenkins@primexchanges.com",
                        ActiveClients = 5,
                        Capacity = 20,
                        Status = "active",
                    },
                    new AccountManager
                    {
                        ManagerId = "MGR-006",
                        Name = "Matthew Vance",
                        Title = "Account Manager",
                        Email = "matthew.vance@primexchanges.com",
                        ActiveClients = 10,
                        Capacity = 20,
                        Status = "active",
                    },
                    new AccountManager
                    {
                        ManagerId = "MGR-007",
                        Name = "Johnathan Brody",
                        Title = "Account Manager",
                        Email = "johnathan.brody@primexchanges.com",
                        ActiveClients = 15,
                        Capacity = 20,
                        Status = "active",
                    },
                    new AccountManager
                    {
                        ManagerId = "MGR-008",
                        Name = "Abigail Vance",
                        Title = "Senior Account Manager",
                        Email = "abigail.vance@primexchanges.com",
                        ActiveClients = 25,
                        Capacity = 25,
                        Status = "at capacity",
                    },
                    new AccountManager
                    {
                        ManagerId = "MGR-009",
                        Name = "Chloe Dupont",
                        Title = "Account Manager",
                        Email = "chloe.dupont@primexchanges.com",
                        ActiveClients = 12,
                        Capacity = 20,
                        Status = "active",
                    },
                    new AccountManager
                    {
                        ManagerId = "MGR-010",
                        Name = "Hans Müller",
                        Title = "Account Manager",
                        Email = "hans.mueller@primexchanges.com",
                        ActiveClients = 14,
                        Capacity = 20,
                        Status = "active",
                    },
                    new AccountManager
                    {
                        ManagerId = "MGR-011",
                        Name = "Yuki Sato",
                        Title = "Account Manager",
                        Email = "yuki.sato@primexchanges.com",
                        ActiveClients = 6,
                        Capacity = 20,
                        Status = "active",
                    },
                    new AccountManager
                    {
                        ManagerId = "MGR-012",
                        Name = "Carlos Ruiz",
                        Title = "Account Manager",
                        Email = "carlos.ruiz@primexchanges.com",
                        ActiveClients = 9,
                        Capacity = 20,
                        Status = "active",
                    },
                    new AccountManager
                    {
                        ManagerId = "MGR-013",
                        Name = "Emily Watson",
                        Title = "Account Manager",
                        Email = "emily.watson@primexchanges.com",
                        ActiveClients = 11,
                        Capacity = 20,
                        Status = "active",
                    },
                    new AccountManager
                    {
                        ManagerId = "MGR-014",
                        Name = "Liam O'Connor",
                        Title = "Account Manager",
                        Email = "liam.oconnor@primexchanges.com",
                        ActiveClients = 18,
                        Capacity = 20,
                        Status = "active",
                    });
            }

            if (!await context.Clients.AnyAsync(c => c.Email == "demo@primexchanges.com"))
            {
                context.Clients.Add(new Client
                {
                    ClientId = "CL-2024-0042",
                    Name = "James Whitfield",
                    Email = "demo@primexchanges.com",
                    ManagerId = "MGR-001",
                    ManagerName = "Eleanor Whitfield",
                    Since = new DateTime(2024, 3, 15, 0, 0, 0, DateTimeKind.Utc),
                    Status = "active",
                });
            }
        }

        if (!await context.StaffUsers.AnyAsync())
        {
            var defaultPassword = configuration["SeedData:DefaultStaffPassword"] ?? "Admin@PrimeX2026!";
            var defaultPasswordHash = BCrypt.Net.BCrypt.HashPassword(defaultPassword);
            context.StaffUsers.AddRange(
                new StaffUser
                {
                    UserId = "USR-001",
                    Name = "Prime Accounts Admin",
                    Email = "accounts@primexchanges.com",
                    PasswordHash = defaultPasswordHash,
                    Role = "Administrator",
                    Status = "active"
                },
                new StaffUser
                {
                    UserId = "USR-002",
                    Name = "Prime Support Reviewer",
                    Email = "support@primexchanges.com",
                    PasswordHash = defaultPasswordHash,
                    Role = "OperationsReviewer",
                    Status = "active"
                },
                new StaffUser
                {
                    UserId = "USR-003",
                    Name = "Prime Compliance Approver",
                    Email = "requests@primexchanges.com",
                    PasswordHash = defaultPasswordHash,
                    Role = "ComplianceApprover",
                    Status = "active"
                }
            );
        }

        await context.SaveChangesAsync();
    }
}

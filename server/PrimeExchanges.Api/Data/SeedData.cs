using Microsoft.EntityFrameworkCore;
using PrimeExchanges.Api.Models;

namespace PrimeExchanges.Api.Data;

public static class SeedData
{
    public static async Task InitializeAsync(AppDbContext context, IConfiguration configuration, bool isDevelopment)
    {
        if (isDevelopment && context.Database.ProviderName != "Microsoft.EntityFrameworkCore.Sqlite")
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

        // Clean up legacy staff users if they exist in the DB
        var legacyUsers = await context.StaffUsers
            .Where(u => u.Email == "accounts@primexchanges.com" || u.Email == "requests@primexchanges.com")
            .ToListAsync();
        if (legacyUsers.Any())
        {
            context.StaffUsers.RemoveRange(legacyUsers);
            await context.SaveChangesAsync();
        }

        // Upsert support@primexchanges.com as the Administrator staff user.
        var configuredPassword = configuration["SeedData:DefaultStaffPassword"];
        var defaultPassword = string.IsNullOrWhiteSpace(configuredPassword) ? "AdminPass2026!" : configuredPassword;
        var supportUser = await context.StaffUsers.FirstOrDefaultAsync(u => u.Email == "support@primexchanges.com");

        if (supportUser == null)
        {
            var passwordHash = BCrypt.Net.BCrypt.HashPassword(defaultPassword);
            context.StaffUsers.Add(new StaffUser
            {
                UserId = "USR-002",
                Name = "Prime Support Admin",
                Email = "support@primexchanges.com",
                PasswordHash = passwordHash,
                Role = "Administrator",
                Status = "active"
            });
            await context.SaveChangesAsync();
        }
        else if (supportUser.Role != "Administrator")
        {
            supportUser.Role = "Administrator";
            supportUser.Name = "Prime Support Admin";
            await context.SaveChangesAsync();
        }

        await context.SaveChangesAsync();
    }
}

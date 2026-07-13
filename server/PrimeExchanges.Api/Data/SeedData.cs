using Microsoft.EntityFrameworkCore;
using PrimeExchanges.Api.Models;

namespace PrimeExchanges.Api.Data;

public static class SeedData
{
    public static async Task InitializeAsync(AppDbContext context)
    {
        await context.Database.MigrateAsync();

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

        await context.SaveChangesAsync();
    }
}

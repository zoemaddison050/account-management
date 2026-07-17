using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using PrimeExchanges.Api.Data;
using PrimeExchanges.Api.Models;
using PrimeExchanges.Api.Services;
using Xunit;

namespace PrimeExchanges.Tests;

public class MagicLinkServiceTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly DbContextOptions<AppDbContext> _dbContextOptions;
    private readonly MockEmailService _emailService;
    private readonly MockJwtService _jwtService;
    private readonly IConfiguration _configuration;

    public MagicLinkServiceTests()
    {
        _connection = new SqliteConnection("Filename=:memory:");
        _connection.Open();

        _dbContextOptions = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(_connection)
            .Options;

        // Ensure clean schema
        using (var context = new AppDbContext(_dbContextOptions))
        {
            context.Database.EnsureCreated();
        }

        _emailService = new MockEmailService();
        _jwtService = new MockJwtService();

        var myConfiguration = new Dictionary<string, string?>
        {
            {"Jwt:ExpiresInHours", "8"},
            {"Jwt:RememberMeExpiresInHours", "720"}
        };
        _configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(myConfiguration)
            .Build();
    }

    public void Dispose()
    {
        _connection.Close();
        _connection.Dispose();
    }

    private AppDbContext CreateDbContext() => new AppDbContext(_dbContextOptions);

    [Fact]
    public async Task RequestMagicLink_OnlyActiveClients_NoEmailForUnknownOrInactive()
    {
        // Arrange
        using var context = CreateDbContext();
        
        // Inactive client
        context.Clients.Add(new Client
        {
            ClientId = "CL-INACTIVE",
            Name = "Inactive Client",
            Email = "inactive@primexchanges.com",
            Status = "inactive"
        });
        await context.SaveChangesAsync();

        var service = new MagicLinkService(context, _emailService, _jwtService, _configuration, NullLogger<MagicLinkService>.Instance);

        // Act & Assert 1: Unknown email
        var res1 = await service.RequestMagicLinkAsync("unknown@primexchanges.com");
        Assert.True(res1.Success);
        Assert.Equal("If this email is registered, a sign-in code has been sent.", res1.Message);
        Assert.Empty(_emailService.SentMagicLinks);
        Assert.Equal(0, await context.MagicLinkTokens.CountAsync());

        // Act & Assert 2: Inactive client
        var res2 = await service.RequestMagicLinkAsync("inactive@primexchanges.com");
        Assert.True(res2.Success);
        Assert.Equal("If this email is registered, a sign-in code has been sent.", res2.Message);
        Assert.Empty(_emailService.SentMagicLinks);
        Assert.Equal(0, await context.MagicLinkTokens.CountAsync());
    }

    [Fact]
    public async Task RequestMagicLink_ActiveClient_SendsEmailAndCreatesToken()
    {
        // Arrange
        using var context = CreateDbContext();
        context.Clients.Add(new Client
        {
            ClientId = "CL-ACTIVE",
            Name = "James Whitfield",
            Email = "james@primexchanges.com",
            Status = "active"
        });
        await context.SaveChangesAsync();

        var service = new MagicLinkService(context, _emailService, _jwtService, _configuration, NullLogger<MagicLinkService>.Instance);

        // Act
        var res = await service.RequestMagicLinkAsync("james@primexchanges.com");

        // Assert
        Assert.True(res.Success);
        Assert.Equal("A sign-in code has been sent to your email.", res.Message);
        Assert.Single(_emailService.SentMagicLinks);
        Assert.Equal("james@primexchanges.com", _emailService.SentMagicLinks[0].Email);
        
        var tokenRecord = await context.MagicLinkTokens.SingleOrDefaultAsync();
        Assert.NotNull(tokenRecord);
        Assert.Equal("james@primexchanges.com", tokenRecord.Email);
        Assert.Null(tokenRecord.UsedAt);
    }

    [Fact]
    public async Task VerifyMagicLink_NewestValidCodeOnly()
    {
        // Arrange
        using var context = CreateDbContext();
        context.Clients.Add(new Client
        {
            ClientId = "CL-ACTIVE",
            Name = "James Whitfield",
            Email = "james@primexchanges.com",
            Status = "active"
        });
        await context.SaveChangesAsync();

        var service = new MagicLinkService(context, _emailService, _jwtService, _configuration, NullLogger<MagicLinkService>.Instance);

        // Request 1st code
        await service.RequestMagicLinkAsync("james@primexchanges.com");
        var firstCode = _emailService.SentMagicLinks[0].Code;

        // Request 2nd code (resend)
        await service.RequestMagicLinkAsync("james@primexchanges.com");
        var secondCode = _emailService.SentMagicLinks[1].Code;

        // Assert that two tokens exist, but first one is marked used (invalidated)
        var tokens = await context.MagicLinkTokens.ToListAsync();
        Assert.Equal(2, tokens.Count);
        Assert.NotNull(tokens[0].UsedAt); // First code invalidated
        Assert.Null(tokens[1].UsedAt);    // Second code is valid/unused

        // Act & Assert 1: Verifying first code fails
        var verifyFirst = await service.VerifyMagicLinkAsync("james@primexchanges.com", firstCode);
        Assert.False(verifyFirst.Success);
        Assert.Equal("Invalid or expired code.", verifyFirst.Error);

        // Act & Assert 2: Verifying second code succeeds
        var verifySecond = await service.VerifyMagicLinkAsync("james@primexchanges.com", secondCode);
        Assert.True(verifySecond.Success);
        Assert.Equal("CL-ACTIVE", verifySecond.ClientId);
    }

    [Fact]
    public async Task VerifyMagicLink_ExpirationBehavior()
    {
        // Arrange
        using var context = CreateDbContext();
        context.Clients.Add(new Client
        {
            ClientId = "CL-ACTIVE",
            Name = "James Whitfield",
            Email = "james@primexchanges.com",
            Status = "active"
        });
        await context.SaveChangesAsync();

        var service = new MagicLinkService(context, _emailService, _jwtService, _configuration, NullLogger<MagicLinkService>.Instance);

        await service.RequestMagicLinkAsync("james@primexchanges.com");
        var code = _emailService.SentMagicLinks[0].Code;

        // Manually age the token to make it expired
        var tokenRecord = await context.MagicLinkTokens.SingleAsync();
        tokenRecord.ExpiresAt = DateTime.UtcNow.AddMinutes(-5);
        await context.SaveChangesAsync();

        // Act
        var res = await service.VerifyMagicLinkAsync("james@primexchanges.com", code);

        // Assert
        Assert.False(res.Success);
        Assert.Equal("Invalid or expired code.", res.Error);
    }

    [Fact]
    public async Task VerifyMagicLink_CannotReuse()
    {
        // Arrange
        using var context = CreateDbContext();
        context.Clients.Add(new Client
        {
            ClientId = "CL-ACTIVE",
            Name = "James Whitfield",
            Email = "james@primexchanges.com",
            Status = "active"
        });
        await context.SaveChangesAsync();

        var service = new MagicLinkService(context, _emailService, _jwtService, _configuration, NullLogger<MagicLinkService>.Instance);

        await service.RequestMagicLinkAsync("james@primexchanges.com");
        var code = _emailService.SentMagicLinks[0].Code;

        // Act & Assert 1: First verification works
        var res1 = await service.VerifyMagicLinkAsync("james@primexchanges.com", code);
        Assert.True(res1.Success);

        // Act & Assert 2: Second verification fails (re-use)
        var res2 = await service.VerifyMagicLinkAsync("james@primexchanges.com", code);
        Assert.False(res2.Success);
        Assert.Equal("Invalid or expired code.", res2.Error);
    }
}

public class MockEmailService : IEmailService
{
    public List<(string Email, string Code)> SentMagicLinks { get; } = new();

    public Task SendMagicLinkAsync(string email, string code, int expiresInMinutes, CancellationToken cancellationToken = default)
    {
        SentMagicLinks.Add((email, code));
        return Task.CompletedTask;
    }

    public Task SendApplicationSubmittedAlertAsync(string reference, string applicantName, string applicantEmail, string country, string preferredManager, CancellationToken cancellationToken = default)
        => Task.CompletedTask;

    public Task SendClientInvitationAsync(string email, string applicantName, string reference, string invitationUrl, DateTime expiresAt, CancellationToken cancellationToken = default)
        => Task.CompletedTask;

    public Task SendDraftResumeCodeAsync(string email, string code, CancellationToken cancellationToken = default)
        => Task.CompletedTask;

    public Task SendValuationStatementReadyAsync(string email, string clientName, string dateString, CancellationToken cancellationToken = default)
        => Task.CompletedTask;

    public Task SendSupportMessageAlertAsync(string clientName, string clientId, string subject, string messageBody, CancellationToken cancellationToken = default)
        => Task.CompletedTask;
}

public class MockJwtService : IJwtService
{
    public string GenerateToken(string email, string clientId, string role, double expiresInHours = 8)
    {
        return $"mock-jwt-for-{clientId}";
    }

    public ClaimsPrincipal? ValidateToken(string token)
    {
        return null;
    }
}

using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PrimeExchanges.Api.Data;

namespace PrimeExchanges.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ManagersController : ControllerBase
{
    private readonly AppDbContext _dbContext;
    private readonly ILogger<ManagersController> _logger;

    public ManagersController(AppDbContext dbContext, ILogger<ManagersController> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }

    /// <summary>
    /// Returns the list of approved account managers.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<ManagerDto>>> GetManagers(CancellationToken cancellationToken)
    {
        var managers = await _dbContext.AccountManagers
            .AsNoTracking()
            .Where(m => m.Status != "inactive")
            .OrderBy(m => m.Name)
            .Select(m => new ManagerDto
            {
                Id = m.ManagerId,
                Name = m.Name,
                Title = m.Title,
                Email = m.Email,
                ActiveClients = m.ActiveClients,
                Capacity = m.Capacity,
                Status = m.Status,
            })
            .ToListAsync(cancellationToken);

        _logger.LogInformation("Returned {Count} account managers", managers.Count);
        return Ok(managers);
    }
}

public class ManagerDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public int ActiveClients { get; set; }
    public int Capacity { get; set; }
    public string Status { get; set; } = string.Empty;
}

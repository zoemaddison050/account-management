namespace PrimeExchanges.Api.Services;

public interface IEmailService
{
    Task SendMagicLinkAsync(string email, string code, int expiresInMinutes, CancellationToken cancellationToken = default);

    Task SendApplicationSubmittedAlertAsync(
        string reference,
        string applicantName,
        string applicantEmail,
        string country,
        string preferredManager,
        CancellationToken cancellationToken = default);

    Task SendClientInvitationAsync(
        string email,
        string applicantName,
        string reference,
        string invitationUrl,
        DateTime expiresAt,
        CancellationToken cancellationToken = default);

    Task SendDraftResumeCodeAsync(
        string email,
        string code,
        CancellationToken cancellationToken = default);
}

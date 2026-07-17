# Release V12 Deployment Notes

This document contains deployment details and technical notes for Release V12 of the PrimeExchanges Account Management Portal.

---

## 1. Staff Login Seeding & Role Consolidation
* **Issue Description:** The database cleanup of legacy staff logins and the assignment of the `Administrator` role to the primary support email (`support@primexchanges.com`) was not executing on the production server.
* **Root Cause Analysis:** `SeedData.cs` contained an early return `if (!isDevelopment) { return; }` at the top of the `InitializeAsync` method. In the production environment (`isDevelopment = false`), this caused the entire method to exit before reaching the staff user cleanup and role promotion logic.
* **Code Changes Applied:**
  - File: `server/PrimeExchanges.Api/Data/SeedData.cs`
    - Restructured the early return so that only the development-only SQLite migration call is gated behind `isDevelopment`. The staff user cleanup and role promotion logic now runs in all environments.
    - Demo data seeding (account managers, test clients) remains gated behind the `seedDemoData` flag, which defaults to `false` in production.
    - Removed the hardcoded fallback password. In production, the seeder will only create a new `support@primexchanges.com` account if `SeedData:DefaultStaffPassword` is explicitly configured in `appsettings.Production.json`.
    - Existing users are promoted to `Administrator` regardless of environment.

---

## 2. Client Application Approval Error (403 Forbidden)
* **Issue Description:** Attempting to approve client applications or change the application status to "Approved — activation pending" returned a `403 Forbidden` API error.
* **Root Cause Analysis:** `AdminController.cs` contains role-based restrictions that prevent `OperationsReviewer` accounts from performing approval transitions. Because the seeding code was blocked in production (see §1), `support@primexchanges.com` remained classified as `OperationsReviewer` in the database.
* **Code Changes Applied:**
  - Resolved by allowing `SeedData.cs` to run in production (§1), which promotes `support@primexchanges.com` to `Administrator` and purges legacy accounts (`requests@` and `accounts@`). The `Administrator` role satisfies the authorization requirements for all application state transitions, including approval.

---

## 3. PDF Preview Blocking ("Content Blocked")
* **Issue Description:** When viewing client applications on the admin dashboard, the PDF preview iframe displayed a "Content blocked" warning message.
* **Root Cause Analysis:** The security headers middleware in `Program.cs` was configured with `X-Frame-Options: DENY` and a `Content-Security-Policy` header containing `frame-ancestors 'none'`. This prevented the application from loading local `blob:` resource URLs inside an `iframe` element, even when the parent page was the application itself.
* **Code Changes Applied:**
  - File: `server/PrimeExchanges.Api/Program.cs`
    - Changed `X-Frame-Options` from `DENY` to `SAMEORIGIN` (allows same-origin framing only).
    - Updated the `Content-Security-Policy` header to allow same-origin framing and blob source loading:
      ```
      frame-src 'self' blob:; frame-ancestors 'self';
      ```
    - **Note:** This change is applied globally. The application's existing anti-CSRF token validation provides additional protection against clickjacking on state-changing actions.

---

## 4. Email Notification Formatting Fallbacks
* **Issue Description:** Received notification emails regarding new applications, support tickets, and valuation statements appeared as unformatted, plain text.
* **Root Cause Analysis:** In `EmailService.cs`, the sending routine defined `message.Body` as HTML and set `IsBodyHtml = true` but concurrently registered a single `text/plain` alternate view. In .NET, when `AlternateViews` is populated with only one view, many email clients ignore the main `Body` and fall back to displaying the text view.
* **Code Changes Applied:**
  - File: `server/PrimeExchanges.Api/Services/EmailService.cs`
    - Created a centralized HTML email template engine (`BuildHtmlBody`) styled with the PrimeXchanges brand colors (`#003c5f` navy, `#f97316` orange). All styles are fully inlined on each HTML element (no `<style>` block) to ensure rendering in Gmail, Outlook, Yahoo Mail, and other clients that strip embedded stylesheets.
    - Modified `SendAsync` to register both plain-text and HTML as separate `AlternateView` entries. A `message.Body = plainText` fallback is also set for older clients that ignore `AlternateViews`.
      ```csharp
      // Fallback body for older clients that ignore AlternateViews
      message.Body = plainText;
      message.BodyEncoding = Encoding.UTF8;
      message.IsBodyHtml = false;

      // Add both plain text and HTML alternate views to support all modern email clients
      var plainTextView = AlternateView.CreateAlternateViewFromString(plainText, Encoding.UTF8, "text/plain");
      message.AlternateViews.Add(plainTextView);

      var htmlTextView = AlternateView.CreateAlternateViewFromString(html, Encoding.UTF8, "text/html");
      message.AlternateViews.Add(htmlTextView);
      ```

---

## Additional Hardening & Fixes (Post-V12-Review)

The following items were identified during a post-implementation review and have been addressed before the V12 deployment.

### 5. Support Message Hardening
* **Issue Description:** The client support-message endpoint lacked input length limits, rate limiting, and a database index.
* **Code Changes Applied:**
  - File: `server/PrimeExchanges.Api/Models/SupportMessage.cs`
    - Added `[MaxLength(4000)]` to `MessageBody`.
  - File: `server/PrimeExchanges.Api/Controllers/ClientsController.cs`
    - Added `[MaxLength(4000)]` to `CreateSupportMessageRequest.MessageBody`.
    - Applied `[EnableRateLimiting("support-message")]` to the `POST api/clients/me/messages` endpoint.
  - File: `server/PrimeExchanges.Api/Data/AppDbContext.cs`
    - Added indexes on `SupportMessage.ClientId` and `SupportMessage.SentAt`.
  - File: `server/PrimeExchanges.Api/Program.cs`
    - Registered a new `support-message` rate-limiting policy (3 messages per hour per IP).

### 6. Currency Conversion Reliability
* **Issue Description:** The valuation-statement PDF generator created a new `HttpClient` per request, had no caching, and used incorrect currency symbols for AUD/CAD.
* **Code Changes Applied:**
  - File: `server/PrimeExchanges.Api/Controllers/ClientsController.cs`
    - Replaced `new HttpClient()` with `IHttpClientFactory.CreateClient("fx")`.
    - Added a 5-minute in-memory cache for exchange rates via `IMemoryCache`.
    - Added correct symbols for `AUD` (`A$`) and `CAD` (`C$`).
  - File: `server/PrimeExchanges.Api/Program.cs`
    - Registered the `fx` HTTP client and `IMemoryCache`.

### 7. Rate-Limiting IP Extraction
* **Issue Description:** Rate limiting used the raw `X-Forwarded-For` header value as the partition key, which breaks behind proxies because the header can contain multiple comma-separated IPs.
* **Code Changes Applied:**
  - File: `server/PrimeExchanges.Api/Program.cs`
    - Added a `GetClientIp` helper that parses `X-Forwarded-For` and returns the left-most (original client) IP, falling back to `RemoteIpAddress`.
    - Updated all rate-limiting policies to use `GetClientIp`.

### 8. Valuation Statement Email Throttling
* **Issue Description:** Updating a client's portfolio data repeatedly sent a "valuation statement ready" email on every save, risking client spam.
* **Code Changes Applied:**
  - File: `server/PrimeExchanges.Api/Controllers/AdminController.cs`
    - Throttled the email to at most one per 24-hour window per client by checking `PortfolioLastUpdated` before sending.

### 9. SupportMessages Schema via EF Migration
* **Issue Description:** The `SupportMessages` table was created via raw SQL in startup code instead of a versioned EF migration.
* **Code Changes Applied:**
  - Added migration `20260717070138_AddSupportMessages` with the `SupportMessages` table and indexes.
  - Removed the raw SQL `CREATE TABLE` blocks from `ApplyDynamicClientColumnsAsync` in `Program.cs`.

### 10. Target Framework Downgrade
* **Issue Description:** The backend was downgraded from .NET 10 to .NET 9 to align with the current hosting environment/runtime availability.
* **Code Changes Applied:**
  - File: `server/PrimeExchanges.Api/PrimeExchanges.Api.csproj`
    - `<TargetFramework>` changed from `net10.0` to `net9.0`.
    - `Microsoft.AspNetCore.OpenApi` downgraded from `10.0.0` to `9.0.2`.
  - **Deployment Note:** Ensure the target host has the .NET 9 runtime installed. The published output targets `net9.0`.

---

## Post-Deployment Checklist

To safely roll out Release V12 to the MonsterASP host:

1. **Back up the production database** before proceeding with any deployment steps.
2. **Build the frontend**:
   ```bash
   npm run build
   ```
   This compiles TypeScript and produces the static SPA output into `server/PrimeExchanges.Api/wwwroot/`.
3. **Build and publish the backend**:
   ```bash
   dotnet publish server/PrimeExchanges.Api/PrimeExchanges.Api.csproj -c Release -o ./publish
   ```
4. **File maintenance on MonsterASP**:
   - Access the server files via FTP or the control panel file explorer.
   - Delete all current contents of the target directory containing the old application files.
   - **Important**: Preserve the existing `appsettings.Production.json` — it contains production database credentials and SMTP configuration.
   - **Important**: Ensure `SeedData:DefaultStaffPassword` is set in `appsettings.Production.json` so the `support@primexchanges.com` account can be created on first run if it does not already exist.
5. **Upload & Extract**: Upload the `./publish` output archive and extract its contents to the target directory.
6. **App service restart**: Restart the web app service within the MonsterASP dashboard. On initial reboot:
   - Database migrations will apply via `MigrateAsync()`.
   - Seed data processes will execute to clean up legacy staff rows and promote `support@primexchanges.com` to `Administrator`.
7. **Verify migration success**: Check the application logs after restart to confirm that no migration or startup errors were logged. Access the staff login page and verify that `support@primexchanges.com` authenticates with the `Administrator` role.

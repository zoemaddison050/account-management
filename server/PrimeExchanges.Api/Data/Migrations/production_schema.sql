IF OBJECT_ID(N'[__EFMigrationsHistory]') IS NULL
BEGIN
    CREATE TABLE [__EFMigrationsHistory] (
        [MigrationId] nvarchar(150) NOT NULL,
        [ProductVersion] nvarchar(32) NOT NULL,
        CONSTRAINT [PK___EFMigrationsHistory] PRIMARY KEY ([MigrationId])
    );
END;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260713130007_InitialCreate'
)
BEGIN
    CREATE TABLE [AccountManagers] (
        [Id] int NOT NULL IDENTITY,
        [ManagerId] nvarchar(50) NOT NULL,
        [Name] nvarchar(200) NOT NULL,
        [Title] nvarchar(200) NOT NULL,
        [Email] nvarchar(256) NOT NULL,
        [ActiveClients] int NOT NULL,
        [Capacity] int NOT NULL,
        [Status] nvarchar(50) NOT NULL,
        CONSTRAINT [PK_AccountManagers] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260713130007_InitialCreate'
)
BEGIN
    CREATE TABLE [Applications] (
        [Id] int NOT NULL IDENTITY,
        [ApplicationId] nvarchar(50) NOT NULL,
        [Reference] nvarchar(50) NOT NULL,
        [ApplicantName] nvarchar(200) NOT NULL,
        [Email] nvarchar(256) NOT NULL,
        [Country] nvarchar(100) NOT NULL,
        [Status] nvarchar(100) NOT NULL,
        [AssignedReviewer] nvarchar(200) NOT NULL,
        [SubmittedAt] datetime2 NOT NULL,
        [LastUpdated] datetime2 NOT NULL,
        [Route] nvarchar(50) NOT NULL,
        CONSTRAINT [PK_Applications] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260713130007_InitialCreate'
)
BEGIN
    CREATE TABLE [AuditEvents] (
        [Id] int NOT NULL IDENTITY,
        [AuditEventId] nvarchar(50) NOT NULL,
        [Actor] nvarchar(200) NOT NULL,
        [Action] nvarchar(200) NOT NULL,
        [Target] nvarchar(500) NOT NULL,
        [Timestamp] datetime2 NOT NULL,
        [Reason] nvarchar(500) NULL,
        [Severity] nvarchar(50) NOT NULL,
        CONSTRAINT [PK_AuditEvents] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260713130007_InitialCreate'
)
BEGIN
    CREATE TABLE [Clients] (
        [Id] int NOT NULL IDENTITY,
        [ClientId] nvarchar(50) NOT NULL,
        [Name] nvarchar(200) NOT NULL,
        [Email] nvarchar(256) NOT NULL,
        [ManagerId] nvarchar(50) NULL,
        [ManagerName] nvarchar(200) NULL,
        [Since] datetime2 NOT NULL,
        [Status] nvarchar(50) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_Clients] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260713130007_InitialCreate'
)
BEGIN
    CREATE TABLE [MagicLinkTokens] (
        [Id] int NOT NULL IDENTITY,
        [Email] nvarchar(256) NOT NULL,
        [TokenHash] nvarchar(256) NOT NULL,
        [ExpiresAt] datetime2 NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UsedAt] datetime2 NULL,
        CONSTRAINT [PK_MagicLinkTokens] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260713130007_InitialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_AccountManagers_Email] ON [AccountManagers] ([Email]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260713130007_InitialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_AccountManagers_ManagerId] ON [AccountManagers] ([ManagerId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260713130007_InitialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Applications_ApplicationId] ON [Applications] ([ApplicationId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260713130007_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_Applications_Email] ON [Applications] ([Email]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260713130007_InitialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Applications_Reference] ON [Applications] ([Reference]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260713130007_InitialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_AuditEvents_AuditEventId] ON [AuditEvents] ([AuditEventId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260713130007_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_AuditEvents_Timestamp] ON [AuditEvents] ([Timestamp]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260713130007_InitialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Clients_ClientId] ON [Clients] ([ClientId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260713130007_InitialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Clients_Email] ON [Clients] ([Email]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260713130007_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_MagicLinkTokens_Email] ON [MagicLinkTokens] ([Email]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260713130007_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_MagicLinkTokens_ExpiresAt] ON [MagicLinkTokens] ([ExpiresAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260713130007_InitialCreate'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260713130007_InitialCreate', N'9.0.7');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260713162253_AddSecurityModels'
)
BEGIN
    DECLARE @var sysname;
    SELECT @var = [d].[name]
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[AuditEvents]') AND [c].[name] = N'Actor');
    IF @var IS NOT NULL EXEC(N'ALTER TABLE [AuditEvents] DROP CONSTRAINT [' + @var + '];');
    ALTER TABLE [AuditEvents] DROP COLUMN [Actor];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260713162253_AddSecurityModels'
)
BEGIN
    DECLARE @var1 sysname;
    SELECT @var1 = [d].[name]
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[AuditEvents]') AND [c].[name] = N'Severity');
    IF @var1 IS NOT NULL EXEC(N'ALTER TABLE [AuditEvents] DROP CONSTRAINT [' + @var1 + '];');
    ALTER TABLE [AuditEvents] DROP COLUMN [Severity];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260713162253_AddSecurityModels'
)
BEGIN
    DECLARE @var2 sysname;
    SELECT @var2 = [d].[name]
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[AuditEvents]') AND [c].[name] = N'Target');
    IF @var2 IS NOT NULL EXEC(N'ALTER TABLE [AuditEvents] DROP CONSTRAINT [' + @var2 + '];');
    ALTER TABLE [AuditEvents] DROP COLUMN [Target];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260713162253_AddSecurityModels'
)
BEGIN
    DECLARE @var3 sysname;
    SELECT @var3 = [d].[name]
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[AuditEvents]') AND [c].[name] = N'Reason');
    IF @var3 IS NOT NULL EXEC(N'ALTER TABLE [AuditEvents] DROP CONSTRAINT [' + @var3 + '];');
    ALTER TABLE [AuditEvents] ALTER COLUMN [Reason] nvarchar(1000) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260713162253_AddSecurityModels'
)
BEGIN
    DECLARE @var4 sysname;
    SELECT @var4 = [d].[name]
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[AuditEvents]') AND [c].[name] = N'Action');
    IF @var4 IS NOT NULL EXEC(N'ALTER TABLE [AuditEvents] DROP CONSTRAINT [' + @var4 + '];');
    ALTER TABLE [AuditEvents] ALTER COLUMN [Action] nvarchar(100) NOT NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260713162253_AddSecurityModels'
)
BEGIN
    ALTER TABLE [AuditEvents] ADD [ActorId] nvarchar(100) NOT NULL DEFAULT N'';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260713162253_AddSecurityModels'
)
BEGIN
    ALTER TABLE [AuditEvents] ADD [ActorName] nvarchar(200) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260713162253_AddSecurityModels'
)
BEGIN
    ALTER TABLE [AuditEvents] ADD [After] nvarchar(2000) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260713162253_AddSecurityModels'
)
BEGIN
    ALTER TABLE [AuditEvents] ADD [Before] nvarchar(2000) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260713162253_AddSecurityModels'
)
BEGIN
    ALTER TABLE [AuditEvents] ADD [EntityId] nvarchar(100) NOT NULL DEFAULT N'';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260713162253_AddSecurityModels'
)
BEGIN
    ALTER TABLE [AuditEvents] ADD [EntityType] nvarchar(100) NOT NULL DEFAULT N'';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260713162253_AddSecurityModels'
)
BEGIN
    CREATE TABLE [ConsentRecords] (
        [Id] int NOT NULL IDENTITY,
        [ApplicationId] nvarchar(50) NOT NULL,
        [PolicyVersion] nvarchar(50) NOT NULL,
        [Email] nvarchar(256) NOT NULL,
        [IpAddress] nvarchar(45) NULL,
        [ConsentedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_ConsentRecords] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260713162253_AddSecurityModels'
)
BEGIN
    CREATE TABLE [Invitations] (
        [Id] int NOT NULL IDENTITY,
        [InvitationId] nvarchar(50) NOT NULL,
        [TokenHash] nvarchar(256) NOT NULL,
        [Email] nvarchar(256) NOT NULL,
        [ApplicationId] nvarchar(50) NOT NULL,
        [IssuedByUserId] nvarchar(50) NOT NULL,
        [IssuedAt] datetime2 NOT NULL,
        [ExpiresAt] datetime2 NOT NULL,
        [AcceptedAt] datetime2 NULL,
        [RevokedAt] datetime2 NULL,
        CONSTRAINT [PK_Invitations] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260713162253_AddSecurityModels'
)
BEGIN
    CREATE TABLE [PdfGrants] (
        [Id] int NOT NULL IDENTITY,
        [TokenHash] nvarchar(256) NOT NULL,
        [ApplicationId] nvarchar(50) NOT NULL,
        [ApplicantEmail] nvarchar(256) NOT NULL,
        [IssuedAt] datetime2 NOT NULL,
        [ExpiresAt] datetime2 NOT NULL,
        [UsedAt] datetime2 NULL,
        CONSTRAINT [PK_PdfGrants] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260713162253_AddSecurityModels'
)
BEGIN
    CREATE TABLE [StaffUsers] (
        [Id] int NOT NULL IDENTITY,
        [UserId] nvarchar(50) NOT NULL,
        [Name] nvarchar(200) NOT NULL,
        [Email] nvarchar(256) NOT NULL,
        [PasswordHash] nvarchar(512) NOT NULL,
        [Role] nvarchar(50) NOT NULL,
        [MfaEnabled] bit NOT NULL,
        [TotpSecret] nvarchar(512) NULL,
        [Status] nvarchar(50) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [LastLoginAt] datetime2 NULL,
        CONSTRAINT [PK_StaffUsers] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260713162253_AddSecurityModels'
)
BEGIN
    CREATE INDEX [IX_ConsentRecords_ApplicationId] ON [ConsentRecords] ([ApplicationId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260713162253_AddSecurityModels'
)
BEGIN
    CREATE INDEX [IX_ConsentRecords_Email] ON [ConsentRecords] ([Email]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260713162253_AddSecurityModels'
)
BEGIN
    CREATE INDEX [IX_Invitations_Email] ON [Invitations] ([Email]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260713162253_AddSecurityModels'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Invitations_InvitationId] ON [Invitations] ([InvitationId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260713162253_AddSecurityModels'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Invitations_TokenHash] ON [Invitations] ([TokenHash]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260713162253_AddSecurityModels'
)
BEGIN
    CREATE INDEX [IX_PdfGrants_ApplicationId] ON [PdfGrants] ([ApplicationId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260713162253_AddSecurityModels'
)
BEGIN
    CREATE UNIQUE INDEX [IX_PdfGrants_TokenHash] ON [PdfGrants] ([TokenHash]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260713162253_AddSecurityModels'
)
BEGIN
    CREATE UNIQUE INDEX [IX_StaffUsers_Email] ON [StaffUsers] ([Email]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260713162253_AddSecurityModels'
)
BEGIN
    CREATE UNIQUE INDEX [IX_StaffUsers_UserId] ON [StaffUsers] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260713162253_AddSecurityModels'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260713162253_AddSecurityModels', N'9.0.7');
END;

COMMIT;
GO


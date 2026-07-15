using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PrimeExchanges.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddApplicationDrafts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AssignedManagerId",
                table: "Applications",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ApplicationDrafts",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Email = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    DraftDataJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    VerificationCode = table.Column<string>(type: "nvarchar(6)", maxLength: 6, nullable: true),
                    VerificationCodeExpiresAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastSavedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ApplicationDrafts", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ApplicationDrafts_Email",
                table: "ApplicationDrafts",
                column: "Email",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ApplicationDrafts");

            migrationBuilder.DropColumn(
                name: "AssignedManagerId",
                table: "Applications");
        }
    }
}

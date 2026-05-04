using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InteractHub.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AdminModerationUpdate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "LastEscalatedAt",
                table: "PostReportSummaries",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "LastReviewDecision",
                table: "PostReportSummaries",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "LastReviewedByAdminId",
                table: "PostReportSummaries",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ReportsSinceLastReview",
                table: "PostReportSummaries",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "ReviewerNote",
                table: "PostReportSummaries",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ResolutionMessage",
                table: "PostReports",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReviewNote",
                table: "PostReports",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ReviewedAt",
                table: "PostReports",
                type: "datetime2",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "LastEscalatedAt",
                table: "PostReportSummaries");

            migrationBuilder.DropColumn(
                name: "LastReviewDecision",
                table: "PostReportSummaries");

            migrationBuilder.DropColumn(
                name: "LastReviewedByAdminId",
                table: "PostReportSummaries");

            migrationBuilder.DropColumn(
                name: "ReportsSinceLastReview",
                table: "PostReportSummaries");

            migrationBuilder.DropColumn(
                name: "ReviewerNote",
                table: "PostReportSummaries");

            migrationBuilder.DropColumn(
                name: "ResolutionMessage",
                table: "PostReports");

            migrationBuilder.DropColumn(
                name: "ReviewNote",
                table: "PostReports");

            migrationBuilder.DropColumn(
                name: "ReviewedAt",
                table: "PostReports");
        }
    }
}

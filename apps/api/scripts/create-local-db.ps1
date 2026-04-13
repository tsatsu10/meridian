# Purpose: Create the local `kaneo` database on Windows PostgreSQL (no Docker).
# Prerequisites: PostgreSQL installed; service running; you know the postgres user password.
# Usage (from apps/api): .\scripts\create-local-db.ps1
# Outputs: Runs CREATE DATABASE kaneo; (fails harmlessly if it already exists).

$ErrorActionPreference = "Stop"
$Psql = "C:\Program Files\PostgreSQL\18\bin\psql.exe"
if (-not (Test-Path $Psql)) {
  $Psql = "psql"
}

Write-Host "Creating database 'kaneo' (enter password for user 'postgres' if prompted)..."
& $Psql -U postgres -h localhost -p 5432 -d postgres -c "CREATE DATABASE kaneo;"
Write-Host "Done. If you see 'already exists', the database is ready."

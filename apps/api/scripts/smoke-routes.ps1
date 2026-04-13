# Quick HTTP smoke: mounted routes return non-404 (401/400/500 still mean "exists").
# Usage: .\scripts\smoke-routes.ps1 [-BaseUrl http://127.0.0.1:3005]
param([string]$BaseUrl = 'http://127.0.0.1:3005')

function Invoke-Smoke {
    param([string]$Name, [string]$Method, [string]$Path, [string]$Body = $null)
    $uri = $BaseUrl.TrimEnd('/') + $Path
    try {
        if ($Method -eq 'GET') {
            $r = Invoke-WebRequest -Uri $uri -Method GET -UseBasicParsing -TimeoutSec 8
            Write-Host "OK   $Name  $($r.StatusCode)"
        } else {
            $b = if ($Body) { $Body } else { '{}' }
            $r = Invoke-WebRequest -Uri $uri -Method POST -Body $b -ContentType 'application/json' -UseBasicParsing -TimeoutSec 8
            Write-Host "OK   $Name  $($r.StatusCode)"
        }
    } catch {
        $resp = $_.Exception.Response
        if ($resp) {
            $code = [int]$resp.StatusCode
            Write-Host "HIT  $Name  HTTP $code"
        } else {
            Write-Host "FAIL $Name  $($_.Exception.Message)"
        }
    }
}

Write-Host "--- Smoke $BaseUrl ---"
Invoke-Smoke 'health' 'GET' '/api/health'
Invoke-Smoke 'whiteboard' 'GET' '/api/whiteboard/smoke-test-id'
Invoke-Smoke 'video rooms' 'POST' '/api/video/rooms' '{}'
$errBody = '{"error":{"message":"x"},"timestamp":"2026-01-01T00:00:00Z","userAgent":"smoke","url":"http://localhost"}'
Invoke-Smoke 'errors' 'POST' '/api/errors' $errBody
Invoke-Smoke 'auth verify-email' 'GET' '/api/auth/verify-email?token=x'
Invoke-Smoke 'messages alias' 'GET' '/api/messages'
Invoke-Smoke 'billing checkout' 'POST' '/api/billing/checkout' '{}'

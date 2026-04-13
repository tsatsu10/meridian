# PowerShell script to replace console statements with proper logger
# Run from project root: .\scripts\clean-console.ps1

Write-Host "🧹 Starting console.log cleanup..." -ForegroundColor Cyan

$apiSrcDir = Join-Path $PSScriptRoot "..\apps\api\src"
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupDir = Join-Path $PSScriptRoot "..\apps\api" "src-backup-$timestamp"

# Create backup
Write-Host "📦 Creating backup..." -ForegroundColor Yellow
try {
    Copy-Item -Path $apiSrcDir -Destination $backupDir -Recurse -Force
    Write-Host "✅ Backup created: $backupDir" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Could not create backup: $_" -ForegroundColor Yellow
    Write-Host "   Please backup manually before proceeding." -ForegroundColor Yellow
    exit 1
}

# Find all TypeScript files
Write-Host "`n🔍 Finding TypeScript files..." -ForegroundColor Cyan
$files = Get-ChildItem -Path $apiSrcDir -Filter "*.ts" -Recurse | 
    Where-Object { -not $_.FullName.Contains("node_modules") -and -not $_.FullName.Contains("dist") -and -not $_.FullName.EndsWith(".d.ts") }

Write-Host "   Found $($files.Count) TypeScript files" -ForegroundColor Blue

# Count before
Write-Host "`n📊 Counting console statements before..." -ForegroundColor Cyan
$beforeCount = @{ log = 0; error = 0; warn = 0; info = 0 }
foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $beforeCount.log += ([regex]::Matches($content, "console\.log\(")).Count
    $beforeCount.error += ([regex]::Matches($content, "console\.error\(")).Count
    $beforeCount.warn += ([regex]::Matches($content, "console\.warn\(")).Count
    $beforeCount.info += ([regex]::Matches($content, "console\.info\(")).Count
}

$totalBefore = $beforeCount.log + $beforeCount.error + $beforeCount.warn + $beforeCount.info
Write-Host "   Before: $($beforeCount.log) console.log, $($beforeCount.error) console.error, $($beforeCount.warn) console.warn, $($beforeCount.info) console.info" -ForegroundColor Yellow
Write-Host "   Total: $totalBefore console statements" -ForegroundColor Yellow

# Helper function to get relative logger import
function Get-RelativeLoggerImport {
    param($filePath, $srcDir)
    
    $relativePath = $filePath.Replace($srcDir, "").TrimStart("\")
    $depth = ($relativePath.Split("\") | Measure-Object).Count - 1
    
    if ($depth -eq 0) { return "import logger from './utils/logger';" }
    if ($depth -eq 1) { return "import logger from '../utils/logger';" }
    if ($depth -eq 2) { return "import logger from '../../utils/logger';" }
    if ($depth -eq 3) { return "import logger from '../../../utils/logger';" }
    return "import logger from '../../../../utils/logger';"
}

# Helper function to check if logger is imported
function Has-LoggerImport {
    param($content)
    
    return $content -match "import logger from" -or 
           $content -match "from ['`"].*utils/logger['`"]"
}

# Helper function to add logger import
function Add-LoggerImport {
    param($content, $filePath, $srcDir)
    
    $import = Get-RelativeLoggerImport $filePath $srcDir
    
    # Find last import
    $importPattern = "(?m)^import\s+.*?from\s+['`"].*?['`"];?\s*$"
    $matches = [regex]::Matches($content, $importPattern)
    
    if ($matches.Count -eq 0) {
        # No imports, add at top
        return "$import`n`n$content"
    }
    
    # Add after last import
    $lastMatch = $matches[$matches.Count - 1]
    $insertPos = $lastMatch.Index + $lastMatch.Length
    return $content.Substring(0, $insertPos) + "`n" + $import + $content.Substring($insertPos)
}

# Process files
Write-Host "`n🔄 Processing files..." -ForegroundColor Cyan
$processedFiles = 0
$totalReplaced = 0
$importsAdded = 0
$errors = @()

foreach ($file in $files) {
    try {
        $content = Get-Content $file.FullName -Raw
        $originalContent = $content
        $fileChanges = 0
        $addedImport = $false
        
        # Skip if no console statements
        if (-not ($content -match "console\.(log|error|warn|info)\(")) {
            continue
        }
        
        # Replace console statements
        $content = $content -replace "console\.log\(", "logger.debug("
        $content = $content -replace "console\.error\(", "logger.error("
        $content = $content -replace "console\.warn\(", "logger.warn("
        $content = $content -replace "console\.info\(", "logger.info("
        
        # Count replacements
        $fileChanges += ([regex]::Matches($originalContent, "console\.log\(")).Count
        $fileChanges += ([regex]::Matches($originalContent, "console\.error\(")).Count
        $fileChanges += ([regex]::Matches($originalContent, "console\.warn\(")).Count
        $fileChanges += ([regex]::Matches($originalContent, "console\.info\(")).Count
        
        # Add logger import if needed
        if (-not (Has-LoggerImport $content)) {
            $content = Add-LoggerImport $content $file.FullName $apiSrcDir
            $addedImport = $true
        }
        
        # Write back if changed
        if ($content -ne $originalContent) {
            Set-Content -Path $file.FullName -Value $content -NoNewline
            $processedFiles++
            $totalReplaced += $fileChanges
            if ($addedImport) { $importsAdded++ }
        }
        
        if ($processedFiles % 50 -eq 0) {
            Write-Host "   Processed $processedFiles files..." -ForegroundColor Blue
        }
    } catch {
        $errors += @{ file = $file.Name; error = $_.Exception.Message }
        Write-Host "   ❌ Error processing $($file.Name): $_" -ForegroundColor Red
    }
}

# Count after
Write-Host "`n📊 Counting console statements after..." -ForegroundColor Cyan
$afterCount = @{ log = 0; error = 0; warn = 0; info = 0 }
foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $afterCount.log += ([regex]::Matches($content, "console\.log\(")).Count
    $afterCount.error += ([regex]::Matches($content, "console\.error\(")).Count
    $afterCount.warn += ([regex]::Matches($content, "console\.warn\(")).Count
    $afterCount.info += ([regex]::Matches($content, "console\.info\(")).Count
}

$totalAfter = $afterCount.log + $afterCount.error + $afterCount.warn + $afterCount.info
Write-Host "   After: $($afterCount.log) console.log, $($afterCount.error) console.error, $($afterCount.warn) console.warn, $($afterCount.info) console.info" -ForegroundColor Yellow
Write-Host "   Total: $totalAfter console statements remaining" -ForegroundColor $(if ($totalAfter -eq 0) { "Green" } else { "Yellow" })

# Summary
Write-Host "`n✅ Cleanup complete!" -ForegroundColor Green
Write-Host "`n📊 Summary:" -ForegroundColor Cyan
Write-Host "   Files processed: $processedFiles" -ForegroundColor Blue
Write-Host "   Console statements replaced: $totalReplaced" -ForegroundColor Green
Write-Host "   Logger imports added: $importsAdded" -ForegroundColor Green
Write-Host "   Remaining console statements: $totalAfter" -ForegroundColor $(if ($totalAfter -eq 0) { "Green" } else { "Yellow" })

if ($errors.Count -gt 0) {
    Write-Host "`n⚠️  Errors encountered: $($errors.Count)" -ForegroundColor Yellow
    foreach ($err in $errors) {
        Write-Host "   $($err.file): $($err.error)" -ForegroundColor Red
    }
}

Write-Host "`n⚠️  WARNING: Review changes before committing!" -ForegroundColor Yellow
Write-Host "   Some console statements might be intentional (e.g., in tests)" -ForegroundColor Yellow
Write-Host "   Backup location: $backupDir" -ForegroundColor Blue
Write-Host "`n📝 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Review changes: git diff apps/api/src" -ForegroundColor Blue
Write-Host "   2. Run tests: npm run test" -ForegroundColor Blue
Write-Host "   3. Check TypeScript: npm run lint" -ForegroundColor Blue
Write-Host "   4. Commit: git add . && git commit -m 'refactor: replace console with logger'" -ForegroundColor Blue
Write-Host ""



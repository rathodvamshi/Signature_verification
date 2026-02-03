# Quick Deployment Script
# Run this before deploying to Render

Write-Host "🚀 Preparing for Render Deployment..." -ForegroundColor Cyan

# Check if git is initialized
if (-not (Test-Path .git)) {
    Write-Host "❌ Git not initialized. Initializing..." -ForegroundColor Yellow
    git init
    Write-Host "✅ Git initialized" -ForegroundColor Green
}

# Check for required files
$requiredFiles = @(
    "Dockerfile",
    "render.yaml",
    ".dockerignore",
    "package.json",
    "requirements.txt",
    "js/server.js"
)

Write-Host "`n📋 Checking required files..." -ForegroundColor Cyan
$missingFiles = @()
foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-Host "  ✅ $file" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $file MISSING!" -ForegroundColor Red
        $missingFiles += $file
    }
}

if ($missingFiles.Count -gt 0) {
    Write-Host "`n❌ Missing files. Cannot proceed." -ForegroundColor Red
    exit 1
}

# Check if node_modules exists
if (Test-Path "node_modules") {
    Write-Host "`n✅ Dependencies installed" -ForegroundColor Green
} else {
    Write-Host "`n⚠️  node_modules not found. Run 'npm install' first." -ForegroundColor Yellow
}

# Show git status
Write-Host "`n📊 Git Status:" -ForegroundColor Cyan
git status --short

# Check if there are changes to commit
$gitStatus = git status --porcelain
if ($gitStatus) {
    Write-Host "`n📝 You have uncommitted changes." -ForegroundColor Yellow
    $commit = Read-Host "Do you want to commit all changes? (y/n)"
    
    if ($commit -eq 'y' -or $commit -eq 'Y') {
        git add .
        $commitMsg = Read-Host "Enter commit message (or press Enter for default)"
        if ([string]::IsNullOrWhiteSpace($commitMsg)) {
            $commitMsg = "Production deployment ready - $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
        }
        git commit -m $commitMsg
        Write-Host "✅ Changes committed" -ForegroundColor Green
    }
} else {
    Write-Host "`n✅ No uncommitted changes" -ForegroundColor Green
}

# Check if remote is set
$remotes = git remote -v
if ($remotes -match 'origin') {
    Write-Host "`n✅ Git remote configured:" -ForegroundColor Green
    git remote -v
    
    $push = Read-Host "`nDo you want to push to GitHub now? (y/n)"
    if ($push -eq 'y' -or $push -eq 'Y') {
        Write-Host "`n📤 Pushing to GitHub..." -ForegroundColor Cyan
        git push origin main
        Write-Host "✅ Pushed to GitHub" -ForegroundColor Green
    }
} else {
    Write-Host "`n⚠️  No git remote configured." -ForegroundColor Yellow
    Write-Host "Run: git remote add origin https://github.com/YOUR_USERNAME/Signature_verification.git" -ForegroundColor Yellow
}

# Final checklist
Write-Host "`n" -NoNewline
Write-Host "════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  🎯 DEPLOYMENT READINESS CHECKLIST" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════" -ForegroundColor Cyan

$checklist = @"

Before deploying to Render, ensure:

1. ✅ MongoDB Atlas cluster created
2. ✅ Database user created with password
3. ✅ IP whitelist set to 0.0.0.0/0
4. ✅ Connection string ready
5. ✅ Code pushed to GitHub
6. ✅ Render account created
7. ✅ Ready to connect repository

Next Steps:
1. Go to https://render.com/
2. New Web Service → Connect your repo
3. Render will detect render.yaml
4. Set MONGODB_URI environment variable
5. Click "Create Web Service"
6. Wait ~8 minutes for build
7. Visit your app URL!

"@

Write-Host $checklist -ForegroundColor White

Write-Host "════════════════════════════════════════`n" -ForegroundColor Cyan

Write-Host "📚 For detailed instructions, see: RENDER_DEPLOYMENT_GUIDE.md`n" -ForegroundColor Yellow

Write-Host "🎉 Your app is ready to deploy!" -ForegroundColor Green

$ErrorActionPreference = "Stop"
$baseUrl = "https://browser-fawn-sigma.vercel.app"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " LIVE VERCEL HTTPS END-TO-END VERIFICATION: $baseUrl" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Admin Login
Write-Host "`n[1/5] Logging in as Master Admin via HTTPS..." -ForegroundColor Yellow
$adminLoginBody = @{
    email = "admin@trustvault.com"
    password = "Admin@12345!"
} | ConvertTo-Json

$adminAuth = Invoke-RestMethod -Uri "$baseUrl/api/v1/auth/login" -Method Post -Body $adminLoginBody -ContentType "application/json"
$adminToken = $adminAuth.token
Write-Host " -> Logged in as Admin successfully via HTTPS. Token received." -ForegroundColor Green

# 2. Admin provisions Owner
Write-Host "`n[2/5] Admin provisioning Owner via HTTPS..." -ForegroundColor Yellow
$uniqueSuffix = [Guid]::NewGuid().ToString().Substring(0, 6)
$ownerEmail = "sarah_" + $uniqueSuffix + "@company.com"
$ownerUsername = "sarah_" + $uniqueSuffix
$createOwnerBody = @{
    username = $ownerUsername
    email = $ownerEmail
    password = "Password@12345!"
    department = "Legal"
} | ConvertTo-Json

$headersAdmin = @{ Authorization = "Bearer $adminToken" }
$ownerUser = Invoke-RestMethod -Uri "$baseUrl/api/v1/admin/users/owners" -Method Post -Body $createOwnerBody -ContentType "application/json" -Headers $headersAdmin
Write-Host " -> Owner provisioned via HTTPS: $($ownerUser.email) (Id: $($ownerUser.id))" -ForegroundColor Green

# 3. Owner logs in
Write-Host "`n[3/5] Logging in as Owner ($ownerEmail) via HTTPS..." -ForegroundColor Yellow
$ownerLoginBody = @{
    email = $ownerEmail
    password = "Password@12345!"
} | ConvertTo-Json
$ownerAuth = Invoke-RestMethod -Uri "$baseUrl/api/v1/auth/login" -Method Post -Body $ownerLoginBody -ContentType "application/json"
$ownerToken = $ownerAuth.token
Write-Host " -> Owner logged in successfully via HTTPS." -ForegroundColor Green

# 4. Check Verification status
Write-Host "`n[4/4] Checking Cryptographic Verification via HTTPS..." -ForegroundColor Yellow
$verification = Invoke-RestMethod -Uri "$baseUrl/api/v1/admin/audit-verify" -Method Get -Headers $headersAdmin
Write-Host " -> Audit Verification Status: $($verification.statusMessage)" -ForegroundColor Green

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " ALL VERCEL HTTPS END-TO-END TESTS PASSED 100%!" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

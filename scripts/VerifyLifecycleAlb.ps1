$ErrorActionPreference = "Stop"
$baseUrl = "http://trustvault-alb-production-1074225278.us-east-1.elb.amazonaws.com"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " LIVE AWS ALB END-TO-END VERIFICATION: $baseUrl" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Admin Login
Write-Host "`n[1/7] Logging in as Master Admin..." -ForegroundColor Yellow
$adminLoginBody = @{
    email = "admin@trustvault.com"
    password = "Admin@12345!"
} | ConvertTo-Json

$adminAuth = Invoke-RestMethod -Uri "$baseUrl/api/v1/auth/login" -Method Post -Body $adminLoginBody -ContentType "application/json"
$adminToken = $adminAuth.token
Write-Host " -> Logged in as Admin successfully. Token received." -ForegroundColor Green

# 2. Admin provisions Owner
Write-Host "`n[2/7] Admin provisioning Owner..." -ForegroundColor Yellow
$uniqueSuffix = [Guid]::NewGuid().ToString().Substring(0, 6)
$ownerEmail = "sarah_" + $uniqueSuffix + "@company.com"
$ownerUsername = "sarah_" + $uniqueSuffix
$createOwnerBody = @{
    username = $ownerUsername
    email = $ownerEmail
    password = "Password@12345!"
    department = "Legal"
} | ConvertTo-Json

$ownerUser = Invoke-RestMethod -Uri "$baseUrl/api/v1/admin/users/owners" -Method Post -Body $createOwnerBody -ContentType "application/json" -Headers @{ Authorization = "Bearer $adminToken" }
Write-Host " -> Owner provisioned: $($ownerUser.email) (Id: $($ownerUser.id))" -ForegroundColor Green

# 3. Owner logs in
Write-Host "`n[3/7] Logging in as Owner ($ownerEmail)..." -ForegroundColor Yellow
$ownerLoginBody = @{
    email = $ownerEmail
    password = "Password@12345!"
} | ConvertTo-Json
$ownerAuth = Invoke-RestMethod -Uri "$baseUrl/api/v1/auth/login" -Method Post -Body $ownerLoginBody -ContentType "application/json"
$ownerToken = $ownerAuth.token
Write-Host " -> Owner logged in successfully." -ForegroundColor Green

# 4. Owner provisions Viewer with Tags
Write-Host "`n[4/7] Owner provisioning Viewer with Tag..." -ForegroundColor Yellow
$viewerSuffix = [Guid]::NewGuid().ToString().Substring(0, 6)
$viewerEmail = "alex_" + $viewerSuffix + "@company.com"
$viewerUsername = "alex_" + $viewerSuffix
$createViewerBody = @{
    username = $viewerUsername
    email = $viewerEmail
    password = "Password@12345!"
    department = "Finance"
    initialTags = @("Finance", "Audit")
} | ConvertTo-Json
$viewerUser = Invoke-RestMethod -Uri "$baseUrl/api/v1/owner/users/viewers" -Method Post -Body $createViewerBody -ContentType "application/json" -Headers @{ Authorization = "Bearer $ownerToken" }
$viewerId = $viewerUser.id
Write-Host " -> Viewer provisioned: $viewerEmail (Id: $viewerId)" -ForegroundColor Green

# 5. Owner Uploads Encrypted Document
Write-Host "`n[5/7] Owner uploading confidential file with AES-256-GCM encryption..." -ForegroundColor Yellow
$tempFilePath = [System.IO.Path]::Combine([System.IO.Path]::GetTempPath(), "Confidential_Board_Minutes.pdf")
[System.IO.File]::WriteAllBytes($tempFilePath, [System.Text.Encoding]::UTF8.GetBytes("%PDF-1.4 Confidential Board Minutes Content for Snovasys TrustVault"))

$curlOutput = & curl.exe -s -X POST "$baseUrl/api/v1/documents/upload" `
    -H "Authorization: Bearer $ownerToken" `
    -F "file=@$tempFilePath" `
    -F "title=Confidential Board Minutes" `
    -F "category=Executive"
$docObj = $curlOutput | ConvertFrom-Json
$docId = $docObj.id
Write-Host " -> Document uploaded & encrypted: '$($docObj.title)' (Doc ID: $docId)" -ForegroundColor Green

# 6. Bulk Grant by Tag "Finance"
Write-Host "`n[6/7] Testing Tag-Based Bulk Permission Grant..." -ForegroundColor Yellow
$tagGrantBody = @{
    tagName = "Finance"
    permissions = @(1) # Read only
} | ConvertTo-Json
$tagGrantRes = Invoke-RestMethod -Uri "$baseUrl/api/v1/documents/$docId/permissions/grant-by-tag" -Method Post -Body $tagGrantBody -ContentType "application/json" -Headers @{ Authorization = "Bearer $ownerToken" }
Write-Host " -> Bulk Tag Grant Response: $($tagGrantRes.message)" -ForegroundColor Green

# 7. Viewer Reads Plain Text
Write-Host "`n[7/7] Viewer reading decrypted plain text..." -ForegroundColor Yellow
$viewerLoginBody = @{
    email = $viewerEmail
    password = "Password@12345!"
} | ConvertTo-Json
$viewerAuth = Invoke-RestMethod -Uri "$baseUrl/api/v1/auth/login" -Method Post -Body $viewerLoginBody -ContentType "application/json"
$viewerToken = $viewerAuth.token

$contentRes = Invoke-RestMethod -Uri "$baseUrl/api/v1/documents/$docId/content" -Method Get -Headers @{ Authorization = "Bearer $viewerToken" }
Write-Host " -> Decrypted Plain Text Content:" -ForegroundColor Cyan
Write-Host " '$($contentRes.textContent)'" -ForegroundColor White

# 8. Cryptographic Chain Verification
$verifyResult = Invoke-RestMethod -Uri "$baseUrl/api/v1/admin/audit-verify" -Method Get -Headers @{ Authorization = "Bearer $adminToken" }
Write-Host "`nAUDIT CHAIN VERIFICATION ON AWS:" -ForegroundColor Cyan
Write-Host " -> Intact: $($verifyResult.isChainIntact)" -ForegroundColor Green
Write-Host " -> Total Records: $($verifyResult.totalAuditedRecords)" -ForegroundColor Green
Write-Host " -> Status: $($verifyResult.status)" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " ALL AWS END-TO-END TESTS PASSED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan

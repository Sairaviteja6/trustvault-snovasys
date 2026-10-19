$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " TRUSTVAULT END-TO-END SECURITY & LIFECYCLE VERIFICATION" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Admin Login
Write-Host "`n[1/7] Logging in as Administrator..." -ForegroundColor Yellow
$adminLoginBody = @{
    email = "admin@trustvault.com"
    password = "Admin@12345!"
} | ConvertTo-Json

$adminAuth = Invoke-RestMethod -Uri "http://localhost:5000/api/v1/auth/login" -Method Post -Body $adminLoginBody -ContentType "application/json"
$adminToken = $adminAuth.token
Write-Host " -> Logged in as Admin successfully. Token received." -ForegroundColor Green

# 2. Admin creates Owner (Sarah) if not already created
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

$ownerUser = Invoke-RestMethod -Uri "http://localhost:5000/api/v1/admin/users/owners" -Method Post -Body $createOwnerBody -ContentType "application/json" -Headers @{ Authorization = "Bearer $adminToken" }
Write-Host " -> Owner provisioned: $($ownerUser.email) (Id: $($ownerUser.id))" -ForegroundColor Green

# 3. Owner logs in
Write-Host "`n[3/7] Logging in as Owner ($ownerEmail)..." -ForegroundColor Yellow
$ownerLoginBody = @{
    email = $ownerEmail
    password = "Password@12345!"
} | ConvertTo-Json
$ownerAuth = Invoke-RestMethod -Uri "http://localhost:5000/api/v1/auth/login" -Method Post -Body $ownerLoginBody -ContentType "application/json"
$ownerToken = $ownerAuth.token
Write-Host " -> Owner logged in successfully." -ForegroundColor Green

# 4. Owner provisions Viewer (Alex)
Write-Host "`n[4/7] Owner provisioning Viewer..." -ForegroundColor Yellow
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
$viewerUser = Invoke-RestMethod -Uri "http://localhost:5000/api/v1/owner/users/viewers" -Method Post -Body $createViewerBody -ContentType "application/json" -Headers @{ Authorization = "Bearer $ownerToken" }
$viewerId = $viewerUser.id
Write-Host " -> Viewer provisioned: $viewerEmail (Id: $viewerId)" -ForegroundColor Green

# 5. Owner Uploads Encrypted Document
Write-Host "`n[5/7] Owner uploading confidential file with AES-256-GCM encryption..." -ForegroundColor Yellow
$tempFilePath = [System.IO.Path]::Combine([System.IO.Path]::GetTempPath(), "Confidential_Board_Minutes.pdf")
[System.IO.File]::WriteAllBytes($tempFilePath, [System.Text.Encoding]::UTF8.GetBytes("%PDF-1.4 Confidential Board Minutes Content"))

$curlOutput = & curl.exe -s -X POST "http://localhost:5000/api/v1/documents/upload" `
    -H "Authorization: Bearer $ownerToken" `
    -F "file=@$tempFilePath" `
    -F "title=Confidential Board Minutes" `
    -F "category=Executive"
$docObj = $curlOutput | ConvertFrom-Json
$docId = $docObj.id
Write-Host " -> Document uploaded & encrypted: '$($docObj.title)' (Doc ID: $docId)" -ForegroundColor Green

# 6. Discrete Permissions: Grant Read ONLY to Alex
Write-Host "`n[6/7] Testing Discrete Permissions (Read != Download)..." -ForegroundColor Yellow
$grantBody = @{
    userId = $viewerId
    permissions = @(1) # 1 = Read only
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/v1/documents/$docId/permissions/grant" -Method Post -Body $grantBody -ContentType "application/json" -Headers @{ Authorization = "Bearer $ownerToken" }
Write-Host " -> Granted permission: Read (1) to Viewer $viewerEmail" -ForegroundColor Green

# Login as Viewer Alex
$viewerLoginBody = @{
    email = $viewerEmail
    password = "Password@12345!"
} | ConvertTo-Json
$viewerAuth = Invoke-RestMethod -Uri "http://localhost:5000/api/v1/auth/login" -Method Post -Body $viewerLoginBody -ContentType "application/json"
$viewerToken = $viewerAuth.token

# Alex reads metadata
$viewerDocs = Invoke-RestMethod -Uri "http://localhost:5000/api/v1/documents" -Method Get -Headers @{ Authorization = "Bearer $viewerToken" }
Write-Host " -> Viewer successfully listed permitted document: $($viewerDocs[0].title)" -ForegroundColor Green

# Alex attempts Download (should be 404 REFUSED because Alex only has Read, not Download)
Write-Host " -> Alex attempting unauthorized download..." -ForegroundColor Yellow
$downloadStatusCode = 0
try {
    Invoke-WebRequest -Uri "http://localhost:5000/api/v1/documents/$docId/download" -Method Get -Headers @{ Authorization = "Bearer $viewerToken" }
} catch {
    $downloadStatusCode = $_.Exception.Response.StatusCode.value__
}
if ($downloadStatusCode -eq 404) {
    Write-Host " -> PASSED: Server returned 404 Not Found (Unauthorized download was blocked & existence hidden)!" -ForegroundColor Green
} else {
    Write-Host " -> FAILED: Unexpected status code $downloadStatusCode" -ForegroundColor Red
}

# 7. Real-Time Revocation Test
Write-Host "`n[7/7] Testing Real-Time Revocation & Cryptographic Audit Verification..." -ForegroundColor Yellow
# Owner revokes Alex
Invoke-RestMethod -Uri "http://localhost:5000/api/v1/documents/$docId/permissions/revoke/$viewerId" -Method Delete -Headers @{ Authorization = "Bearer $ownerToken" }
Write-Host " -> Owner revoked Alex's access." -ForegroundColor Green

# Alex tries to read again immediately
$revokedStatusCode = 0
try {
    Invoke-WebRequest -Uri "http://localhost:5000/api/v1/documents/$docId" -Method Get -Headers @{ Authorization = "Bearer $viewerToken" }
} catch {
    $revokedStatusCode = $_.Exception.Response.StatusCode.value__
}
if ($revokedStatusCode -eq 404) {
    Write-Host " -> PASSED: Revocation took effect IMMEDIATELY (Alex receives 404 on immediate next request)!" -ForegroundColor Green
} else {
    Write-Host " -> FAILED: Unexpected status code $revokedStatusCode" -ForegroundColor Red
}

# Admin verifies Audit Hash Chain
$verifyResult = Invoke-RestMethod -Uri "http://localhost:5000/api/v1/admin/audit-verify" -Method Get -Headers @{ Authorization = "Bearer $adminToken" }
Write-Host "`nAUDIT CHAIN VERIFICATION RESULT:" -ForegroundColor Cyan
Write-Host " -> Intact: $($verifyResult.isChainIntact)" -ForegroundColor Green
Write-Host " -> Total Records: $($verifyResult.totalAuditedRecords)" -ForegroundColor Green
Write-Host " -> Status: $($verifyResult.status)" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan

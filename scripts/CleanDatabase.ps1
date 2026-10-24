$baseUrl = "https://trustvault-snovasys.vercel.app"

Write-Host "Authenticating as Master Admin..." -ForegroundColor Cyan
$loginRes = Invoke-RestMethod -Uri "$baseUrl/api/v1/auth/login" -Method Post -Body '{"email":"admin@trustvault.com","password":"Admin@12345!"}' -ContentType "application/json"
$token = $loginRes.token
$headers = @{ Authorization = "Bearer $token" }

Write-Host "Fetching users..." -ForegroundColor Cyan
$users = Invoke-RestMethod -Uri "$baseUrl/api/v1/admin/users" -Method Get -Headers $headers

Write-Host "Total users found: $($users.Count)"
foreach ($u in $users) {
    if ($u.email -ne "admin@trustvault.com") {
        Write-Host "Deleting non-admin user: $($u.email) (Id: $($u.id))..." -ForegroundColor Yellow
        try {
            Invoke-RestMethod -Uri "$baseUrl/api/v1/admin/users/$($u.id)" -Method Delete -Headers $headers
            Write-Host " -> Deleted $($u.email)" -ForegroundColor Green
        } catch {
            Write-Host " -> Error deleting $($u.email): $_" -ForegroundColor Red
        }
    } else {
        Write-Host "Retaining Master Admin: $($u.email)" -ForegroundColor Magenta
    }
}

Write-Host "`nVerifying remaining users:" -ForegroundColor Cyan
$remaining = Invoke-RestMethod -Uri "$baseUrl/api/v1/admin/users" -Method Get -Headers $headers
$remaining | Format-Table -Property Id, Username, Email, Role

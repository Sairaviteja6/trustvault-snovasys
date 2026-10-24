$baseUrl = "http://trustvault-alb-production-1074225278.us-east-1.elb.amazonaws.com"
$adminLoginBody = @{
    email = "admin@trustvault.com"
    password = "Admin@12345!"
} | ConvertTo-Json

$login = Invoke-RestMethod -Uri "$baseUrl/api/v1/auth/login" -Method Post -Body $adminLoginBody -ContentType "application/json"
$headers = @{ Authorization = "Bearer $($login.token)" }

# Get users
$users = Invoke-RestMethod -Uri "$baseUrl/api/v1/admin/users" -Method Get -Headers $headers
$targetUser = $users | Where-Object { $_.role -ne 'Admin' } | Select-Object -First 1

if ($targetUser) {
    Write-Output "Attempting to delete non-admin user: $($targetUser.username) ($($targetUser.email)) [ID: $($targetUser.id)]"
    $del = Invoke-RestMethod -Uri "$baseUrl/api/v1/admin/users/$($targetUser.id)" -Method Delete -Headers $headers
    Write-Output "SUCCESS: $($del.message)"
} else {
    Write-Output "No non-admin user found to delete."
}

$adminAuth = Invoke-RestMethod -Uri "http://localhost:5000/api/v1/auth/login" -Method Post -Body '{"email":"admin@trustvault.com","password":"Admin@12345!"}' -ContentType "application/json"
$adminToken = $adminAuth.token

$users = Invoke-RestMethod -Uri "http://localhost:5000/api/v1/admin/users" -Method Get -Headers @{ Authorization = "Bearer $adminToken" }
$users | Where-Object { $_.role -eq "Owner" } | Format-Table -Property Id, Username, Email, Role, Department

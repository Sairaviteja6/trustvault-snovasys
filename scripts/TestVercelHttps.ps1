$body = @{
    email = "admin@trustvault.com"
    password = "Admin@12345!"
} | ConvertTo-Json

$res = Invoke-RestMethod -Uri "https://browser-fawn-sigma.vercel.app/api/v1/auth/login" -Method Post -Body $body -ContentType "application/json"
Write-Output "VERCEL HTTPS LOGIN SUCCESS!"
Write-Output "User Role: $($res.role)"
Write-Output "Token (truncated): $($res.token.Substring(0, 30))..."

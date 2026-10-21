$sarahAuth = Invoke-RestMethod -Uri "http://localhost:5000/api/v1/auth/login" -Method Post -Body '{"email":"sarah_223ddb@company.com","password":"Password@12345!"}' -ContentType "application/json"
Write-Host "TOKEN FOR SARAH (sarah_223ddb@company.com):" -ForegroundColor Cyan
Write-Host $sarahAuth.token

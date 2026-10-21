# DeployToAws.ps1 - Fast one-click local deploy script to EC2
Write-Host "🚀 Packaging and deploying TrustVault to AWS EC2 (54.172.194.89)..." -ForegroundColor Cyan

$keyPath = "$env:USERPROFILE\Downloads\sai_key.pem"
if (-not (Test-Path $keyPath)) {
    Write-Error "Could not find SSH key at $keyPath"
    exit 1
}

$tarName = "trustvault-sync.tar.gz"
Write-Host "📦 Creating deployment bundle..." -ForegroundColor Yellow
tar.exe -czf $tarName --exclude="node_modules" --exclude="bin" --exclude="obj" --exclude=".angular" --exclude=".git" --exclude="*.tar.gz" .

Write-Host "⬆️  Uploading bundle to EC2..." -ForegroundColor Yellow
scp -i $keyPath -o StrictHostKeyChecking=no $tarName ubuntu@54.172.194.89:/home/ubuntu/

Remove-Item $tarName -Force

Write-Host "🔄 Extracting and restarting containers on EC2..." -ForegroundColor Yellow
ssh -n -i $keyPath -o StrictHostKeyChecking=no ubuntu@54.172.194.89 "mkdir -p ~/trustvault && tar -xzf ~/trustvault-sync.tar.gz -C ~/trustvault && rm ~/trustvault-sync.tar.gz && cd ~/trustvault && sudo docker compose up -d --build && sudo docker ps"

Write-Host "✅ Deployment complete! Check live URL: http://54.172.194.89" -ForegroundColor Green

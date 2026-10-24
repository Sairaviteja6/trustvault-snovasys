#!/bin/bash
set -xe

# Ensure Docker is started
systemctl enable docker
systemctl start docker

# Prepare build directory
mkdir -p /tmp/build-backend
cd /tmp/build-backend

# Download backend source from deployment S3 bucket
aws s3 cp s3://trustvault-deploy-000000000000/backend-src.tar.gz .
tar -xzf backend-src.tar.gz

# Build Docker image
docker build -t trustvault-backend:latest -f Dockerfile .

# Tag and push to ECR repository for persistence
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 000000000000.dkr.ecr.us-east-1.amazonaws.com || true
docker tag trustvault-backend:latest 000000000000.dkr.ecr.us-east-1.amazonaws.com/trustvault-backend:latest || true
docker push 000000000000.dkr.ecr.us-east-1.amazonaws.com/trustvault-backend:latest || true

# Prepare storage directory
mkdir -p /opt/trustvault/storage/encrypted_blobs
chown -R 1000:1000 /opt/trustvault/storage || true

# Stop and remove any old container
docker stop trustvault-backend || true
docker rm trustvault-backend || true

# Run the production backend API container with live SES SMTP configuration
docker run -d \
  --name trustvault-backend \
  --restart always \
  -p 5000:5000 \
  -v /opt/trustvault/storage/encrypted_blobs:/app/Storage/encrypted_blobs \
  -e ASPNETCORE_ENVIRONMENT=Production \
  -e ASPNETCORE_URLS=http://+:5000 \
  -e ConnectionStrings__DefaultConnection="Server=localhost;Database=TrustVaultDb;User Id=sa;Password=TrustVault_StrongPass2026#;TrustServerCertificate=True;MultipleActiveResultSets=true;" \
  -e Jwt__Secret="SuperSecretTrustVaultProductionGradeKey2026!#$StrictCryptoEnforcement" \
  -e Security__MasterEncryptionKeyHex="0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF" \
  -e Smtp__Host="smtp.gmail.com" \
  -e Smtp__Port="587" \
  -e Smtp__EnableSsl="true" \
  -e Smtp__Username="noreply@trustvault.local" \
  -e Smtp__Password="REDACTED_GMAIL_PASS" \
  -e Smtp__From="noreply@trustvault.local" \
  -e SMTP_HOST="smtp.gmail.com" \
  -e SMTP_PORT="587" \
  -e SMTP_ENABLE_SSL="true" \
  -e SMTP_USERNAME="noreply@trustvault.local" \
  -e SMTP_PASSWORD="REDACTED_GMAIL_PASS" \
  -e SMTP_FROM="noreply@trustvault.local" \
  --log-driver json-file \
  --log-opt max-size=50m \
  --log-opt max-file=3 \
  trustvault-backend:latest

echo "Backend deployment completed successfully."
docker ps

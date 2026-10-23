FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY ["TrustVault.Core/TrustVault.Core.csproj", "TrustVault.Core/"]
COPY ["TrustVault.Infrastructure/TrustVault.Infrastructure.csproj", "TrustVault.Infrastructure/"]
COPY ["TrustVault.Api/TrustVault.Api.csproj", "TrustVault.Api/"]
COPY ["TrustVault.Tests/TrustVault.Tests.csproj", "TrustVault.Tests/"]

RUN dotnet restore "TrustVault.Api/TrustVault.Api.csproj"

COPY . .
WORKDIR "/src/TrustVault.Api"
RUN dotnet build "TrustVault.Api.csproj" -c Release -o /app/build
RUN dotnet publish "TrustVault.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

# Secure storage directory outside wwwroot
RUN mkdir -p /app/Storage/encrypted_blobs

ENV ASPNETCORE_URLS=http://+:5000
EXPOSE 5000

ENTRYPOINT ["dotnet", "TrustVault.Api.dll"]

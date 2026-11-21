FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY ["backend/TrustVault.Core/TrustVault.Core.csproj", "TrustVault.Core/"]
COPY ["backend/TrustVault.Infrastructure/TrustVault.Infrastructure.csproj", "TrustVault.Infrastructure/"]
COPY ["backend/TrustVault.Api/TrustVault.Api.csproj", "TrustVault.Api/"]

RUN dotnet restore "TrustVault.Api/TrustVault.Api.csproj"

COPY backend/ .
WORKDIR "/src/TrustVault.Api"
RUN dotnet publish "TrustVault.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

RUN mkdir -p /app/Storage/encrypted_blobs

ENV PORT=5000
EXPOSE 5000

ENTRYPOINT ["dotnet", "TrustVault.Api.dll"]

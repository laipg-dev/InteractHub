# Stage 1: Build
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /app

# Copy các file project và restore dependencies
COPY ["src/InteractHub.API/InteractHub.API.csproj", "src/InteractHub.API/"]
COPY ["src/InteractHub.Core/InteractHub.Core.csproj", "src/InteractHub.Core/"]
COPY ["src/InteractHub.Infrastructure/InteractHub.Infrastructure.csproj", "src/InteractHub.Infrastructure/"]
RUN dotnet restore "src/InteractHub.API/InteractHub.API.csproj"

# Copy toàn bộ code và build
COPY . .
WORKDIR "/app/src/InteractHub.API"
RUN dotnet build "InteractHub.API.csproj" -c Release -o /app/build

# Stage 2: Publish
FROM build AS publish
RUN dotnet publish "InteractHub.API.csproj" -c Release -o /app/publish

# Stage 3: Final image
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "InteractHub.API.dll"]
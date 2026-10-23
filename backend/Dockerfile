FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Restore first for better layer caching
COPY Strata.sln ./
COPY src/Strata.Api/Strata.Api.csproj src/Strata.Api/
RUN dotnet restore src/Strata.Api/Strata.Api.csproj

COPY src/ src/
RUN dotnet publish src/Strata.Api/Strata.Api.csproj -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

# Invariant globalization keeps the runtime image small; the API does not need
# culture-specific data. Remove this line (and install libicu) if you need it.
ENV DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=1
ENV ASPNETCORE_URLS=http://+:8080

COPY --from=build /app/publish .

EXPOSE 8080
ENTRYPOINT ["dotnet", "Strata.Api.dll"]

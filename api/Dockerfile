# syntax=docker/dockerfile:1
#
# Epm.Api — .NET 9 minimal API.
#
# Build context is api/ (the folder holding Epm.sln), so the restore layer can
# copy just the .csproj and stay cached until a PackageReference changes.
# Epm.Domain.Tests is deliberately not part of this image: it is a test project
# and nothing in the running API references it.

# ── build ────────────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

COPY Epm.Api/Epm.Api.csproj Epm.Api/
RUN dotnet restore Epm.Api/Epm.Api.csproj

COPY Epm.Api/ Epm.Api/
RUN dotnet publish Epm.Api/Epm.Api.csproj -c Release -o /app --no-restore

# ── runtime ──────────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app

# Kestrel listens on 8080 inside the container; compose maps it to the :5080
# the rest of the project talks about (CLAUDE.md §7).
ENV ASPNETCORE_HTTP_PORTS=8080
EXPOSE 8080

COPY --from=build /app .

# The `app` user ships with the aspnet image. Nothing here writes to disk —
# the database lives in the db container — so a non-root runtime costs nothing.
USER app

ENTRYPOINT ["dotnet", "Epm.Api.dll"]

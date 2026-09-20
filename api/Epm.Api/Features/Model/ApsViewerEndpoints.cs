using System.Net.Http.Headers;
using System.Text;
using System.Text.Json.Serialization;

namespace Epm.Api.Features.Model;

/// <summary>
/// Autodesk Platform Services (formerly Forge) authentication for SCR-W10.
/// The client secret never crosses this boundary. The browser receives only a
/// short-lived token restricted to translated viewables.
/// </summary>
public static class ApsViewerEndpoints
{
    private static readonly SemaphoreSlim TokenLock = new(1, 1);
    private static CachedToken? cachedToken;

    public static void MapApsViewerEndpoints(this WebApplication app)
    {
        // [EP-MDL-02] GET /api/model-viewer/token
        // web: model/model.api.ts getViewerToken() → aps-viewer.component.ts
        // service: Autodesk APS OAuth v2 | scope: viewables:read
        app.MapGet("/api/model-viewer/token", async (
            IConfiguration configuration,
            IHttpClientFactory clients,
            CancellationToken cancellationToken) =>
        {
            var clientId = configuration["Aps:ClientId"];
            var clientSecret = configuration["Aps:ClientSecret"];

            if (string.IsNullOrWhiteSpace(clientId) || string.IsNullOrWhiteSpace(clientSecret))
            {
                return Results.Problem(
                    title: "APS viewer is not configured",
                    detail: "Set Aps:ClientId and Aps:ClientSecret in environment configuration.",
                    statusCode: StatusCodes.Status503ServiceUnavailable);
            }

            await TokenLock.WaitAsync(cancellationToken);
            try
            {
                if (cachedToken is { } token && token.ExpiresAt > DateTimeOffset.UtcNow.AddMinutes(2))
                    return Results.Ok(new ViewerToken(token.AccessToken, token.ExpiresIn()));

                using var request = new HttpRequestMessage(
                    HttpMethod.Post,
                    "https://developer.api.autodesk.com/authentication/v2/token");
                var basic = Convert.ToBase64String(
                    Encoding.UTF8.GetBytes($"{clientId}:{clientSecret}"));
                request.Headers.Authorization = new AuthenticationHeaderValue("Basic", basic);
                request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
                request.Content = new FormUrlEncodedContent(new Dictionary<string, string>
                {
                    ["grant_type"] = "client_credentials",
                    ["scope"] = "viewables:read"
                });

                using var response = await clients.CreateClient().SendAsync(request, cancellationToken);
                if (!response.IsSuccessStatusCode)
                {
                    return Results.Problem(
                        title: "APS authentication failed",
                        detail: $"Autodesk returned HTTP {(int)response.StatusCode}.",
                        statusCode: StatusCodes.Status502BadGateway);
                }

                var body = await response.Content.ReadFromJsonAsync<ApsToken>(cancellationToken);
                if (body is null || string.IsNullOrWhiteSpace(body.AccessToken) || body.ExpiresIn <= 0)
                {
                    return Results.Problem(
                        title: "APS authentication failed",
                        detail: "Autodesk returned an invalid token response.",
                        statusCode: StatusCodes.Status502BadGateway);
                }

                cachedToken = new CachedToken(
                    body.AccessToken,
                    DateTimeOffset.UtcNow.AddSeconds(body.ExpiresIn));
                return Results.Ok(new ViewerToken(body.AccessToken, body.ExpiresIn));
            }
            catch (HttpRequestException)
            {
                return Results.Problem(
                    title: "APS is unavailable",
                    detail: "The API could not reach Autodesk Platform Services.",
                    statusCode: StatusCodes.Status502BadGateway);
            }
            finally
            {
                TokenLock.Release();
            }
        });
    }

    private sealed record ApsToken(
        [property: JsonPropertyName("access_token")] string AccessToken,
        [property: JsonPropertyName("expires_in")] int ExpiresIn);

    private sealed record CachedToken(string AccessToken, DateTimeOffset ExpiresAt)
    {
        public int ExpiresIn() => Math.Max(1, (int)(ExpiresAt - DateTimeOffset.UtcNow).TotalSeconds);
    }
}

public record ViewerToken(string AccessToken, int ExpiresIn);

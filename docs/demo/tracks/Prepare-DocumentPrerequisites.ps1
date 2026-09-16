param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^PRJ-[0-9]+$')]
    [string]$ProjectId
)

$ErrorActionPreference = 'Stop'
# Deliberately fixed to the local development API; never calls reset/load-fixture.
$demoPreparationUri = "http://localhost:5080/api/dev/projects/$ProjectId/document-prerequisites"
$demoPreparationResult = Invoke-RestMethod -Method Post -Uri $demoPreparationUri -Headers @{
    'X-Epm-User' = 'user.senior-mgmt'
}
$demoPreparationResult | Select-Object projectId, added, message

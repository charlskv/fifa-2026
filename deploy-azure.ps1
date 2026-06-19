# FIFA 2026 App - Azure Deployment Script
# This script automates the deployment of the app to Azure

param(
    [string]$ResourceGroup = "fifa-rg",
    [string]$Location = "eastus",
    [string]$AcrName = "fifaregistry",
    [string]$ContainerInstanceName = "fifa-backend",
    [string]$StaticWebAppName = "fifa-2026-app"
)

# Colors for output
$ErrorColor = "Red"
$SuccessColor = "Green"
$WarningColor = "Yellow"
$InfoColor = "Cyan"

function Write-Info { Write-Host $args -ForegroundColor $InfoColor }
function Write-Success { Write-Host $args -ForegroundColor $SuccessColor }
function Write-Warning { Write-Host $args -ForegroundColor $WarningColor }
function Write-Error { Write-Host $args -ForegroundColor $ErrorColor }

Write-Info "========================================="
Write-Info "FIFA 2026 App - Azure Deployment Script"
Write-Info "========================================="
Write-Host ""

# Check prerequisites
Write-Info "Checking prerequisites..."

$hasAzCli = $null -ne (Get-Command az -ErrorAction SilentlyContinue)
if (-not $hasAzCli) {
    Write-Error "Azure CLI not found. Please install it first."
    exit 1
}

Write-Success "✓ Azure CLI found"

$hasDocker = $null -ne (Get-Command docker -ErrorAction SilentlyContinue)
if (-not $hasDocker) {
    Write-Warning "Docker not found. You'll need to build the backend image yourself."
}
else {
    Write-Success "✓ Docker found"
}

$hasNode = $null -ne (Get-Command node -ErrorAction SilentlyContinue)
if (-not $hasNode) {
    Write-Error "Node.js not found. Please install it first."
    exit 1
}

Write-Success "✓ Node.js found"
Write-Host ""

# Step 1: Create Resource Group
Write-Info "Step 1: Creating resource group..."
az group create --name $ResourceGroup --location $Location
Write-Success "✓ Resource group created"
Write-Host ""

# Step 2: Create ACR
Write-Info "Step 2: Creating Azure Container Registry..."
$acrOutput = az acr create --resource-group $ResourceGroup --name $AcrName --sku Basic --admin-enabled true --output json | ConvertFrom-Json
$acrLoginServer = $acrOutput.loginServer
Write-Success "✓ ACR created: $acrLoginServer"

# Get ACR credentials
$acrCreds = az acr credential show --name $AcrName --output json | ConvertFrom-Json
$acrUsername = $acrCreds.username
$acrPassword = $acrCreds.passwords[0].value
Write-Info "ACR username: $acrUsername"
Write-Host ""

# Step 3: Build backend
Write-Info "Step 3: Building backend TypeScript..."
Push-Location backend
npm ci
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to build backend"
    exit 1
}
Write-Success "✓ Backend built"
Pop-Location
Write-Host ""

# Step 4: Build and push Docker image
if ($hasDocker) {
    Write-Info "Step 4: Building and pushing Docker image..."
    $imageName = "$acrLoginServer/fifa-backend:latest"
    
    Write-Info "Building image: $imageName"
    az acr build --registry $AcrName --image fifa-backend:latest --file backend/Dockerfile backend/
    Write-Success "✓ Docker image built and pushed"
    Write-Host ""
}
else {
    Write-Warning "Step 4: Skipping Docker build (Docker not installed)"
    Write-Warning "You can build and push manually:"
    Write-Warning "  docker build -t $acrLoginServer/fifa-backend:latest -f backend/Dockerfile backend/"
    Write-Warning "  docker push $acrLoginServer/fifa-backend:latest"
    Write-Host ""
}

# Step 5: Deploy to Container Instances
Write-Info "Step 5: Deploying to Azure Container Instances..."
az container create `
    --resource-group $ResourceGroup `
    --name $ContainerInstanceName `
    --image "$acrLoginServer/fifa-backend:latest" `
    --registry-login-server $acrLoginServer `
    --registry-username $acrUsername `
    --registry-password $acrPassword `
    --cpu 1 `
    --memory 1 `
    --ports 3001 `
    --protocol TCP `
    --ip-address public `
    --restart-policy OnFailure

Write-Success "✓ Container deployed"
Write-Host ""

# Step 6: Get Container IP
Write-Info "Step 6: Retrieving container details..."
$containerIp = az container show --resource-group $ResourceGroup --name $ContainerInstanceName --query ipAddress.ip --output tsv
Write-Success "✓ Container IP: $containerIp"
Write-Host ""

# Step 7: Build frontend
Write-Info "Step 7: Building frontend..."
Push-Location frontend
$env:VITE_API_BASE = "https://$containerIp.nip.io:3001"
Write-Info "Using API base: $env:VITE_API_BASE"
npm ci
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to build frontend"
    exit 1
}
Write-Success "✓ Frontend built"
Pop-Location
Write-Host ""

# Final summary
Write-Host ""
Write-Success "========================================="
Write-Success "✓ Deployment Complete!"
Write-Success "========================================="
Write-Host ""
Write-Info "Backend Details:"
Write-Host "  Container Instance: $ContainerInstanceName"
Write-Host "  IP Address: $containerIp"
Write-Host "  API Base URL: https://$containerIp.nip.io:3001"
Write-Host ""
Write-Info "Frontend Details:"
Write-Host "  Built at: frontend/dist"
Write-Host "  API Base configured: https://$containerIp.nip.io:3001"
Write-Host ""
Write-Warning "Next steps:"
Write-Host "  1. Deploy frontend/dist to Azure Static Web Apps"
Write-Host "  2. Update GitHub Secrets (see DEPLOY.md)"
Write-Host "  3. Set up continuous deployment via GitHub Actions"
Write-Host ""
Write-Info "For detailed deployment guide, see: DEPLOY.md"

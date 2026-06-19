# Azure Deployment - Quick Reference

## Essential Commands

### Login to Azure
```bash
az login
# Or use service principal
az login --service-principal -u <app-id> -p <password> --tenant <tenant-id>
```

### Resource Group
```bash
# Create
az group create --name fifa-rg --location eastus

# List
az group list --output table

# Delete
az group delete --name fifa-rg
```

### Container Registry (ACR)
```bash
# Create
az acr create --resource-group fifa-rg --name fifaregistry --sku Basic

# Get credentials
az acr credential show --name fifaregistry

# Build and push (from local)
az acr build --registry fifaregistry --image fifa-backend:latest --file backend/Dockerfile backend/

# List images
az acr repository list --name fifaregistry
```

### Container Instances
```bash
# Create
az container create \
  --resource-group fifa-rg \
  --name fifa-backend \
  --image fifaregistry.azurecr.io/fifa-backend:latest \
  --registry-login-server fifaregistry.azurecr.io \
  --registry-username <username> \
  --registry-password <password> \
  --cpu 1 --memory 1 --ports 3001 \
  --ip-address public

# Get details
az container show --resource-group fifa-rg --name fifa-backend

# View logs
az container logs --resource-group fifa-rg --name fifa-backend --follow

# Stop
az container stop --resource-group fifa-rg --name fifa-backend

# Start
az container start --resource-group fifa-rg --name fifa-backend

# Delete
az container delete --resource-group fifa-rg --name fifa-backend
```

### Static Web Apps (Manual)
```bash
# Create (manual via Portal is easier)
# Then deploy locally using app name and API token

# View details
az staticwebapp show --name fifa-2026-app --resource-group fifa-rg
```

## Environment Variables

### Backend (.env)
```
PORT=3001
ALLOWED_ORIGINS=http://localhost:5173,https://your-app.azurestaticapps.net
```

### Frontend (.env.production)
```
VITE_API_BASE=https://your-container.azurecontainer.io:3001
```

## GitHub Actions Secrets

```bash
# Use GitHub CLI to set secrets
gh secret set AZURE_SUBSCRIPTION_ID --body "12345..."
gh secret set AZURE_CLIENT_ID --body "abcd..."
gh secret set AZURE_TENANT_ID --body "efgh..."
gh secret set AZURE_CONTAINER_REGISTRY --body "fifaregistry"
gh secret set ACR_LOGIN_SERVER --body "fifaregistry.azurecr.io"
gh secret set REGISTRY_USERNAME --body "fifaregistry"
gh secret set REGISTRY_PASSWORD --body "..."
gh secret set AZURE_RESOURCE_GROUP --body "fifa-rg"
gh secret set STATIC_WEB_APP_DOMAIN --body "your-app.azurestaticapps.net"
gh secret set AZURE_STATIC_WEB_APPS_API_TOKEN --body "..."
gh secret set VITE_API_BASE --body "https://..."
```

## Docker Commands

```bash
# Build locally
docker build -t fifa-backend:latest -f backend/Dockerfile backend/

# Tag for ACR
docker tag fifa-backend:latest fifaregistry.azurecr.io/fifa-backend:latest

# Push to ACR (need to login first)
az acr login --name fifaregistry
docker push fifaregistry.azurecr.io/fifa-backend:latest

# Run locally
docker run -p 3001:3001 fifa-backend:latest
```

## Troubleshooting

### Check container logs
```bash
az container logs --resource-group fifa-rg --name fifa-backend --follow
```

### Get container IP
```bash
az container show --resource-group fifa-rg --name fifa-backend --query ipAddress.ip
```

### Test health endpoint
```bash
# Using curl
curl https://your-ip.nip.io:3001/api/health

# Using PowerShell
Invoke-RestMethod -Uri "https://your-ip.nip.io:3001/api/health"
```

### View all resources in group
```bash
az resource list --resource-group fifa-rg --output table
```

### Estimate costs
```bash
# Use Azure Pricing Calculator
# https://azure.microsoft.com/en-us/pricing/calculator/
```

## Useful Links

- Azure Container Registry: https://docs.microsoft.com/en-us/azure/container-registry/
- Azure Container Instances: https://docs.microsoft.com/en-us/azure/container-instances/
- Azure Static Web Apps: https://docs.microsoft.com/en-us/azure/static-web-apps/
- Azure CLI: https://docs.microsoft.com/en-us/cli/azure/
- GitHub Actions: https://docs.github.com/en/actions

## Common Errors

### "Subscription ID not found"
- Check: `az account list` to see subscriptions
- Set: `az account set --subscription <id>`

### "Container instance quota exceeded"
- Check quota: `az container show --resource-group <rg> --name <name>`
- Alternative: Use Azure App Service instead

### "CORS error when frontend calls backend"
- Update `ALLOWED_ORIGINS` env var with correct frontend URL
- Rebuild and redeploy backend

### "Static Web App won't build"
- Check GitHub Actions logs
- Verify `app_location` and `output_location` in workflow

### "Docker image won't push to ACR"
- Verify: `az acr login --name <registry>`
- Check image size: `docker image ls`
- Retry with exponential backoff

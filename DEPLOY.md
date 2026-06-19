# Azure Deployment Guide for FIFA 2026 App

This guide walks you through deploying the FIFA 2026 Match Watch Finder to Azure using GitHub Actions.

## Prerequisites

1. **Azure Subscription** - Active subscription with:
   - Ability to create resource groups
   - Container Registry (ACR)
   - Container Instances
   - Static Web Apps
   - Budget limit (recommended: ~$50/month for this app)

2. **GitHub Repository** - Your code pushed to GitHub (public or private)

3. **Azure CLI** - Installed locally (optional, for manual testing)

4. **GitHub Secrets** - Configured in your repo

## Step 1: Set Up Azure Resources

### 1a. Create Resource Group

```bash
az group create \
  --name fifa-rg \
  --location eastus
```

### 1b. Create Azure Container Registry (ACR)

```bash
az acr create \
  --resource-group fifa-rg \
  --name fifaregistry \
  --sku Basic \
  --admin-enabled true
```

**Save the output:**
- Login server (e.g., `fifaregistry.azurecr.io`)
- Username (e.g., `fifaregistry`)
- Password (auto-generated)

### 1c. Create Azure Static Web App

1. Go to [Azure Portal](https://portal.azure.com)
2. Search for **Static Web Apps**
3. Click **Create**
4. Fill in:
   - **Name**: `fifa-2026-app`
   - **Region**: East US
   - **Source**: GitHub (authorize if needed)
   - **Organization**: Select your GitHub account
   - **Repository**: Select `fifa-2026` or your repo name
   - **Branch**: `main`
   - **Build Presets**: Custom
   - **App location**: `frontend`
   - **API location**: (leave empty)
   - **Output location**: `dist`
5. Click **Review + Create** → **Create**

**Save the output:**
- Static Web App URL (e.g., `https://nice-tree-0123456.azurestaticapps.net`)
- API Token (find in Settings → "Deployment token")

### 1d. Create Service Principal for GitHub Actions (Optional but Recommended)

For federated identity setup:

```bash
# Create service principal
az ad sp create-for-rbac \
  --name fifa-github-deploy \
  --role Contributor \
  --scopes /subscriptions/{subscription-id}/resourceGroups/fifa-rg

# Save the output: appId, password, tenant
```

## Step 2: Configure GitHub Secrets

Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Add these secrets:

| Secret Name | Value | Example |
|---|---|---|
| `AZURE_SUBSCRIPTION_ID` | Your Azure subscription ID | `12345678-1234-1234-1234-123456789012` |
| `AZURE_CLIENT_ID` | Service principal appId | `abcdef12-1234-5678-1234-567890abcdef` |
| `AZURE_TENANT_ID` | Service principal tenant | `fedcba98-7654-3210-7654-321098765432` |
| `AZURE_CONTAINER_REGISTRY` | ACR name only | `fifaregistry` |
| `ACR_LOGIN_SERVER` | Full login server | `fifaregistry.azurecr.io` |
| `REGISTRY_USERNAME` | ACR admin username | `fifaregistry` |
| `REGISTRY_PASSWORD` | ACR admin password | (from Step 1b) |
| `AZURE_RESOURCE_GROUP` | Resource group name | `fifa-rg` |
| `STATIC_WEB_APP_DOMAIN` | Static Web App domain (without https://) | `nice-tree-0123456.azurestaticapps.net` |
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | Static Web App deployment token | (from Step 1c) |
| `VITE_API_BASE` | Backend URL pattern | See step 3 |

## Step 3: Configure Backend URL

### Option A: Use Container Instance Direct IP (Simple)

After first deployment, get the IP:

```bash
az container show \
  --resource-group fifa-rg \
  --name fifa-backend \
  --query ipAddress.ip \
  --output tsv
```

Then set `VITE_API_BASE` secret to:
```
https://{IP}.nip.io:3001
```

### Option B: Use Custom Domain (Recommended)

1. Create a public DNS name for Container Instance:
   ```bash
   az container create \
     --resource-group fifa-rg \
     --name fifa-backend \
     --dns-name-label fifa-backend \
     ...
   ```

2. DNS name will be: `fifa-backend.{region}.azurecontainer.io`

3. Set `VITE_API_BASE`:
   ```
   https://fifa-backend.eastus.azurecontainer.io:3001
   ```

## Step 4: Deploy

### Automatic Deployment (Recommended)

Simply push to `main` branch:

```bash
git push origin main
```

GitHub Actions will automatically:
1. Build backend Docker image
2. Push to ACR
3. Deploy to Container Instances
4. Build frontend
5. Deploy to Static Web Apps

Check progress: Go to **Actions** tab in GitHub

### Manual Deployment

Run workflow manually:

1. Go to **Actions** tab
2. Select **"Deploy FIFA 2026 App to Azure"**
3. Click **"Run workflow"** → **"Run workflow"**

## Step 5: Verify Deployment

### Frontend
- Visit your Static Web App URL from Step 1c
- Should see the FIFA 2026 match finder UI

### Backend
- Test health endpoint:
  ```bash
  curl -X GET https://{your-backend-url}:3001/api/health
  ```
  Should return: `{"ok":true}`

- Test matches endpoint:
  ```bash
  curl -X GET https://{your-backend-url}:3001/api/matches
  ```
  Should return JSON with match data

### Full Flow
1. Open Static Web App URL
2. Should automatically load matches from backend
3. Filter matches and click "Watch Link" to verify channels work

## Step 6: Share with Others

### Option A: Public Link (No Auth)
Just share the Static Web App URL. Users can:
- Visit URL directly in browser
- Click "Add to home screen" on mobile to install PWA
- App works offline with cached data

### Option B: Azure AD Auth (Microsoft Accounts Only)
In Static Web Apps → **Settings** → **Roles and Access Control**:
- Add authentication requirement
- Restrict to Microsoft Azure AD tenant

### Option C: Custom Domain
In Static Web Apps → **Custom domains**:
- Add your own domain (e.g., `fifa2026.example.com`)
- Share branded link with users

## Costs

### Estimate (Monthly)
- **Static Web Apps**: Free tier ($0)
- **Container Instances**: ~$5-15/month (always-on 1 CPU)
- **Container Registry**: ~$5/month (Basic tier)
- **Total**: ~$10-20/month

### Cost Optimization
- Replace Container Instances with **Azure Functions** (~$0 with free tier)
- Use **Azure App Service** Basic tier (~$5/month) with auto-scale

## Troubleshooting

### Workflow Fails at ACR Build
- Check ACR exists and is accessible
- Verify `REGISTRY_PASSWORD` is correct
- Ensure resource group name is correct

### Container Deployment Fails
- Check Container Instance quota in region
- Verify registry credentials in GitHub Secrets
- Check Container Instances logs:
  ```bash
  az container logs \
    --resource-group fifa-rg \
    --name fifa-backend
  ```

### Frontend Can't Reach Backend
- Verify `VITE_API_BASE` secret is set correctly
- Check CORS configuration in `backend/src/server.ts`
- Ensure backend Container Instance is running
- Check firewall: Container Instance port 3001 must be public

### CORS Errors
Edit `backend/src/server.ts` and update `cors()` configuration:

```typescript
app.use(
  cors({
    origin: [
      'https://your-static-web-app.azurestaticapps.net',  // Your frontend
      'http://localhost:5173',  // Local dev
    ],
  })
);
```

Then rebuild and redeploy.

## Monitoring

### Application Insights (Recommended)

1. Create Application Insights resource:
   ```bash
   az monitor app-insights component create \
     --app fifa-insights \
     --resource-group fifa-rg \
     --location eastus
   ```

2. Add connection string to Container Instance environment variables

3. View logs/performance in Azure Portal

### Simple Logs

View backend logs:
```bash
az container logs \
  --resource-group fifa-rg \
  --name fifa-backend \
  --follow
```

View Static Web App build logs:
- GitHub Actions → **Deploy FIFA 2026 App to Azure** → See step logs

## Next Steps

1. ✅ Set up resource group and ACR
2. ✅ Create Static Web App
3. ✅ Configure GitHub Secrets
4. ✅ Push to main branch
5. ✅ Verify deployments
6. ✅ Share link with users
7. (Optional) Set up custom domain
8. (Optional) Configure Azure AD authentication
9. (Optional) Add Application Insights monitoring

## Questions?

- Azure Docs: https://docs.microsoft.com/en-us/azure/
- Static Web Apps: https://docs.microsoft.com/en-us/azure/static-web-apps/
- Container Instances: https://docs.microsoft.com/en-us/azure/container-instances/

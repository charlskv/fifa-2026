# Azure Deployment Checklist

Follow this checklist to deploy the FIFA 2026 app to Azure.

## Phase 1: Azure Setup (One-time)

- [ ] **1.1** Have an active Azure subscription
- [ ] **1.2** Have access to create resources (Contributor role minimum)
- [ ] **1.3** Have GitHub account with this repo access
- [ ] **1.4** Install Azure CLI locally (`az --version`)
- [ ] **1.5** Run `az login` to authenticate

## Phase 2: Create Azure Resources

- [ ] **2.1** Create Resource Group
  - [ ] Run: `az group create --name fifa-rg --location eastus`
  - [ ] Save output

- [ ] **2.2** Create Container Registry
  - [ ] Run: `az acr create --resource-group fifa-rg --name fifaregistry --sku Basic`
  - [ ] Save: Login server URL (e.g., `fifaregistry.azurecr.io`)
  - [ ] Save: Username and password from `az acr credential show`

- [ ] **2.3** Create Static Web App (via Azure Portal)
  - [ ] Go to Portal → Static Web Apps → Create
  - [ ] Connect GitHub repo, select `main` branch
  - [ ] Set app location: `frontend`, output location: `dist`
  - [ ] Wait for creation
  - [ ] Save: Static Web App URL (e.g., `https://nice-tree-0123456.azurestaticapps.net`)
  - [ ] Save: Deployment token from Settings → Deployment token

## Phase 3: Configure GitHub Secrets

- [ ] **3.1** Go to GitHub repo → Settings → Secrets and variables → Actions

- [ ] **3.2** Create these secrets:
  - [ ] `AZURE_SUBSCRIPTION_ID` = Your subscription ID
  - [ ] `AZURE_CLIENT_ID` = Service principal app ID (or create one)
  - [ ] `AZURE_TENANT_ID` = Service principal tenant ID
  - [ ] `AZURE_CONTAINER_REGISTRY` = `fifaregistry`
  - [ ] `ACR_LOGIN_SERVER` = `fifaregistry.azurecr.io`
  - [ ] `REGISTRY_USERNAME` = ACR username
  - [ ] `REGISTRY_PASSWORD` = ACR password
  - [ ] `AZURE_RESOURCE_GROUP` = `fifa-rg`
  - [ ] `STATIC_WEB_APP_DOMAIN` = Static Web App domain (no https://)
  - [ ] `AZURE_STATIC_WEB_APPS_API_TOKEN` = Static Web App deployment token
  - [ ] `VITE_API_BASE` = Backend URL (placeholder, updated after first deployment)

## Phase 4: Deploy

- [ ] **4.1** Commit and push code to `main` branch
  ```bash
  git add .
  git commit -m "Add Azure deployment configuration"
  git push origin main
  ```

- [ ] **4.2** Go to GitHub Actions tab
  - [ ] Wait for "Deploy FIFA 2026 App to Azure" workflow to complete
  - [ ] Check for any errors in logs

- [ ] **4.3** After successful deployment:
  - [ ] Get container IP from Azure Portal or:
    ```bash
    az container show --resource-group fifa-rg --name fifa-backend --query ipAddress.ip
    ```
  - [ ] Note the IP address

## Phase 5: Configure Backend URL

- [ ] **5.1** Set `VITE_API_BASE` secret with backend IP
  - [ ] Format: `https://{IP}.nip.io:3001`
  - [ ] Example: `https://40.123.45.67.nip.io:3001`

- [ ] **5.2** Push a dummy commit to trigger redeploy
  ```bash
  git commit --allow-empty -m "Trigger redeploy with API base configured"
  git push origin main
  ```

## Phase 6: Verify Deployment

- [ ] **6.1** Test backend health endpoint
  ```bash
  curl https://your-ip.nip.io:3001/api/health
  ```
  Should return: `{"ok":true}`

- [ ] **6.2** Test backend matches endpoint
  ```bash
  curl https://your-ip.nip.io:3001/api/matches
  ```
  Should return JSON with match data

- [ ] **6.3** Visit Static Web App URL
  - [ ] Open: `https://your-static-web-app.azurestaticapps.net`
  - [ ] Should load FIFA app
  - [ ] Should display matches
  - [ ] Should be able to filter matches
  - [ ] Watch links should be clickable

- [ ] **6.4** Test PWA installation (on mobile or browser)
  - [ ] Open Static Web App URL
  - [ ] Click "Add to home screen" (mobile) or install button (desktop)
  - [ ] Verify app launches in standalone mode

## Phase 7: Share with Others

- [ ] **7.1** Share Static Web App URL with users
  - [ ] Users can open in browser
  - [ ] Users can install as PWA
  - [ ] App works offline with cached data

- [ ] **7.2** (Optional) Set up custom domain
  - [ ] Configure DNS
  - [ ] Add domain to Static Web App settings
  - [ ] Update CORS in backend if needed

- [ ] **7.3** (Optional) Add authentication
  - [ ] Static Web App → Settings → Authentication
  - [ ] Restrict to Microsoft Azure AD tenant users

## Phase 8: Monitor & Maintain

- [ ] **8.1** Monitor costs
  - [ ] Check Azure Portal → Cost Management
  - [ ] Expected: ~$10-20/month

- [ ] **8.2** Monitor app health
  - [ ] Check container logs regularly
  - [ ] Check Static Web App build logs

- [ ] **8.3** Update app
  - [ ] Make code changes
  - [ ] Push to `main`
  - [ ] GitHub Actions auto-deploys

- [ ] **8.4** Refresh match data
  - [ ] Click "Refresh From FIFA" button in app
  - [ ] Or wait for automatic refresh (optional)

## Troubleshooting

**If something goes wrong:**

1. [ ] Check GitHub Actions logs (Actions tab)
2. [ ] Check Azure Container logs: `az container logs --resource-group fifa-rg --name fifa-backend`
3. [ ] Check Static Web App build logs (in Azure Portal)
4. [ ] Verify all secrets are set correctly
5. [ ] Verify resource group exists: `az group list --output table`
6. [ ] Verify container exists: `az container list --resource-group fifa-rg`

**Common issues:**

- [ ] **CORS error**: Update `ALLOWED_ORIGINS` in backend .env, redeploy
- [ ] **Container won't start**: Check logs with `az container logs` command
- [ ] **Workflow fails**: Verify all GitHub secrets are correct and ACR exists
- [ ] **Frontend can't reach backend**: Verify `VITE_API_BASE` is correct URL

---

## Estimated Timeline

- Setup resources: 5-10 minutes
- Configure secrets: 5 minutes
- First deployment: 5-10 minutes (GitHub Actions runs)
- Verify & test: 5 minutes
- **Total: ~30 minutes**

## Support

For detailed help, see:
- [DEPLOY.md](DEPLOY.md) - Comprehensive guide
- [AZURE-COMMANDS.md](AZURE-COMMANDS.md) - Command reference
- [README.md](README.md) - Project overview

# GitHub Secrets — OpenShelf

This document lists all GitHub Actions secrets required to run CI/CD workflows.

Set these at: **GitHub → Repository → Settings → Secrets and variables → Actions → New repository secret**

---

## Required Secrets

### Azure Identity

| Secret | Description | How to get it |
|--------|-------------|---------------|
| `AZURE_CLIENT_ID` | Service principal (app) ID | See "Create Service Principal" below |
| `AZURE_TENANT_ID` | Azure Active Directory tenant ID | `az account show --query tenantId -o tsv` |
| `AZURE_SUBSCRIPTION_ID` | Azure subscription ID | `az account show --query id -o tsv` |

### Azure Container Registry (ACR)

| Secret | Description | How to get it |
|--------|-------------|---------------|
| `ACR_LOGIN_SERVER` | ACR login server hostname | e.g. `openshelf.azurecr.io` — from Azure Portal → Container Registry → Login server |
| `ACR_USERNAME` | ACR admin username | `az acr credential show --name <acr-name> --query username -o tsv` |
| `ACR_PASSWORD` | ACR admin password | `az acr credential show --name <acr-name> --query passwords[0].value -o tsv` |

> **Note:** Enable admin user first if not already:
> ```bash
> az acr update --name <acr-name> --admin-enabled true
> ```

### Vercel (Frontend)

| Secret | Description | How to get it |
|--------|-------------|---------------|
| `VERCEL_TOKEN` | Vercel personal access token | [vercel.com/account/tokens](https://vercel.com/account/tokens) → Create token |
| `VERCEL_ORG_ID` | Vercel team or personal org ID | Run `vercel whoami --token <token>` or check `.vercel/project.json` after `vercel link` |
| `VERCEL_PROJECT_ID` | Vercel project ID | Run `vercel link` in `frontend/` and check `.vercel/project.json` → `projectId` |

### Notifications (Optional)

| Secret | Description | How to get it |
|--------|-------------|---------------|
| `SLACK_WEBHOOK_URL` | Slack incoming webhook URL (optional) | Slack → App Directory → Incoming Webhooks → Add to Slack |

### Database (for importers)

| Secret | Description | How to get it |
|--------|-------------|---------------|
| `DATABASE_URL` | Full PostgreSQL connection string | Output from `infra/azure/deploy.sh` |

---

## Create Azure Service Principal

The GitHub Actions workflows use **federated credentials (OIDC)** to authenticate with Azure — no long-lived secrets needed.

### Step 1: Create the service principal

```bash
az ad sp create-for-rbac \
  --name "openshelf-github" \
  --role contributor \
  --scopes /subscriptions/{SUBSCRIPTION_ID}/resourceGroups/openshelf-rg \
  --sdk-auth
```

> Replace `{SUBSCRIPTION_ID}` with your actual subscription ID.

This outputs a JSON blob. The values map to secrets as follows:

```json
{
  "clientId":       "→ AZURE_CLIENT_ID",
  "clientSecret":   "→ (not needed for OIDC)",
  "subscriptionId": "→ AZURE_SUBSCRIPTION_ID",
  "tenantId":       "→ AZURE_TENANT_ID"
}
```

### Step 2: Add federated credential for GitHub Actions

```bash
az ad app federated-credential create \
  --id <APP_OBJECT_ID> \
  --parameters '{
    "name": "openshelf-github-actions",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:<YOUR_GITHUB_ORG>/<YOUR_REPO>:ref:refs/heads/main",
    "audiences": ["api://AzureADTokenExchange"]
  }'
```

> Get the app object ID with:
> ```bash
> az ad sp show --id <CLIENT_ID> --query appId -o tsv
> ```

### Step 3: Set repository secrets

```bash
# Using GitHub CLI (gh)
gh secret set AZURE_CLIENT_ID       --body "<clientId>"
gh secret set AZURE_TENANT_ID       --body "<tenantId>"
gh secret set AZURE_SUBSCRIPTION_ID --body "<subscriptionId>"
```

---

## Quick Reference: Get All Values at Once

```bash
#!/bin/bash
# Run after az login

RESOURCE_GROUP="openshelf-rg"
ACR_NAME="openshelf"   # your ACR name (no dashes typically)

echo "=== Azure Identity ==="
echo "AZURE_TENANT_ID=$(az account show --query tenantId -o tsv)"
echo "AZURE_SUBSCRIPTION_ID=$(az account show --query id -o tsv)"

echo ""
echo "=== ACR Credentials ==="
echo "ACR_LOGIN_SERVER=$(az acr show --name $ACR_NAME --query loginServer -o tsv)"
echo "ACR_USERNAME=$(az acr credential show --name $ACR_NAME --query username -o tsv)"
echo "ACR_PASSWORD=$(az acr credential show --name $ACR_NAME --query passwords[0].value -o tsv)"
```

---

## Verify Everything is Set

```bash
# Check all required secrets are present (doesn't show values)
gh secret list
```

Expected output should include all secrets listed above.

#!/bin/bash
# OpenShelf Azure Deployment Script
# Usage: ./deploy.sh [resource-group] [location]
#
# Example:
#   ./deploy.sh openshelf-rg eastasia

set -e

# ─── Colors ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

info()    { echo -e "${YELLOW}[INFO]${NC} $*"; }
success() { echo -e "${GREEN}[OK]${NC}   $*"; }
error()   { echo -e "${RED}[ERR]${NC}  $*" >&2; }
header()  { echo -e "\n${BOLD}${BLUE}==> $*${NC}"; }

# ─── Parameters ───────────────────────────────────────────────────────────────
RESOURCE_GROUP="${1:-openshelf-rg}"
LOCATION="${2:-eastasia}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BICEP_FILE="$SCRIPT_DIR/main.bicep"
PARAMS_FILE="$SCRIPT_DIR/parameters.prod.json"
DEPLOYMENT_NAME="openshelf-deploy-$(date +%Y%m%d%H%M%S)"

header "OpenShelf Azure Deployment"
info "Resource Group : $RESOURCE_GROUP"
info "Location       : $LOCATION"
info "Bicep template : $BICEP_FILE"
info "Parameters     : $PARAMS_FILE"

# ─── Step 1: Check az CLI ─────────────────────────────────────────────────────
header "Step 1: Checking Azure CLI"

if ! command -v az &>/dev/null; then
  error "Azure CLI (az) is not installed."
  error "Install it from: https://docs.microsoft.com/cli/azure/install-azure-cli"
  exit 1
fi
success "Azure CLI found: $(az version --query '"azure-cli"' -o tsv)"

# Check login status
if ! az account show &>/dev/null; then
  error "Not logged in to Azure. Please run: az login"
  exit 1
fi

ACCOUNT=$(az account show --query '{name:name, id:id, user:user.name}' -o json)
ACCOUNT_NAME=$(echo "$ACCOUNT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['name'])")
SUBSCRIPTION_ID=$(echo "$ACCOUNT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['id'])")
USER_NAME=$(echo "$ACCOUNT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['user'])")

success "Logged in as: $USER_NAME"
success "Subscription: $ACCOUNT_NAME ($SUBSCRIPTION_ID)"

# ─── Step 2: Create resource group ────────────────────────────────────────────
header "Step 2: Ensuring resource group exists"

if az group show --name "$RESOURCE_GROUP" &>/dev/null; then
  success "Resource group '$RESOURCE_GROUP' already exists"
else
  info "Creating resource group '$RESOURCE_GROUP' in '$LOCATION'..."
  az group create --name "$RESOURCE_GROUP" --location "$LOCATION" --output none
  success "Resource group created"
fi

# ─── Step 3: Prompt for admin password ────────────────────────────────────────
header "Step 3: Database administrator password"

if [ -z "${ADMIN_PASSWORD:-}" ]; then
  echo -n "Enter PostgreSQL admin password (min 8 chars, mix of upper/lower/digit/symbol): "
  read -rs ADMIN_PASSWORD
  echo
fi

if [ ${#ADMIN_PASSWORD} -lt 8 ]; then
  error "Password must be at least 8 characters"
  exit 1
fi
success "Password accepted"

# ─── Step 4: Deploy Bicep template ────────────────────────────────────────────
header "Step 4: Deploying Bicep template"

info "Starting deployment '$DEPLOYMENT_NAME'..."
info "This may take 10–20 minutes for first-time provisioning."

DEPLOY_OUTPUT=$(az deployment group create \
  --name "$DEPLOYMENT_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --template-file "$BICEP_FILE" \
  --parameters "@$PARAMS_FILE" \
  --parameters adminPassword="$ADMIN_PASSWORD" \
  --query properties.outputs \
  --output json)

if [ $? -ne 0 ]; then
  error "Deployment failed. Check the Azure Portal for details."
  exit 1
fi

success "Deployment completed successfully!"

# ─── Step 5: Print output endpoints ───────────────────────────────────────────
header "Step 5: Resource Endpoints"

extract() {
  echo "$DEPLOY_OUTPUT" | python3 -c "
import sys, json
data = json.load(sys.stdin)
key = '$1'
val = data.get(key, {}).get('value', 'N/A')
print(val)
"
}

BACKEND_URL=$(extract "backendUrl")
STORAGE_ENDPOINT=$(extract "storageEndpoint")
SEARCH_ENDPOINT=$(extract "searchEndpoint")
POSTGRES_HOST=$(extract "postgresHost")
STORAGE_ACCOUNT=$(extract "storageAccountName")

echo ""
echo -e "  ${GREEN}Backend API URL:${NC}      https://$BACKEND_URL"
echo -e "  ${GREEN}PostgreSQL Host:${NC}      $POSTGRES_HOST"
echo -e "  ${GREEN}Storage Endpoint:${NC}     $STORAGE_ENDPOINT"
echo -e "  ${GREEN}Storage Account:${NC}      $STORAGE_ACCOUNT"
echo -e "  ${GREEN}Search Endpoint:${NC}      $SEARCH_ENDPOINT"
echo ""

# ─── Step 6: Next steps ───────────────────────────────────────────────────────
header "Next Steps"

cat <<EOF
${YELLOW}1. Set GitHub Secrets${NC}
   See: infra/azure/github-secrets.md for a full list of required secrets.

   Quick start — run this to get ACR credentials:
     az acr credential show --name <your-acr-name> --resource-group $RESOURCE_GROUP

${YELLOW}2. Configure Vercel${NC}
   Deploy the frontend:
     cd frontend && vercel --prod

${YELLOW}3. Run Book Importers${NC}
   Trigger via GitHub Actions:
     Go to Actions → "Import Books" → Run workflow

   Or run locally:
     cd importers && python gutenberg_importer.py --limit 100

${YELLOW}4. Set up Azure Service Principal for CI/CD${NC}
   az ad sp create-for-rbac --name "openshelf-github" --role contributor \\
     --scopes /subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP \\
     --sdk-auth

${GREEN}Deployment complete! OpenShelf is ready. 📚${NC}
EOF

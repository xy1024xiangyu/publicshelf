// ──────────────────────────────────────────────────────────────────────────────
// OpenShelf — Azure AI Search (formerly Azure Cognitive Search)
// ──────────────────────────────────────────────────────────────────────────────

@description('Azure region for the search service')
param location string = resourceGroup().location

@description('Name of the Azure AI Search service (must be globally unique)')
param searchServiceName string = 'openshelf-search'

@description('Pricing tier: free | basic | standard | standard2 | standard3 | storage_optimized_l1 | storage_optimized_l2')
param sku string = 'basic'

@description('Number of replicas (1–12, depending on SKU)')
param replicaCount int = 1

@description('Number of partitions (1, 2, 3, 4, 6, or 12 depending on SKU)')
param partitionCount int = 1

// ──────────────────────────────────────────────────────────────────────────────
// Search Service
// ──────────────────────────────────────────────────────────────────────────────

resource searchService 'Microsoft.Search/searchServices@2023-11-01' = {
  name: searchServiceName
  location: location
  sku: {
    name: sku
  }
  properties: {
    replicaCount: replicaCount
    partitionCount: partitionCount
    hostingMode: 'default'
    publicNetworkAccess: 'enabled'
    networkRuleSet: {
      ipRules: []
    }
    encryptionWithCmk: {
      enforcement: 'Unspecified'
    }
    disableLocalAuth: false
    authOptions: {
      apiKeyOnly: {}
    }
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Outputs
// ──────────────────────────────────────────────────────────────────────────────

@description('HTTPS endpoint of the search service')
output searchServiceEndpoint string = 'https://${searchService.name}.search.windows.net'

@description('Resource ID of the search service')
output searchServiceId string = searchService.id

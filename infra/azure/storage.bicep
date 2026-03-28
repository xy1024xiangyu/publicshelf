// ──────────────────────────────────────────────────────────────────────────────
// OpenShelf — Azure Storage Account (book files)
// ──────────────────────────────────────────────────────────────────────────────

@description('Azure region for the storage account')
param location string = resourceGroup().location

@description('Globally unique storage account name (3–24 chars, lowercase, no hyphens)')
param storageAccountName string = 'openshelfbooks'

@description('Name of the blob container for book files')
param containerName string = 'openshelf-books'

// ──────────────────────────────────────────────────────────────────────────────
// Storage Account
// ──────────────────────────────────────────────────────────────────────────────

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: storageAccountName
  location: location
  kind: 'StorageV2'
  sku: {
    name: 'Standard_LRS'
  }
  properties: {
    accessTier: 'Hot'
    allowBlobPublicAccess: true
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
    networkAcls: {
      defaultAction: 'Allow'
      bypass: 'AzureServices'
    }
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Blob Services
// ──────────────────────────────────────────────────────────────────────────────

resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-01-01' = {
  parent: storageAccount
  name: 'default'
  properties: {
    cors: {
      corsRules: [
        {
          allowedOrigins: ['*']
          allowedMethods: ['GET', 'HEAD', 'OPTIONS']
          allowedHeaders: ['*']
          exposedHeaders: ['Content-Disposition', 'Content-Length']
          maxAgeInSeconds: 3600
        }
      ]
    }
    deleteRetentionPolicy: {
      enabled: true
      days: 7
    }
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Container (public blob access for downloadable files)
// ──────────────────────────────────────────────────────────────────────────────

resource blobContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = {
  parent: blobService
  name: containerName
  properties: {
    publicAccess: 'Blob'
    metadata: {
      purpose: 'openshelf-book-files'
    }
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Outputs
// ──────────────────────────────────────────────────────────────────────────────

@description('Resource ID of the storage account')
output storageAccountId string = storageAccount.id

@description('Primary blob service endpoint')
output blobEndpoint string = storageAccount.properties.primaryEndpoints.blob

@description('Container URL for book files')
output containerUrl string = '${storageAccount.properties.primaryEndpoints.blob}${containerName}'

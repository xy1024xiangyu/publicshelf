// OpenShelf - Master Azure Bicep Template
// Orchestrates all infrastructure resources

@description('Azure region for all resources')
param location string = 'eastasia'

@description('Project name used as a prefix for resource naming')
param projectName string = 'openshelf'

@description('Deployment environment (prod, staging, dev)')
@allowed(['prod', 'staging', 'dev'])
param environment string = 'prod'

@description('Administrator password for PostgreSQL')
@secure()
param adminPassword string

// ─── Variables ────────────────────────────────────────────────────────────────

var resourcePrefix = '${projectName}-${environment}'
var tags = {
  project: projectName
  environment: environment
  managedBy: 'bicep'
}

// ─── Modules ──────────────────────────────────────────────────────────────────

module postgres 'postgres.bicep' = {
  name: 'postgres-deployment'
  params: {
    location: location
    projectName: projectName
    environment: environment
    adminPassword: adminPassword
    tags: tags
  }
}

module storage 'storage.bicep' = {
  name: 'storage-deployment'
  params: {
    location: location
    projectName: projectName
    environment: environment
    tags: tags
  }
}

module search 'search.bicep' = {
  name: 'search-deployment'
  params: {
    location: location
    projectName: projectName
    environment: environment
    tags: tags
  }
}

module containerApp 'container-app.bicep' = {
  name: 'container-app-deployment'
  params: {
    location: location
    projectName: projectName
    environment: environment
    tags: tags
    // Pass outputs from other modules into the container app
    databaseUrl: postgres.outputs.connectionString
    storageAccountName: storage.outputs.storageAccountName
    storageEndpoint: storage.outputs.storageEndpoint
    searchEndpoint: search.outputs.searchEndpoint
    searchAdminKey: search.outputs.searchAdminKey
  }
  dependsOn: [
    postgres
    storage
    search
  ]
}

// ─── Outputs ──────────────────────────────────────────────────────────────────

@description('PostgreSQL server fully-qualified domain name')
output postgresHost string = postgres.outputs.fqdn

@description('PostgreSQL database connection string (without password)')
output postgresDsn string = postgres.outputs.publicConnectionString

@description('Azure Blob Storage endpoint')
output storageEndpoint string = storage.outputs.storageEndpoint

@description('Azure Storage account name')
output storageAccountName string = storage.outputs.storageAccountName

@description('Azure AI Search endpoint')
output searchEndpoint string = search.outputs.searchEndpoint

@description('Container App FQDN (backend API URL)')
output backendUrl string = containerApp.outputs.fqdn

@description('Container App environment name')
output containerAppEnvironmentName string = containerApp.outputs.environmentName

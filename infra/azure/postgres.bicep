// ──────────────────────────────────────────────────────────────────────────────
// OpenShelf — Azure PostgreSQL Flexible Server
// ──────────────────────────────────────────────────────────────────────────────

@description('Azure region for the server')
param location string = resourceGroup().location

@description('Name of the PostgreSQL Flexible Server')
param serverName string = 'openshelf-postgres'

@description('Administrator login username')
param adminLogin string = 'openshelf'

@description('Administrator login password')
@secure()
param adminPassword string

@description('SKU name (compute tier)')
param skuName string = 'Standard_B1ms'

@description('Name of the initial database to create')
param dbName string = 'openshelf'

// ──────────────────────────────────────────────────────────────────────────────
// PostgreSQL Flexible Server
// ──────────────────────────────────────────────────────────────────────────────

resource postgresServer 'Microsoft.DBforPostgreSQL/flexibleServers@2023-06-01-preview' = {
  name: serverName
  location: location
  sku: {
    name: skuName
    tier: 'Burstable'
  }
  properties: {
    administratorLogin: adminLogin
    administratorLoginPassword: adminPassword
    version: '16'
    storage: {
      storageSizeGB: 32
    }
    backup: {
      backupRetentionDays: 7
      geoRedundantBackup: 'Disabled'
    }
    highAvailability: {
      mode: 'Disabled'
    }
    authConfig: {
      activeDirectoryAuth: 'Disabled'
      passwordAuth: 'Enabled'
    }
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Database
// ──────────────────────────────────────────────────────────────────────────────

resource database 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2023-06-01-preview' = {
  parent: postgresServer
  name: dbName
  properties: {
    charset: 'UTF8'
    collation: 'en_US.utf8'
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Firewall rules
// ──────────────────────────────────────────────────────────────────────────────

// Allow all Azure services (0.0.0.0 → 0.0.0.0 is the Azure-services magic range)
resource allowAzureServices 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2023-06-01-preview' = {
  parent: postgresServer
  name: 'AllowAllAzureServicesAndResourcesWithinAzureIps'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Outputs
// ──────────────────────────────────────────────────────────────────────────────

@description('Fully qualified domain name of the PostgreSQL server')
output serverFqdn string = postgresServer.properties.fullyQualifiedDomainName

@description('Connection string template (replace <password> before use)')
output connectionStringTemplate string = 'postgresql+asyncpg://${adminLogin}@${serverName}:<password>@${postgresServer.properties.fullyQualifiedDomainName}:5432/${dbName}?ssl=require'

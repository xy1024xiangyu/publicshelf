// ──────────────────────────────────────────────────────────────────────────────
// OpenShelf — Azure Container App
// ──────────────────────────────────────────────────────────────────────────────

@description('Azure region for all resources')
param location string = resourceGroup().location

@description('Name of the Container App')
param containerAppName string = 'openshelf-api'

@description('Name of the Container App Environment')
param containerAppEnvName string = 'openshelf-env'

@description('Full image reference, e.g. myacr.azurecr.io/openshelf-backend:latest')
param containerImage string

@description('CPU cores allocated per replica')
param cpuCores string = '0.5'

@description('Memory allocated per replica (Gi)')
param memoryGi string = '1'

@description('Minimum number of replicas (0 = scale to zero)')
param minReplicas int = 0

@description('Maximum number of replicas')
param maxReplicas int = 10

@description('Database URL secret value')
@secure()
param databaseUrl string

@description('Secret key for session signing')
@secure()
param secretKey string

@description('Redis connection URL')
@secure()
param redisUrl string

@description('Azure Storage connection string')
@secure()
param azureStorageConnectionString string = ''

@description('Azure AI Search endpoint')
param azureSearchEndpoint string = ''

@description('Azure AI Search admin key')
@secure()
param azureSearchKey string = ''

@description('Comma-separated allowed CORS origins')
param allowedOrigins string = ''

// ──────────────────────────────────────────────────────────────────────────────
// Container App
// ──────────────────────────────────────────────────────────────────────────────

resource containerApp 'Microsoft.App/containerApps@2023-05-01' = {
  name: containerAppName
  location: location
  properties: {
    managedEnvironmentId: resourceId('Microsoft.App/managedEnvironments', containerAppEnvName)
    configuration: {
      ingress: {
        external: true
        targetPort: 8000
        transport: 'auto'
        allowInsecure: false
        traffic: [
          {
            weight: 100
            latestRevision: true
          }
        ]
      }
      secrets: [
        {
          name: 'database-url'
          value: databaseUrl
        }
        {
          name: 'secret-key'
          value: secretKey
        }
        {
          name: 'redis-url'
          value: redisUrl
        }
        {
          name: 'azure-storage-connection-string'
          value: azureStorageConnectionString
        }
        {
          name: 'azure-search-key'
          value: azureSearchKey
        }
      ]
    }
    template: {
      containers: [
        {
          name: containerAppName
          image: containerImage
          resources: {
            cpu: json(cpuCores)
            memory: '${memoryGi}Gi'
          }
          env: [
            {
              name: 'DATABASE_URL'
              secretRef: 'database-url'
            }
            {
              name: 'SECRET_KEY'
              secretRef: 'secret-key'
            }
            {
              name: 'REDIS_URL'
              secretRef: 'redis-url'
            }
            {
              name: 'AZURE_STORAGE_CONNECTION_STRING'
              secretRef: 'azure-storage-connection-string'
            }
            {
              name: 'AZURE_SEARCH_ENDPOINT'
              value: azureSearchEndpoint
            }
            {
              name: 'AZURE_SEARCH_KEY'
              secretRef: 'azure-search-key'
            }
            {
              name: 'ALLOWED_ORIGINS'
              value: allowedOrigins
            }
          ]
          probes: [
            {
              type: 'Liveness'
              httpGet: {
                path: '/health'
                port: 8000
              }
              initialDelaySeconds: 15
              periodSeconds: 30
            }
            {
              type: 'Readiness'
              httpGet: {
                path: '/health'
                port: 8000
              }
              initialDelaySeconds: 5
              periodSeconds: 10
            }
          ]
        }
      ]
      scale: {
        minReplicas: minReplicas
        maxReplicas: maxReplicas
        rules: [
          {
            name: 'http-scale-rule'
            http: {
              metadata: {
                concurrentRequests: '50'
              }
            }
          }
        ]
      }
    }
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Outputs
// ──────────────────────────────────────────────────────────────────────────────

@description('Public URL of the deployed Container App')
output containerAppUrl string = 'https://${containerApp.properties.configuration.ingress.fqdn}'

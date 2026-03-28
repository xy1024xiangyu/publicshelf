# OpenShelf 📚

> A free, multilingual digital library — classic literature for everyone, forever.

## Overview

OpenShelf is an open-source digital library platform that aggregates public-domain books from sources like Project Gutenberg and Aozora Bunko, and also accepts direct submissions from authors who wish to freely share their work. The mission is simple: **eliminate barriers to great literature**. No paywalls, no accounts required to read, no region locks. Just books.

---

## Features

- 📖 **Public Domain First** — thousands of classic works already indexed
- 🌍 **Multilingual** — English, Chinese, Japanese, German, French, and more
- ✍️ **Author Submissions** — freely licensed works accepted via an online form
- 🔍 **Full-Text Search** — powered by Meilisearch (local dev) or Azure AI Search (production)
- 📥 **Multiple Formats** — EPUB, PDF, TXT download for every title
- 📱 **Mobile-Ready** — responsive design works on any screen size
- 🌐 **Internationalised UI** — interface translated into all supported languages

---

## Tech Stack

| Layer      | Technology                                              |
| ---------- | ------------------------------------------------------- |
| Frontend   | Next.js 14 (App Router), Tailwind CSS, next-intl        |
| Backend    | FastAPI (Python 3.11), SQLAlchemy 2, Alembic            |
| Database   | PostgreSQL 16                                           |
| Search     | Meilisearch (dev) / Azure AI Search (prod)              |
| Storage    | Local filesystem (dev) / Azure Blob Storage (prod)      |
| Cache      | Redis 7                                                 |
| Infra      | Docker Compose (dev) / Azure Container Apps + Bicep     |

---

## Getting Started

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop) (or Docker + Docker Compose v2)
- [Node.js 18+](https://nodejs.org/) with npm
- [Python 3.11+](https://www.python.org/) (only required for running importers outside Docker)

### Local Development with Docker Compose

```bash
# 1. Clone the repository
git clone https://github.com/your-org/openshelf.git
cd openshelf

# 2. Copy and configure environment variables
cp .env.example .env
# Edit .env — at minimum, fill in SECRET_KEY

# 3. Start all services
docker compose up -d

# 4. Run database migrations
docker compose exec backend alembic upgrade head

# 5. Services are now available at:
#   Frontend  → http://localhost:3000  (run separately, see below)
#   Backend   → http://localhost:8000
#   Adminer   → http://localhost:8080
#   Meilisearch → http://localhost:7700
```

### Running Importers

Importers pull books from public-domain sources into the database and storage.

```bash
# Project Gutenberg importer (English, ~70 000 books)
docker compose exec backend python -m importers.gutenberg.importer --limit 500

# Aozora Bunko importer (Japanese literature)
docker compose exec backend python -m importers.aozora.importer --limit 200

# Or run locally with virtualenv:
cd importers
pip install -r requirements.txt
python -m gutenberg.importer --limit 100
```

### Running the Frontend Locally

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
# → http://localhost:3000
```

---

## Project Structure

```
openshelf/
├── backend/                   # FastAPI application
│   ├── app/
│   │   ├── models/            # SQLAlchemy ORM models
│   │   ├── routers/           # API route handlers
│   │   ├── utils/             # Helpers (slugs, encoding, …)
│   │   ├── config.py          # Settings loaded from env
│   │   └── database.py        # Async DB engine + session
│   ├── alembic/               # Database migrations
│   ├── Dockerfile
│   └── main.py                # FastAPI app entry point
│
├── frontend/                  # Next.js 14 application
│   ├── src/
│   │   ├── app/
│   │   │   └── [locale]/      # Internationalised routes
│   │   │       ├── page.tsx          # Homepage
│   │   │       ├── browse/page.tsx   # Book browser
│   │   │       ├── search/page.tsx   # Search results
│   │   │       ├── submit/page.tsx   # Author submission
│   │   │       └── book/[slug]/      # Book detail + reader
│   │   ├── components/        # Shared UI components
│   │   └── lib/               # API client + types
│   ├── messages/              # i18n translation JSON files
│   └── tailwind.config.js
│
├── importers/                 # Data ingestion scripts
│   ├── gutenberg/             # Project Gutenberg importer
│   ├── aozora/                # Aozora Bunko importer
│   └── common/                # Shared DB + storage helpers
│
├── infra/
│   ├── azure/                 # Bicep IaC templates
│   └── docker/                # Production Nginx config
│
├── db/                        # Raw SQL seeds / fixtures
├── .env.example               # Environment variable template
└── docker-compose.yml
```

---

## Book Sources

| Language | Source Name        | URL                                            |
| -------- | ------------------ | ---------------------------------------------- |
| English  | Project Gutenberg  | https://www.gutenberg.org                      |
| Japanese | Aozora Bunko       | https://www.aozora.gr.jp                       |
| Chinese  | Wikisource (ZH)    | https://zh.wikisource.org                      |
| German   | Project Gutenberg  | https://www.gutenberg.org (language filter)    |
| French   | Gallica / BnF      | https://gallica.bnf.fr                         |
| Multi    | Internet Archive   | https://archive.org/details/texts             |

---

## Azure Deployment

> A full production deployment runs on Azure Container Apps with Bicep-managed infrastructure.

```bash
# 1. Log in to Azure
az login

# 2. Create a resource group
az group create --name openshelf-rg --location eastasia

# 3. Deploy all infrastructure (Postgres, Storage, Search, Container App env)
az deployment group create \
  --resource-group openshelf-rg \
  --template-file infra/azure/container-app.bicep \
  --parameters @infra/azure/params.json

# 4. Build and push the backend image
az acr build --registry <your-acr> --image openshelf-backend:latest ./backend

# 5. Set environment variables as Container App secrets
az containerapp secret set --name openshelf-api \
  --resource-group openshelf-rg \
  --secrets database-url="<value>" secret-key="<value>"

# 6. Deploy the updated Container App revision
az containerapp update --name openshelf-api \
  --resource-group openshelf-rg \
  --image <your-acr>.azurecr.io/openshelf-backend:latest

# 7. Run importers as a one-off job
az containerapp job start --name openshelf-importer \
  --resource-group openshelf-rg
```

---

## Environment Variables

| Variable                          | Required | Description                                             |
| --------------------------------- | -------- | ------------------------------------------------------- |
| `DATABASE_URL`                    | ✅       | Async PostgreSQL DSN (`postgresql+asyncpg://…`)         |
| `AZURE_STORAGE_CONNECTION_STRING` | ✅ prod  | Azure Blob Storage connection string                    |
| `AZURE_STORAGE_CONTAINER`         | ✅ prod  | Blob container name for book files                      |
| `AZURE_SEARCH_ENDPOINT`           | ✅ prod  | Azure AI Search service endpoint URL                    |
| `AZURE_SEARCH_KEY`                | ✅ prod  | Azure AI Search admin key                               |
| `AZURE_SEARCH_INDEX_PREFIX`       |          | Index name prefix (default: `openshelf`)                |
| `REDIS_URL`                       | ✅       | Redis connection URL (`redis://host:port/db`)           |
| `SECRET_KEY`                      | ✅       | Random secret for session signing                       |
| `ALLOWED_ORIGINS`                 |          | Comma-separated CORS origins                            |
| `NEXT_PUBLIC_API_URL`             | ✅ fe    | Backend base URL used by the Next.js frontend           |

---

## Contributing

We welcome contributions of all kinds — bug fixes, new importers, UI improvements, and translations.

1. **Fork** the repository and clone your fork
2. Create a **feature branch**: `git checkout -b feat/my-feature`
3. Make your changes, write tests where applicable
4. Run the test suite: `docker compose exec backend pytest`
5. Open a **Pull Request** against `main` with a clear description
6. A maintainer will review and merge, or request changes

Please follow the existing code style (Black + isort for Python, Prettier for TypeScript).

---

## License

MIT © OpenShelf Contributors

You are free to use, modify, and distribute this software. See [LICENSE](LICENSE) for full terms.

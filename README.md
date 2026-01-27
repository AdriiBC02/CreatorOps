# CreatorOps - YouTube Channel Growth Manager

Aplicación web completa para gestionar y hacer crecer tu canal de YouTube con automatización, analytics y herramientas de procesamiento de video.

## Stack Tecnológico

| Componente | Tecnología | Puerto |
|------------|------------|--------|
| Frontend | Next.js 14 + TypeScript | 3000 |
| Backend API | Node.js + Express + TypeScript | 4000 |
| Video Processor | Python + FastAPI + FFmpeg | 8000 |
| Base de datos | PostgreSQL | 5432 |
| Cache/Queue | Redis + BullMQ | 6379 |
| Storage | MinIO (S3-compatible) | 9000 |

## Requisitos

- Node.js >= 20
- pnpm >= 9
- Python >= 3.11
- Docker y Docker Compose
- FFmpeg (para procesamiento local)

## Setup Rápido

### 1. Clonar y configurar

```bash
cd CreatorOps

# Copiar variables de entorno
cp .env.example .env

# Instalar dependencias
pnpm install
```

### 2. Iniciar servicios con Docker

```bash
# Iniciar PostgreSQL, Redis y MinIO
pnpm docker:up

# Ver logs
pnpm docker:logs
```

### 3. Configurar base de datos

```bash
# Generar migraciones
pnpm db:generate

# Aplicar migraciones
pnpm db:migrate

# (Opcional) Abrir Drizzle Studio
pnpm db:studio
```

### 4. Configurar credenciales de YouTube

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un proyecto nuevo
3. Habilita las APIs:
   - YouTube Data API v3
   - YouTube Analytics API
4. Configura OAuth 2.0:
   - Tipo: Web application
   - Redirect URI: `http://localhost:4000/auth/google/callback`
5. Copia Client ID y Client Secret a `.env`

### 5. Iniciar desarrollo

```bash
# Iniciar todos los servicios en modo desarrollo
pnpm dev
```

Esto inicia:
- Frontend: http://localhost:3000
- API: http://localhost:4000
- Video Processor: http://localhost:8000

## Estructura del Proyecto

```
CreatorOps/
├── apps/
│   ├── web/                 # Next.js Frontend
│   ├── api/                 # Node.js Backend
│   └── video-processor/     # Python Microservicio
├── packages/
│   ├── shared-types/        # TypeScript types compartidos
│   ├── database/            # Drizzle ORM schemas
│   └── queue-jobs/          # BullMQ job definitions
├── infrastructure/
│   └── docker/              # Docker Compose configs
└── docs/                    # Documentación
```

## Comandos Principales

```bash
# Desarrollo
pnpm dev              # Iniciar todos los servicios
pnpm build            # Build de producción
pnpm lint             # Linting

# Docker
pnpm docker:up        # Iniciar containers
pnpm docker:down      # Parar containers
pnpm docker:logs      # Ver logs

# Base de datos
pnpm db:generate      # Generar migraciones
pnpm db:migrate       # Aplicar migraciones
pnpm db:studio        # Abrir Drizzle Studio
```

## Funcionalidades

### Core Features (Implementado)
- [x] Login con Google OAuth2
- [x] Conexión de canal YouTube
- [x] Sincronización de videos desde YouTube
- [x] Dashboard con stats en tiempo real
- [x] Mini stats en sidebar con auto-refresh
- [x] Calendario de contenido con drag & drop
- [x] Gestión de ideas con Kanban board
- [x] Export a CSV (videos, ideas, calendario)
- [x] Filtros avanzados y búsqueda
- [x] Tema claro/oscuro/sistema
- [x] Selector de idioma (EN/ES)

### Próximas Fases
- [ ] Analytics avanzado con gráficos
- [ ] Multi-canal
- [ ] Notificaciones in-app
- [ ] AI Assistant
- [ ] Colaboración en equipo
- [ ] Integraciones (TikTok, Instagram, X)

> Ver [ROADMAP.md](./ROADMAP.md) para el listado completo de funcionalidades planificadas.
> Ver [CHANGELOG.md](./CHANGELOG.md) para el historial de cambios.

## API Endpoints

### Auth
- `GET /auth/google` - Iniciar OAuth
- `GET /auth/google/callback` - Callback OAuth
- `GET /auth/me` - Usuario actual
- `POST /auth/logout` - Cerrar sesión

### Channels
- `GET /channels` - Listar canales
- `GET /channels/:id` - Detalle de canal
- `POST /channels/:id/sync` - Sincronizar canal

### Videos
- `GET /videos` - Listar videos
- `POST /videos` - Crear video
- `PUT /videos/:id` - Actualizar video
- `POST /videos/upload-url` - Obtener URL de subida
- `POST /videos/:id/publish` - Publicar a YouTube

### Analytics
- `GET /analytics/channel/:id` - Analytics de canal
- `GET /analytics/video/:id` - Analytics de video
- `GET /analytics/video/:id/retention` - Datos de retención

## Video Processor API

### Videos
- `POST /videos/info` - Obtener info del video
- `POST /videos/transcode` - Transcodificar
- `POST /videos/normalize-audio` - Normalizar audio

### Clips
- `POST /clips/extract` - Extraer clip
- `POST /clips/detect` - Detectar clips automáticamente

### Shorts
- `POST /shorts/create` - Crear Short
- `POST /shorts/analyze-loop` - Analizar puntos de loop

### Subtitles
- `POST /subtitles/generate` - Generar subtítulos
- `POST /subtitles/burn` - Quemar subtítulos en video

### Thumbnails
- `POST /thumbnails/extract-frame` - Extraer frame
- `POST /thumbnails/grid` - Generar grid
- `POST /thumbnails/watermark` - Aplicar watermark

## Variables de Entorno

```env
# Database
DATABASE_URL=postgresql://creatorops:creatorops_password@localhost:5432/creatorops

# Redis
REDIS_URL=redis://localhost:6379

# MinIO
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin

# Google OAuth
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret

# JWT
JWT_SECRET=your_jwt_secret
```

## Desarrollo

### Añadir una nueva tabla

1. Crea el schema en `packages/database/src/schema/`
2. Exporta en `packages/database/src/schema/index.ts`
3. Ejecuta `pnpm db:generate`
4. Ejecuta `pnpm db:migrate`

### Añadir un nuevo endpoint

1. Crea el módulo en `apps/api/src/modules/`
2. Implementa controller, service y routes
3. Registra las rutas en `apps/api/src/app.ts`

### Añadir procesamiento de video

1. Crea el servicio en `apps/video-processor/src/services/`
2. Crea la ruta en `apps/video-processor/src/api/routes/`
3. Registra en `apps/video-processor/src/main.py`

## Licencia

MIT

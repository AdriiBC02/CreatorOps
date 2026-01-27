# Changelog

Todos los cambios notables en este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/lang/es/).

---

## [Unreleased]

### Pendiente
- Ver [ROADMAP.md](./ROADMAP.md) para funcionalidades futuras planificadas

---

## [0.3.0] - 2026-01-27

### Added - AI Assistant
- AI Engine con abstracción multi-proveedor (OpenAI, Anthropic, Groq)
- Routing inteligente de tareas por intención (no por modelo)
- Sistema de prompts optimizados para creación de contenido

### Added - AI Backend (`/ai/*`)
- `POST /ai/chat` - Conversación general con contexto
- `POST /ai/generate/title` - Generación de títulos optimizados
- `POST /ai/generate/description` - Generación de descripciones
- `POST /ai/generate/ideas` - Sugerencias de ideas basadas en canal
- `POST /ai/analyze/video` - Análisis de rendimiento de videos
- `POST /ai/analyze/channel` - Análisis completo del canal
- `GET /ai/status` - Estado de proveedores configurados

### Added - AI Assistant Page (`/dashboard/assistant`)
- Chat conversacional con el asistente
- Quick actions: Generar títulos, Ideas de videos, Analizar canal
- Modal para generación de títulos con opciones
- Modal para sugerencias de ideas
- Copiar respuestas al clipboard

### Added - AI Widget (Floating)
- Botón flotante en esquina inferior derecha
- Mini-chat expandible desde cualquier página
- Acciones rápidas contextuales
- Link a página completa del asistente

### Added - AI en Ideas Page
- Botón "Suggest with AI" para generar ideas automáticamente
- Modal de sugerencias con opciones para usar directamente
- Botón "Generate with AI" en descripción de ideas
- Generación automática de descripciones basadas en título

### Added - AI en Videos Page
- Botón "Analyze with AI" en cada video
- Modal de análisis con insights y sugerencias
- Análisis de título, rendimiento y audiencia
- Recomendaciones accionables para mejorar

### Changed
- Dashboard layout incluye AI Widget
- Sidebar incluye link a AI Assistant

---

## [0.2.0] - 2026-01-27

### Added - Dashboard
- Mini stats en sidebar (Subscribers, Views, Videos)
- Auto-refresh de stats al navegar entre páginas
- Botón manual de refresh en sidebar
- Stats sincronizados con datos reales de videos

### Added - Videos
- Ordenación por columnas (título, views, likes, fecha)
- Filtro por rango de fechas (From/To)
- Botón para copiar URL del video
- Links directos a YouTube Studio
- Modal de preview de thumbnail (click para ampliar)
- Export a CSV
- Botón para limpiar búsqueda
- Stats totales en footer (videos, views, likes, comments)
- Keyboard shortcut: Cmd+S para sync

### Added - Calendar
- Edición de eventos existentes
- Duplicar eventos (botón + hover action)
- Navegación rápida mes/año con dropdown
- Export a CSV
- Warning de cambios sin guardar
- Keyboard shortcut: ESC para cerrar modal

### Added - Ideas
- Kanban board con drag & drop entre columnas
- Duplicar ideas
- Copiar título al clipboard
- Export a CSV
- Contador de ideas por columna
- Warning de cambios sin guardar
- Keyboard shortcuts: N para nueva idea, ESC para cerrar modal

### Added - Settings
- Selector de idioma (English/Español)
- Persistencia de preferencia de idioma en localStorage

### Fixed
- Zod validation para campos nullable en Ideas (description, inspirationUrls)
- Zod validation para campos nullable en Calendar (scheduledTime, notes)
- Eventos del calendario desaparecían al cambiar de mes (normalización de fechas)
- Border styling en celdas vacías del calendario

### Changed
- Dashboard ahora muestra datos reales de la API
- Stats de sidebar ahora coinciden con stats de página Videos

---

## [0.1.0] - 2026-01-XX

### Added - Core
- Autenticación con Google OAuth2
- Conexión de canales de YouTube
- Sincronización de videos desde YouTube

### Added - Dashboard
- Vista general del canal
- Top videos por views
- Contenido próximo
- Ideas recientes

### Added - Videos
- Lista de videos sincronizados
- Filtros por estado (public/private/unlisted)
- Búsqueda por título
- Información de cada video (views, likes, comments, duration)

### Added - Calendar
- Vista mensual de calendario
- Crear eventos de contenido
- Estados: idea, scripting, filming, editing, ready, scheduled, published
- Tipos de contenido: long_form, short

### Added - Ideas
- Vista Kanban básica
- Estados: new, researching, approved, in_production
- Prioridades: Low, Medium, High, Urgent
- Campos: título, descripción, tipo de contenido, URLs de inspiración

### Added - Settings
- Perfil de usuario
- Selector de tema (light/dark/system)
- Gestión de canales conectados
- Sign out

### Added - Infrastructure
- Next.js 14 frontend con App Router
- Express.js API con TypeScript
- PostgreSQL con Drizzle ORM
- Docker Compose para servicios

---

## Convenciones de Commits

- `feat:` Nueva funcionalidad
- `fix:` Corrección de bug
- `docs:` Documentación
- `style:` Cambios de formato (no afectan código)
- `refactor:` Refactorización de código
- `test:` Añadir o modificar tests
- `chore:` Tareas de mantenimiento

---

## Links

- [ROADMAP.md](./ROADMAP.md) - Funcionalidades planificadas
- [README.md](./README.md) - Documentación del proyecto

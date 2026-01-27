# Changelog

Todos los cambios notables en este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/lang/es/).

---

## [Unreleased]

### Pendiente
- Ver [ROADMAP.md](./ROADMAP.md) para funcionalidades futuras planificadas

---

## [0.3.2] - 2026-01-27

### Added - Notifications Backend (`/notifications/*`)
- `GET /notifications` - Listar notificaciones del usuario (limit configurable)
- `POST /notifications` - Crear nueva notificación
- `GET /notifications/unread-count` - Obtener contador de no leídas
- `PUT /notifications/:id/read` - Marcar como leída
- `PUT /notifications/read-all` - Marcar todas como leídas
- `DELETE /notifications/:id` - Eliminar notificación
- `DELETE /notifications` - Eliminar todas las notificaciones
- `GET /notifications/preferences` - Obtener preferencias
- `PUT /notifications/preferences` - Actualizar preferencias

### Added - Database Schema
- Tabla `notifications` con campos: id, userId, type, title, message, entityType, entityId, isRead, readAt, metadata, createdAt
- Tabla `notification_preferences` con campos para cada tipo de notificación
- Índices optimizados para consultas por usuario y estado de lectura

### Added - Milestone Service
- Detección automática de hitos del canal (subscribers, views)
- Umbrales configurables (1K, 5K, 10K, 50K, 100K, 500K, 1M)
- Prevención de notificaciones duplicadas

### Added - NotificationBell Component
- Campana de notificaciones en el sidebar
- Badge con contador de no leídas (animado)
- Panel desplegable con lista de notificaciones
- Polling cada 5 segundos para actualizaciones
- Marcar como leída al hacer clic
- Botón "Marcar todas como leídas"
- Botón "Borrar todas"
- Eliminar notificaciones individuales (hover para ver botón)
- Formateo de tiempo relativo (Ahora, Hace Xm, Hace Xh, Hace Xd)

### Added - Notification Toast System
- Toasts flotantes en esquina superior derecha
- Barra de progreso animada (4 segundos) de derecha a izquierda
- Colores por tipo: milestone (amarillo), upload_complete (verde), new_comment (azul), system (gris), ai_suggestion (púrpura)
- Animación "Guardando..." cuando el toast se guarda en la campana
- Animación de vuelo hacia la izquierda al cerrar
- Reposicionamiento suave cuando se elimina un toast
- Sistema de deduplicación (30 segundos) para evitar toasts duplicados
- Refresh instantáneo de la campana vía eventos custom (`NOTIFICATION_SAVED_EVENT`)
- Soporte para notificaciones de escritorio (browser Notification API)
- Máximo 3 toasts visibles simultáneamente

### Added - UI Components
- `AnimatedCounter` - Contador animado con transiciones suaves
- `ProgressRing` - Anillo de progreso circular
- `MiniProgress` - Barra de progreso mini
- `Skeleton` / `SkeletonCard` / `SkeletonList` - Estados de carga
- `FloatingShapes` - Formas decorativas flotantes
- `GlowingBadge` - Badge con efecto de brillo
- `PulsingDot` - Punto con animación de pulso
- `ThemeToggle` - Selector de tema (light/dark/system)

### Added - Quick Stats Refresh Animation
- Animación de refresh en Quick Stats del sidebar
- Icono giratorio (`animate-spin`) mientras carga
- Atenuación de stats (opacity 50%) durante la recarga
- Delay mínimo de 500ms para feedback visual
- Animación `hover:rotate-180` en botones de refresh

### Added - CSS & Tailwind
- Keyframes: `shrink`, `slideInFromRight`, `scale-in`, `fade-in`, `shimmer`
- Clases de utilidad: `toast-progress-bar`, `animate-slide-in-right`, `animate-scale-in`
- Clases de delay: `animation-delay-*`
- Clase `stagger-cards` para animaciones escalonadas
- Nuevas variables CSS para colores del tema

### Changed
- Botones de test de notificaciones en Settings ahora muestran duración ("guarda en 4s")
- Dashboard layout incluye NotificationBell en sidebar
- Imágenes de YouTube usan `referrerPolicy="no-referrer"` (fix para Chrome)

### Fixed
- Barra de progreso funciona en todos los tipos de notificación (colores hex inline vs Tailwind JIT)
- Animación de colapso no corta la animación de vuelo (delay de 200ms)
- Timing sincronizado entre animaciones CSS y JavaScript (500ms)
- Notificaciones no se duplican al guardar en campana (sistema de deduplicación)

### Removed
- Eliminados console.log y console.error de múltiples archivos

---

## [0.3.1] - 2026-01-27

### Added - AI Actions (Chat Commands)
- El asistente ahora puede ejecutar acciones directamente desde el chat
- `CREATE_CALENDAR_EVENT` - Crear eventos en el calendario ("Añade un evento el 30 de enero")
- `CREATE_IDEA` - Crear ideas simples ("Crea una idea sobre X")
- `READ_CALENDAR` - Ver eventos próximos ("Qué tengo programado?")
- `READ_IDEAS` - Ver ideas existentes ("Muéstrame mis ideas")
- `UPDATE_CALENDAR_EVENT` - Editar eventos ("Cambia el título del evento X")
- `UPDATE_IDEA` - Editar ideas ("Actualiza la descripción de la idea X")
- `DELETE_CALENDAR_EVENT` - Eliminar eventos ("Elimina el evento X")
- `DELETE_IDEA` - Eliminar ideas ("Borra la idea X")

### Added - Smart Ideas (AI Research)
- `CREATE_SMART_IDEAS` - Investigación inteligente de ideas
- Cuando pides ideas sobre un tema específico (ej: "Crea ideas sobre videojuegos recientes con buenas críticas"), la IA investiga y sugiere ideas ESPECÍFICAS con ejemplos reales
- Sistema de confirmación: selecciona individualmente qué ideas crear
- Botones de aceptar/rechazar por idea
- Botón "Seleccionar todas" para aceptar en bloque
- Visualización de estado: pendiente, seleccionada, creada, rechazada

### Added - Auto-Refresh
- Sistema de eventos para sincronización entre componentes
- Nuevo archivo `lib/events.ts` con custom event system
- Las páginas de Calendario e Ideas se actualizan automáticamente cuando la IA crea/edita/elimina elementos
- No requiere recargar la página manualmente

### Changed
- Mejorado el sistema de detección de intenciones en prompts
- El widget flotante ahora tiene las mismas capacidades que la página del asistente
- Las acciones de eliminación dan confirmación directa (sin preguntar "¿Estás seguro?")

### Fixed
- Fechas incorrectas en creación de eventos (ahora usa la fecha actual correcta)
- Tipo de contenido en calendario (long_form en vez de video)

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

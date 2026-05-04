# TDG Dashboard — Guía de instalación

## ¿Qué necesitas antes de empezar?

- Un ordenador o servidor con **Docker** instalado (si no lo tienes, descárgalo en https://www.docker.com/products/docker-desktop)
- Acceso a la cuenta de Google del canal de YouTube de Topes de Gama

---

## Paso 1 — Crear credenciales de Google

Necesitas pedirle a Google permiso para acceder a los datos del canal. Solo se hace una vez.

### 1.1 · Crear proyecto en Google Cloud

1. Ve a https://console.cloud.google.com
2. Haz clic en "Seleccionar proyecto" → "Nuevo proyecto"
3. Nómbralo `TDG Dashboard` y pulsa "Crear"

### 1.2 · Activar las APIs de YouTube

1. En el menú lateral, ve a **APIs y servicios** → **Biblioteca**
2. Busca `YouTube Data API v3` → haz clic → **Habilitar**
3. Vuelve a la biblioteca, busca `YouTube Analytics API` → **Habilitar**

### 1.3 · Crear credenciales OAuth

1. Ve a **APIs y servicios** → **Credenciales**
2. Haz clic en **+ Crear credenciales** → **ID de cliente de OAuth**
3. Si te pide configurar la "Pantalla de consentimiento":
   - Elige "Interno" si es cuenta de Google Workspace, o "Externo" si es cuenta normal
   - Rellena solo los campos obligatorios (nombre de la app: `TDG Dashboard`)
   - En "Ámbitos", añade: `youtube.readonly`, `yt-analytics.readonly`, `yt-analytics-monetary.readonly`
   - Guarda y continúa
4. Vuelve a crear el ID de cliente:
   - Tipo de aplicación: **Aplicación web**
   - Nombre: `TDG Dashboard`
   - En "URI de redirección autorizados", añade: `http://TU-IP-O-DOMINIO:8000/api/youtube/callback`
     - Si es en local: `http://localhost:8000/api/youtube/callback`
5. Pulsa **Crear** — te dará un **Client ID** y un **Client Secret**. **Guárdalos**.

---

## Paso 2 — Configurar el archivo de variables

1. En la carpeta del proyecto, copia el archivo `.env.example` y renómbralo `.env`:
   ```
   cp backend/.env.example backend/.env
   ```
2. Ábrelo con un editor de texto y rellena los valores:

```env
SECRET_KEY=pon-aqui-cualquier-texto-largo-y-aleatorio-de-50-caracteres
ADMIN_USERNAME=admin
ADMIN_PASSWORD=tu-contraseña-segura

GOOGLE_CLIENT_ID=PEGA-AQUI-TU-CLIENT-ID.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=PEGA-AQUI-TU-CLIENT-SECRET

APP_BASE_URL=http://localhost:8000
```

> Si lo vas a usar en un servidor (no en local), cambia `localhost` por la IP o dominio del servidor.

---

## Paso 3 — Construir el frontend

La primera vez, y cada vez que haya actualizaciones del diseño, hay que construir el frontend:

```bash
cd frontend
npm install
npm run build
```

Esto genera los archivos en `backend/static/` que el servidor sirve directamente.

---

## Paso 4 — Arrancar el servidor

Desde la carpeta raíz del proyecto:

```bash
docker compose up -d
```

Listo. Abre el navegador en `http://localhost:8000` (o la IP de tu servidor).

Para pararlo:
```bash
docker compose down
```

---

## Paso 5 — Conectar el canal de YouTube

1. Entra con el usuario administrador que configuraste en el `.env`
2. Verás un botón rojo **"Conectar canal de YouTube"**
3. Pulsa y autoriza con la cuenta de Google del canal
4. El dashboard se rellenará automáticamente con los datos del canal

> **Nota importante**: la primera sincronización puede tardar 1-2 minutos. Los datos se guardan en caché durante 1 hora para no sobrecargar la API.

---

## Preguntas frecuentes

**¿Los datos son en tiempo real?**
No, YouTube Analytics tiene un retraso de 24-48 horas. Los datos se refrescan cada hora.

**¿Qué pasa si cierro el ordenador/servidor?**
Los datos quedan guardados en la base de datos. Al volver a arrancar con `docker compose up -d`, todo sigue igual.

**¿Cómo añado más usuarios del equipo?**
Próximamente habrá un panel de administración. Por ahora, contacta con el desarrollador para añadir usuarios.

**¿Es seguro?**
La herramienta solo es accesible desde la red local o con acceso al servidor. Si la expones a internet, asegúrate de usar HTTPS (habla con el desarrollador).

---

## Actualizaciones

Cuando haya nuevas versiones:

```bash
git pull
cd frontend && npm install && npm run build && cd ..
docker compose up -d --build
```

---

## Estructura de módulos (roadmap)

| Módulo | Estado | Descripción |
|--------|--------|-------------|
| 1 · Content Analytics | ✅ **Disponible** | Dashboard de analíticas del canal propio |
| 2 · Market Intelligence | 🔜 Próximamente | Análisis de canales de la competencia |
| 3 · Packaging Analyzer | 🔜 Próximamente | Rendimiento de miniaturas y títulos |
| 4 · Brand Reports | 🔜 Próximamente | Informes de menciones de marcas |
| 5 · Prospecting | 🔜 Próximamente | Búsqueda de nuevos clientes |

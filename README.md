# ShiftCal OTA Hub (Self-host Expo Updates)

Panel fullstack para autohospedar `expo-updates` con:

- Publicación OTA desde ZIP exportado (`expo export`)
- Endpoint compatible con Expo (`/api/manifest` + `/api/assets`)
- `config.json` remoto editable visualmente (WYSIWYG JSON)
- Dashboard de analíticas e insights (dispositivos, versiones, canales, uso)
- Persistencia en Supabase

## Stack elegido

- `Next.js (App Router) + TypeScript`
- `Tailwind CSS v4 + shadcn/ui`
- `Supabase Postgres` para persistencia
- `Recharts` para gráficas
- `react-json-view` para editor JSON visual

Elegí este stack porque acelera desarrollo, despliegue en VPS/Dockploy y mantenimiento, sin perder flexibilidad para escalar.

## Endpoints clave

- `GET /api/manifest`: resolución de update OTA para Expo
- `GET /api/assets?file=...`: sirve bundles/assets inmutables
- `GET /api/config`: entrega config remota para la app
- `GET /config.json`: misma config remota con nombre de archivo explícito
- `POST /api/events`: ingestión de eventos custom de analítica
- `POST /api/admin/publish`: publicar ZIP exportado
- `DELETE /api/admin/publish?id=<updateId>`: eliminar update, eventos asociados y limpiar assets huérfanos
- `GET/PUT /api/admin/config`: leer/editar config desde dashboard
- `POST /api/admin/session`: login admin

## 1) Configurar Supabase

Ejecuta `supabase/schema.sql` en tu proyecto de Supabase (SQL editor).

## 2) Variables de entorno

Copia `.env.example` a `.env` y rellena valores reales:

- `APP_BASE_URL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_TOKEN`
- `STORAGE_DIR`
- `ANALYTICS_SALT`
- opcional: `EXPO_PRIVATE_KEY_PEM` (firma de manifest)

## 3) Desarrollo local

```bash
npm install
npm run dev
```

Dashboard: `http://localhost:3000/login`

## 4) Despliegue en Dockploy (VPS)

1. Despliega con `Dockerfile`.
2. Define env vars del `.env.example`.
3. Monta un volumen persistente en la ruta de `STORAGE_DIR` (ej. `/data/shiftcal-updates`).
4. Asegura HTTPS en tu dominio (recomendado obligatorio para producción).
5. Configura límite de upload en proxy (Nginx/Traefik) para ZIPs OTA (ej. 100MB).

## 5) Integración en tu app Expo (pasos fuera de esta app)

### 5.1 Configuración `app.json` / `app.config.ts`

```json
{
  "expo": {
    "runtimeVersion": {
      "policy": "appVersion"
    },
    "updates": {
      "enabled": true,
      "url": "https://updates.tudominio.com/api/manifest",
      "requestHeaders": {
        "expo-channel-name": "production"
      }
    }
  }
}
```

### 5.2 Generar ZIP OTA desde tu proyecto Expo

```bash
npx expo export --platform ios,android --output-dir dist-update
cd dist-update
zip -r ../update-2.0.0.zip .
```

### 5.3 Publicar OTA

O desde el dashboard (`/dashboard/updates`) subiendo el ZIP,

O por CLI:

```bash
node scripts/publish-update.mjs \
  --server https://updates.tudominio.com \
  --token TU_ADMIN_TOKEN \
  --archive ./update-2.0.0.zip \
  --runtime 2.0.0 \
  --channel production \
  --app-version 2.3.1 \
  --message "Fix turnos nocturnos"
```

## 6) Remote config en la app

Consumir `GET /config.json` (o `GET /api/config`) al iniciar app y cachear resultado localmente.

## 7) Analítica recomendada

Para insights más ricos (pantallas vistas, sesión, device metadata), envía eventos custom desde la app a `POST /api/events`.

Ejemplo payload:

```json
{
  "eventType": "custom",
  "platform": "ios",
  "appVersion": "2.3.1",
  "runtimeVersion": "2.0.0",
  "deviceId": "abc-123",
  "details": {
    "name": "app_open"
  }
}
```

## Notas importantes

- Si no existe update compatible por `platform + runtimeVersion + channel`, `/api/manifest` responde `204`.
- Los assets se guardan por hash SHA-256 y se sirven con cache immutable.
- El dashboard usa `ADMIN_TOKEN` (cookie httpOnly) para proteger endpoints admin.

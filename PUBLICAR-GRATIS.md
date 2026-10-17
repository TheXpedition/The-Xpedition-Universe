# Publicar The Xpedition gratis

La plantilla `render.yaml` usa **Render Free + Supabase Free**, sin disco de pago. La web pública empieza con una base independiente de la que usas en tu computadora. Las cuentas, los mensajes y los adjuntos se conservan en Supabase aunque Render reinicie su instancia.

## 1. Crear Supabase

1. En [Supabase](https://supabase.com/dashboard), crea una organización **Free** y un proyecto llamado **TheXpeditionUniverse**.
2. Guarda la contraseña de la base de datos. No es tu contraseña de GitHub.
3. En las opciones de seguridad, desmarca **Automatically expose new tables** y activa **Enable automatic RLS**.
4. Espera a que aparezca **Healthy**.
5. Pulsa **Connect → Direct / Connection string**. Selecciona **Session pooler** y **Type: URI**.
6. Copia la cadena `postgresql://...:[YOUR-PASSWORD]@...:5432/postgres` tal como aparece, incluido `[YOUR-PASSWORD]`. La contraseña se pegará en otro campo y el servidor la codificará correctamente, aunque tenga símbolos.
7. En **Settings → API Keys**, localiza o crea una **Secret key**, que empieza por `sb_secret_`. Se usará únicamente en Render. El servidor también admite una clave heredada `service_role`; no uses una clave pública `anon` o `sb_publishable_`.
8. En el inicio del proyecto, copia la URL `https://...supabase.co`.

Las credenciales se pegan directamente en los campos privados de Render. No van en GitHub, en el HTML, en capturas de pantalla ni en el chat.

## 2. Crear el servicio gratuito de Render

1. Abre [Render](https://dashboard.render.com/). Cierra el formulario antiguo de pago y empieza de nuevo para cargar la plantilla actualizada.
2. **New → Blueprint → TheXpedition / The-Xpedition-Universe → Connect**.
3. Nombre: **The Xpedition Universe**. Rama: **main**. Blueprint Path: **render.yaml**, o deja el valor predeterminado.
4. Comprueba que se propone **un Web Service Free, sin disco ni base de datos de Render**. El almacenamiento lo aporta Supabase.
5. Completa estos cuatro valores:

| Campo en Render | Qué pegar |
|---|---|
| `DATABASE_URL` | La cadena completa de **Session pooler / URI**, conservando `[YOUR-PASSWORD]`. |
| `DATABASE_PASSWORD` | La contraseña de la base de datos que elegiste al crear el proyecto. |
| `SUPABASE_URL` | La URL `https://...supabase.co` del proyecto. |
| `SUPABASE_SECRET_KEY` | La **Secret key** `sb_secret_...` de Supabase, destinada al servidor. |

6. Crea el Blueprint y espera al despliegue. La primera instalación ejecuta `npm ci --omit=dev`, inicia el servidor, crea las tablas privadas y el depósito privado `xpedition-private`.
7. Abre el enlace HTTPS que asigne Render. El servidor detecta automáticamente esa dirección; no hace falta rellenar `PUBLIC_URL` para el dominio predeterminado.

Si creas el Web Service manualmente: **Node**, rama **main**, directorio raíz vacío, Build Command `npm ci --omit=dev`, Start Command `node server.mjs`, plan **Free**. Añade los cuatro valores anteriores y `NODE_VERSION=24`, `NODE_ENV=production`, `HOST=0.0.0.0`, `PERSISTENCE_MODE=supabase`, `SECURE_COOKIES=true`, `TRUST_PROXY=true`. Health Check Path: `/api/health`. Usa una sola instancia.

## 3. Activar Google en el dominio público

1. Copia solo el dominio de Render, por ejemplo `tu-web.onrender.com`.
2. Abre [Firebase Authentication del proyecto The Xpedition](https://console.firebase.google.com/project/the-xpedition/authentication/settings).
3. En **Settings → Authorized domains → Add domain**, añade ese dominio, sin `https://` ni rutas.
4. Comprueba que Google esté habilitado en **Sign-in method** y prueba **Continuar con Google** desde la URL pública.

Si luego usas un dominio propio, añade también ese dominio en Firebase y configura `PUBLIC_URL` con su URL HTTPS exacta en Render.

## 4. Comprobar y compartir

Abre `https://TU-DOMINIO/api/health`: debe mostrar `ok: true`, `database: postgres` y `storage: supabase`. Prueba con dos cuentas en dispositivos distintos: registro, perfil, seguimiento, mensaje, imagen, audio y grupo. Después de reiniciar el servicio en Render, los datos deben seguir presentes. Comparte la URL pública de la web; tus participantes no tienen que descargar archivos.

## Límites de los planes gratuitos

- Render Free se duerme tras 15 minutos sin tráfico y el primer acceso puede tardar aproximadamente un minuto. Incluye 750 horas mensuales compartidas por el workspace y cuotas de tráfico y compilación.
- Supabase Free incluye 500 MB de base de datos, 1 GB de archivos y 5 GB de transferencia de salida. Puede pausar proyectos tras una semana sin actividad; puedes reanudarlos en su panel.
- La web muestra errores cuando una cuota impide guardar o subir archivos. No contrata planes de pago ni amplía las cuotas automáticamente.
- Mantén copias de seguridad: Supabase Free no incluye respaldos automáticos. Esta versión usa cuentas gestionadas por nuestro servidor, no Supabase Auth; los correos de recuperación de contraseñas locales siguen pendientes de un proveedor de correo.

Cuotas consultadas en octubre de 2026; confirma las condiciones al crear los servicios: [Render Free](https://render.com/docs/free), [Supabase Free](https://supabase.com/pricing).

## Si falla el arranque

- **Falta DATABASE_PASSWORD:** conserva `[YOUR-PASSWORD]` en `DATABASE_URL` y pega la contraseña real en el campo separado.
- **Contraseña rechazada:** revisa la contraseña de la base de datos y el usuario exacto que muestra Session pooler, normalmente `postgres.REFERENCIA`.
- **No conecta / IPv6:** usa **Session pooler**, con su host y puerto reales; copia la cadena, sin inventar el nombre del servidor.
- **Error de certificado:** descarga el certificado de tu proyecto desde la configuración SSL de Supabase y añade su contenido PEM en `DATABASE_CA` en Render. El servidor exige TLS verificado; no desactiva la validación.
- **Almacenamiento no disponible:** revisa `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, la cuota y que `xpedition-private` sea privado. No hagas público el depósito para resolver un error.
- **Origen no autorizado:** elimina un `PUBLIC_URL` temporal antiguo o pon la URL HTTPS exacta que visitas. Render proporciona su URL automáticamente.
- **Datos locales ausentes:** publicar crea una base independiente. Para conservar cuentas o adjuntos locales hay que hacer una migración privada; no subas `data/` al repositorio.

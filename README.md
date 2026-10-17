# The Xpedition Universe

Sitio de temporadas, personajes y comunidad, con perfiles y mensajería en tiempo real.

## Web pública en GitHub Pages

[Abrir The Xpedition Universe](https://thexpedition.github.io/The-Xpedition-Universe/).

El enlace de GitHub Pages y sus rutas antiguas de `public/` envían a [la web completa en Render](https://the-xpedition-universe.onrender.com/), conservando la sección abierta. El servidor guarda las cuentas y conversaciones en PostgreSQL y los adjuntos privados en Supabase. `.nojekyll` conserva los archivos originales. Las copias sin servidor pueden mostrar el catálogo público y explican que la comunidad no está disponible.

## Abrir en tu equipo

Requiere **Node.js 24**. El modo local usa SQLite y no necesita instalar dependencias:

```sh
node server.mjs
```

Abre `http://localhost:3000`. En Windows puedes usar **ABRIR XPEDITION.cmd**.

## Publicar gratis

La plantilla `render.yaml` usa **Render Free** y **Supabase Free** para conservar cuentas, sesiones, conversaciones y archivos fuera de la instancia temporal de Render. Consulta [PUBLICAR-GRATIS.md](PUBLICAR-GRATIS.md) o abre **GUIA-PUBLICAR.html**.

Configura en Render `DATABASE_URL` (Session pooler), `DATABASE_PASSWORD`, `SUPABASE_URL` y `SUPABASE_SECRET_KEY`. Nunca guardes contraseñas o claves privadas en este repositorio. Render instala las dependencias con `npm ci --omit=dev` y detectamos automáticamente su URL pública. Añade ese dominio a Firebase Authentication para usar Google.

Los planes gratuitos tienen cuotas y períodos de suspensión por inactividad. La configuración no incluye recursos de pago. Supabase Free no incluye respaldos automáticos.

## Archivos

- `public/`: web completa, estilos, JavaScript, catálogo, noticias y todas las imágenes.
- `public/personajes/`, `public/backdrops/` y `public/transparent/`: personajes, fondos y logos.
- `server.mjs`: cuentas, perfiles, seguimiento, chat, grupos y permisos.
- `database.mjs`: SQLite local o PostgreSQL en un esquema privado de Supabase.
- `storage.mjs`: archivos locales o depósito privado de Supabase; el servidor comprueba la pertenencia al chat antes de entregarlos.
- `tests/`: pruebas de integración.
- `render.yaml`: servicio gratuito; `Dockerfile`: alternativa para otros alojamientos.

La carpeta `data/` contiene los datos privados locales y está excluida de Git. El despliegue usa una base independiente hasta realizar una migración privada.

## Funciones

Registro, contraseña, Google, perfiles editables, 116 personajes, seguimiento, favoritos, noticias, chats privados, grupos, presencia, lectura, escritura, respuestas, reacciones, edición, imágenes y notas de voz. Catálogo con 24 contenidos y las 14 colecciones de tops originales.

Portada con las previas de Japan, Safari, Antarctica, The Traitor 2 y Showdown 2, controles de sonido y reproducción, enlaces originales a las temporadas, logos completos y tops con números metálicos. Las fichas incluyen elencos enlazados a perfiles, géneros, tres títulos similares y reparto completo; los simuladores conservan su arte original con relleno lateral del mismo color.

Las cinco previas tienen una versión ligera para móvil en H.264/AAC, con inicio progresivo y fotogramas clave cada dos segundos. La portada admite deslizamiento horizontal y conserva el desplazamiento vertical. Un bloqueo de reproducción del navegador no pausa las otras previas; el control de reproducción permite reintentarlo. Las tarjetas del catálogo mantienen el mismo formato en todos los filtros y no muestran un borde blanco al pasar el mouse.

Los accesos de las sagas abren sus catálogos con enlaces directos. Los carruseles tienen flechas laterales al pasar el mouse, navegación por teclado y desplazamiento táctil en móvil. Los botones de las fichas se alinean a la izquierda, con los logos centrados.

## Pruebas

```sh
node --test tests/integration.test.mjs
```

Se usa una base de prueba en `work/`, sin modificar cuentas reales. También se admite un PostgreSQL **local y aislado** mediante `TEST_DATABASE_URL` para comprobar la persistencia externa. Más detalles en [LEEME.md](LEEME.md).

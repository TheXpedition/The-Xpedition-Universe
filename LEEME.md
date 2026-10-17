# The Xpedition — versión 2

Esta carpeta contiene la nueva web y su servidor. La página original se conserva en su ubicación, sin modificaciones.

## Abrirla en tu equipo

1. Haz doble clic en **ABRIR XPEDITION.cmd**. Ya tienes Node.js 24 instalado en este equipo.
2. Se abre **http://localhost:3000** en tu navegador. El servidor trabaja en segundo plano.
3. Pulsa **Únete al universo**, crea tu cuenta y elige un personaje para tu ícono.
4. Para probar un chat real: abre una ventana privada, registra una segunda cuenta y ve a Comunidad → botón de mensaje. Ambas ventanas deben estar en `http://localhost:3000`.

No abras `public/index.html` directamente: las cuentas y los mensajes necesitan el servidor. `localhost` es tu equipo; ese enlace todavía no es accesible para otras personas por internet.

Si abres una terminal en esta carpeta, también puedes ejecutar `node server.mjs`. No necesitas instalar paquetes. Para cerrarlo, usa Ctrl+C. Los datos permanecen guardados al cerrar el servidor.

## Lo que ya funciona

- Registro con usuario y correo, inicio de sesión, cierre de sesión y cambio de contraseña local con verificación de la contraseña actual.
- Acceso con Google mediante el Firebase existente; el servidor valida el token antes de abrir la sesión. También puede reconocer cuentas antiguas de Firebase con su correo y contraseña. El navegador debe permitir la ventana emergente.
- Perfil editable: nombre, biografía y selector con los 116 personajes encontrados en tus archivos.
- Seguir/dejar de seguir, contadores reales y listas de seguidores y seguidos.
- Mi lista de temporadas y simuladores guardada por cuenta.
- Chats privados y grupos con recepción en tiempo real, aviso de escritura, presencia y estado de lectura.
- Respuestas a mensajes, reacciones, edición de texto y eliminación para todos por el remitente.
- Imágenes privadas de hasta 4 MB y notas de voz de hasta 90 segundos / 6 MB, con vista previa antes de enviarlas. El micrófono requiere permiso del navegador; por internet requiere HTTPS.
- Historial guardado, carga de mensajes anteriores, búsqueda en los mensajes cargados, filtros y borradores de texto por pestaña.
- Crear grupos, cambiar nombre y foto, añadir o retirar personas, asignar moderadores/administradores y restringir quién puede escribir. Al salir el último administrador, otro miembro asume ese rol.
- Noticias con imágenes del participante o temporada de la noticia y reacciones compartidas.
- Interfaz de streaming para escritorio y celular: portada a pantalla ancha, navegación horizontal, logos oficiales transparentes, carruseles de temporadas y pósteres.
- Las 14 colecciones originales de tops están restauradas, con sus 85 posiciones, números grandes y grupos de amistades y rivalidades. Los perfiles conservan sus nueve campos de estadísticas y logros.
- Navegación por teclado y campos de formulario con etiquetas.
- House abre su página propia: https://thexpedition.github.io/The-Xpedition-House/. También se corrigieron los enlaces de las temporadas Showdown.

Los perfiles de personajes conservan las estadísticas de tu archivo. No son cuentas con contraseñas públicas: cada persona crea su cuenta de comunidad y escoge el personaje para su ícono. No se fabrican mensajes de Bonju, Dios u otros personajes.

## Dónde se guardan los datos

`data/xpedition.sqlite` contiene cuentas, sesiones, perfiles, seguidores, noticias y conversaciones. `data/uploads/` contiene imágenes y audios enviados. Esa carpeta no se publica como contenido estático. Las contraseñas se guardan como hashes scrypt con salt; las sesiones usan cookies HttpOnly; los endpoints de mensajes y adjuntos comprueban la pertenencia al chat. Los correos no aparecen en el directorio público de perfiles.

Las conversaciones son privadas mediante control de acceso del servidor. No se implementa cifrado de extremo a extremo. Quien administra el servidor tiene acceso técnico a la base de datos.

No subas `data/` a GitHub. Para un respaldo local, detén el servidor y copia **toda** la carpeta `data/`, incluidos los adjuntos. Si el servidor está encendido no copies solo el archivo SQLite, porque puede haber cambios en el archivo WAL.

## Publicarla para que entren otras personas

Abre **GUIA-PUBLICAR.html** para seguir los pasos con enlaces. Se incluye una configuración Node.js 24 para Render, un Dockerfile opcional y `render.yaml` con un disco persistente de 1 GB. El alojamiento no está contratado y todavía no existe un enlace público. El servicio y el disco pueden tener costo; debes revisar y aceptar el precio en la plataforma antes de crearlos.

GitHub Pages sirve páginas estáticas y no ejecuta este servidor. Usa un servicio con Node.js 24 o Docker y almacenamiento persistente. Esta configuración usa un único servidor SQLite; no la escales a varias instancias que escriban sobre copias diferentes de la base.

### Variables de entorno

| Variable | Uso |
|---|---|
| `PORT` | Puerto; localmente 3000. La plataforma puede asignarlo. |
| `HOST` | `127.0.0.1` local. En hosting: `0.0.0.0`. |
| `DATA_DIR` | Ruta persistente; en Render `/var/data`. |
| `PUBLIC_URL` | URL pública exacta, por ejemplo `https://tu-servicio.onrender.com`, sin barra al final. Necesaria para validar el origen detrás de un proxy HTTPS. |
| `SECURE_COOKIES` | `true` en producción con HTTPS. |
| `TRUST_PROXY` | `true` solo detrás del proxy del hosting; identifica clientes para los límites de uso. La plantilla Render lo activa. |
| `FIREBASE_API_KEY` | Opcional: clave pública web de tu proyecto Firebase si cambias de proyecto. |
| `FIREBASE_AUTH_DOMAIN` | Opcional: dominio de autenticación Firebase. |
| `FIREBASE_PROJECT_ID` | Opcional: identificador de proyecto Firebase. |

Google requiere activar el proveedor en Firebase y autorizar el dominio del hosting. La configuración existente respondió a la consulta y permite `localhost`, `the-xpedition.firebaseapp.com` y `the-xpedition.web.app`. El acceso con Google se completó en la revisión local. Para el dominio público nuevo será necesario repetir la autorización de dominio en Firebase.

## Verificación y mantenimiento

Ejecuta `node --test tests/integration.test.mjs`. Las pruebas usan una base aparte en `work/`; no modifican tus datos reales. Comprueban registro, sesiones, cambios de perfil, seguimiento, guardados, privacidad de perfiles, recepción SSE, mensajes simultáneos, reintentos sin duplicación por ID, respuestas, reacciones, permisos de edición, archivos privados, grupos, noticias y persistencia después de reiniciar.

El archivo `public/catalog.json` mantiene temporadas, personajes, noticias y estadísticas. Puedes editarlo y reiniciar el servidor para actualizar el contenido. Las fechas y textos históricos provienen de la página original; no se presentan como noticias nuevas.

Las cuentas locales aún no tienen recuperación de contraseña por correo, porque no se ha configurado un proveedor de correo. El cambio desde una sesión abierta sí funciona. Las cuentas Google gestionan su recuperación con Google. Los datos antiguos de `localStorage` y los chats de la versión HTML no se importan automáticamente; no se trasladan contraseñas públicas ni conversaciones que no acreditan su propietario.

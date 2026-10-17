# The Xpedition Universe

Sitio de temporadas, personajes y comunidad de The Xpedition, con perfiles y mensajería en tiempo real.

## Ejecutar

Requiere **Node.js 24**. No necesita instalar dependencias.

```sh
node server.mjs
```

Abre `http://localhost:3000`. En Windows también puedes usar **ABRIR XPEDITION.cmd**.

## Contenido del proyecto

- `public/`: la web completa, estilos, JavaScript, catálogo, noticias e imágenes.
- `public/personajes/`: imágenes de los personajes e íconos de perfil.
- `public/backdrops/`: fondos de temporadas y simuladores.
- `public/transparent/`: logos de las temporadas.
- `server.mjs`: cuentas, sesiones, perfiles, seguimiento y chats con SQLite.
- `tests/`: pruebas de integración del servidor.
- `render.yaml`: configuración de publicación con Node.js 24 y un disco persistente.
- `LEEME.md` y `GUIA-PUBLICAR.html`: instrucciones de uso y publicación.

La carpeta `data/` se crea al ejecutar el servidor. Contiene las cuentas, sesiones, conversaciones y adjuntos privados; está excluida de Git. El despliegue público utiliza su propia base de datos en un disco persistente.

## Funciones

- Registro, inicio de sesión, Google y perfiles editables.
- Selector con 116 personajes, seguimiento y lista de favoritos.
- Chats privados, grupos, estados de lectura, aviso de escritura y presencia.
- Respuestas, reacciones, edición de mensajes, imágenes y notas de voz.
- Administración de grupos, fotos, moderadores y permisos para escribir.
- Catálogo con 24 temporadas y simuladores, y las 14 colecciones de tops originales.

## Publicación

La plantilla de Render incluye un servicio Node.js y un disco persistente en `/var/data`. Revisa el costo del servicio y del disco antes de crearlos. Configura `PUBLIC_URL` con la dirección HTTPS exacta del alojamiento y añade ese dominio a los dominios autorizados de Firebase Authentication para usar Google.

Consulta [la guía de publicación](GUIA-PUBLICAR.html) y [la documentación de uso](LEEME.md).

## Pruebas

```sh
node --test tests/integration.test.mjs
```

Las pruebas usan una base de datos independiente en `work/`, también excluida de Git.

# AdSense de The Xpedition

El objetivo es generar ingresos mediante anuncios mientras la página y sus simuladores siguen siendo gratuitos. Las visitas y clics normales en la navegación no pagan por sí solos. Los tickets y monedas son progreso del juego, sin conversión a dinero real.

## Cuenta y verificación

El titular creó la cuenta de AdSense durante la configuración. ID público de editor: `ca-pub-3803322129950825`.

El sitio que se añade a Google es `https://the-xpedition-universe.onrender.com/`.

La web publica automáticamente la metatag de verificación `google-adsense-account` y `/ads.txt` con ese editor. Estas dos comprobaciones identifican la cuenta; no activan anuncios antes de la aprobación de Google. El ID de editor es público, no una contraseña. Se puede sustituir mediante `ADSENSE_PUBLISHER_ID` en Render.

## Pasos en AdSense

1. El titular completa directamente en Google el perfil de pagos y las verificaciones de identidad que solicite. No guardar dirección privada ni datos bancarios en el repositorio o el chat.
2. En **Sitios**, abrir el sitio, seleccionar la verificación por **Metaetiqueta** o **ads.txt** y comprobar la conexión. Ambos recursos ya están preparados en el servidor.
3. Solicitar revisión. Los anuncios y los ingresos no se garantizan por instalar el código: el sitio debe ser aprobado por Google.
4. Tras la aprobación, configurar privacidad y mensajes/consentimiento en AdSense y crear una unidad de display. Revisar anuncios automáticos antes de habilitarlos para no invadir el chat ni el juego.
5. Introducir la unidad real y activar la configuración cuando esos pasos estén completos.

## Configuración de anuncios

Por defecto los anuncios están apagados; no se carga el SDK de anuncios ni se reservan cuadros vacíos.

```text
ADSENSE_PUBLISHER_ID=ca-pub-3803322129950825
ADSENSE_DISPLAY_SLOT=<ID de la unidad real de display>
ADSENSE_ENABLED=false
ADSENSE_SITE_APPROVED=false
ADSENSE_CONSENT_READY=false
```

Una vez aprobados sitio y unidad y configurado el consentimiento, cambiar las tres últimas variables a `true`. La integración de unidades manuales sirve publicidad en Inicio, Explorar, Noticias y El universo. No coloca unidades dentro del chat, perfiles, publicaciones o decisiones del simulador. Si falla la carga, retira el espacio y la navegación continúa.

No se otorgan monedas o tickets por pulsar anuncios de display. Los clics en espacios publicitarios se excluyen del contador de recompensas de exploración.

## Videos voluntarios con recompensa

Se requieren una cuenta y una unidad autorizada para ese formato. Un anuncio de AdSense de display no se puede presentar como video recompensado. Google Publisher Tag ofrece anuncios recompensados mediante Ad Manager.

Antes de habilitarlos se debe implementar consentimiento, recompensa exacta, disponibilidad/cierre, evento `rewardedSlotGranted`, acreditación única y límites en el servidor. Los eventos de GPT web son del cliente, no una prueba criptográfica del servidor. No hay una ruta pública para autoconcederse monedas por publicidad ni anuncios simulados en el producto actual.

## Fuentes oficiales

- https://support.google.com/adsense/answer/9724?hl=es
- https://support.google.com/adsense/answer/12171612?hl=es
- https://developers.google.com/publisher-tag/samples/display-rewarded-ad

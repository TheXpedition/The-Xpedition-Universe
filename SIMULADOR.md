# Simulador y progreso compartido

`/simulator/` usa la sesión HttpOnly de la web. El selector, los motores y las imágenes de cada temporada se sirven desde el mismo dominio. No se comparten tokens por URL ni se abre CORS a otros dominios. Los motores de House y The Traitor se abren desde el mismo marco con los mismos controles de cuenta y tienda.

## Catálogo y desbloqueos

La fuente de precios, talentos, pronombres y artículos iniciales es `public/simulator/catalog.json`. Incluye los 152 personajes actuales. Los elencos de Safari y Antarctica, más Dua Lingo, forman los 36 personajes disponibles desde el inicio. Bonju es anfitriona y personaje especial de tienda. Vladimir, Lily Louvre, Daniel Sims y Alex Yohender se reclaman por cero monedas. Los otros personajes normales cuestan 65 monedas; once especiales cuestan 220 y Bonju 300.

| Temporada | Nivel | Monedas |
| --- | ---: | ---: |
| Antarctica | 1 | Incluida |
| Safari | 2 | Incluida |
| Cruise | 3 | 180 |
| House | 4 | 240 |
| The Traitor | 5 | Incluida |
| Race | 6 | 360 |
| Vs. The World | 7 | 900 |
| Japan | — | Próximamente |

La cuenta conserva los artículos comprados. Solo esos artículos y los iniciales aparecen en las elecciones. Los desafíos obligatorios del formato están incluidos; hay suficientes retos iniciales para completar una temporada. El catálogo completo de personajes se conserva para la presentación de anfitriones y la tienda.

## Dos economías

`progression.mjs` calcula los saldos en el servidor. El navegador no decide precios, premios ni niveles.

- Tickets: bienvenida 15, biografía 20, cada dato de identidad/pronombres/orientación y cambio de ícono 10 una vez, primer seguimiento 1, primer seguidor recibido 1 y primer añadido a Mi lista 5. Esos reconocimientos permanecen al borrar o quitar el elemento.
- Comunidad: publicaciones 5 (3/día), comentarios 2 (5/día), conversación 1 por chat (10/día) y grupo 5 por conjunto de miembros (3/día). El texto repetido se reconoce una sola vez al día.
- Exploración: primera visita de página 1 (12/día), interacción 1 (5/día), scroll 2 (8/día), página completa 3 (5/día) y previa 2 (5/día). Tiempo activo: 2 tickets cada 5 minutos, hasta seis intervalos diarios. El cliente pausa la medición al ocultar la pestaña o perder actividad.
- Simulador: bienvenida de 80 monedas, visita diaria 30, compra o regalo reclamado 2 tickets y 5 XP. Empezar partida da 1 ticket hasta ocho veces al día. Cada nueva decisión manual da 1 ticket, 2 monedas y 4 XP; avanzar o usar azar da 1 moneda y 1 XP. Máximo 40 decisiones premiadas por partida, con una pausa mínima y sin repetir la misma decisión en el episodio.
- Episodio: 2 tickets, 6 monedas y 12 XP, una vez por episodio y partida. Tiempo activo: 2 monedas y 4 XP cada dos minutos, hasta quince intervalos diarios. El servidor limita el tiempo contado por cada llamada.
- Final: 40 tickets, 65 monedas y 60 XP; hasta tres finales premiadas al día. Vs. The World añade 30 tickets/monedas si gana la delegación o 60 con una representante en solitario, más 30 XP. Los representantes se fijan al confirmar el elenco.
- Nivel: umbrales de XP acumulada `0, 60, 170, 340, 580, 900, 1320, 1850, 2500, 3300`, luego 1000 por nivel. Cada ascenso entrega 3 tickets y `20 + nivel × 10` monedas.

Las cuentas existentes reciben su bienvenida y los reconocimientos de datos ya completados la primera vez que vuelven a cargar su sesión. El historial y el saldo son privados.

## Guardado

Los motores originales se conservan en `public/simulator/game/`, `house/` y `traitor/`. Los puntos de control exponen las variables del formato y los renderizadores necesarios para reconstruir la vista con sus controles. `bridge.js` conserva objetos, Sets, Maps y el estado del generador aleatorio. Al recuperar se reconstruye el último punto de control; las animaciones incompletas pueden empezar de nuevo sin cambiar los episodios terminados.

`simulator.js` guarda después de cada punto de control y conserva una copia local separada por usuario para un cierre accidental o una interrupción de red. El guardado principal está en la cuenta y funciona en otro dispositivo. Una revisión creciente evita sobrescribir una partida abierta en otra ventana. Solo hay una partida activa; archivar permite iniciar otra y conserva el guardado anterior en Mis partidas. Las temporadas terminadas también se pueden consultar.

Las tablas `user_progression`, `economy_rewards`, `economy_inventory`, `activity_days` y `game_runs` se crean de forma aditiva en SQLite y PostgreSQL. PostgreSQL mantiene RLS y el esquema privado que ya usa la comunidad. Las compras son transacciones con débito condicional y clave única; los reconocimientos usan claves únicas por usuario.

El juego se simula en el navegador. El servidor verifica cuenta, propiedad de la partida, inventario de las decisiones, límites, saldo y nivel; no vuelve a ejecutar toda la temporada. Las recompensas de juego no equivalen a un sistema de competición con resultados calculados por un servidor autoritativo.

## Validación

`npm ci` y `npm test`. Las pruebas usan cuentas y bases aisladas. Cubren sesión compartida, privacidad, precios, regalos, idempotencia, bloqueos, saldo insuficiente, límites, finales, bonus de delegación y persistencia. Los motores se ejecutan en JSDOM para comprobar recuperación de Antarctica, Safari, Cruise, Race, House y The Traitor, así como representantes y estadísticas de Vs. The World. También se verifica que el primer episodio terminado conserva sus resultados y puede avanzar después de reabrirlo.

Los recursos de los motores provienen de los archivos locales proporcionados para esta integración; los PNG grandes se optimizaron en las copias publicadas.

# Voces de Ice Breaker

Las frases de los personajes fueron suministradas por The Xpedition. Las grabaciones son voces sintéticas de Piper o Microsoft, con los ajustes de interpretación descritos abajo. No son grabaciones de los intérpretes de ninguna serie.

- **Bayron:** modelo `es_MX-ald-medium`, corpus ALD de rmcpantoja, Unlicense. Interpretación infantil obtenida mediante ajuste de tono y velocidad; volumen normalizado. Fuente: https://huggingface.co/rhasspy/piper-voices/blob/main/es/es_MX/ald/medium/MODEL_CARD
- **Felix:** modelo `es_ES-davefx-medium`, corpus de OHF Voice Datasets, CC0. Ajustes de tono, velocidad y volumen. Fuente: https://huggingface.co/rhasspy/piper-voices/blob/main/es/es_ES/davefx/medium/MODEL_CARD
- **Andromeda:** modelo `es_ES-sharvard-medium`, hablante F. Corpus SHarvard de Vincent Aubanel, Maria Luisa Garcia Lecumberri y Martin Cooke (2014), LISTA Consortium, https://doi.org/10.7488/ds/75 . Licencia CC BY 3.0 según la ficha del modelo: https://huggingface.co/rhasspy/piper-voices/blob/main/es/es_ES/sharvard/medium/MODEL_CARD . Nuevas frases sintetizadas; velocidad y volumen ajustados. Licencia: https://creativecommons.org/licenses/by/3.0/
- **Dani:** grabaciones ya integradas, sintetizadas con Microsoft Sabina Desktop.
- **Isabel:** `es_MX-claude-high`, conjunto de HirCoir/Piper-TTS-Spanish, licencia Apache 2.0. Interpretación rápida y brillante mediante ajustes de tono y ritmo. Fuente: https://huggingface.co/rhasspy/piper-voices/blob/main/es/es_MX/claude/high/MODEL_CARD
- **Peggy y Vita:** `es_ES-sharvard-medium`, hablante F, con las atribuciones y licencia CC BY 3.0 indicadas arriba. Peggy utiliza una interpretación pausada y de registro alto; Vita, registro bajo y ritmo firme. Nuevas frases sintetizadas; tono, velocidad y volumen adaptados.
- **Eris:** `es_ES-davefx-medium`, CC0, con tono elevado y entrega teatral, distinta del registro grave de Felix.
- **Ximena:** `es_AR-daniela-high`, corpus OpenSLR 61, copyright 2018, 2019 Google, Inc., licencia CC BY-SA 4.0. Modelo de larcanio, interpretación firme y volumen normalizado. Ficha: https://huggingface.co/rhasspy/piper-voices/blob/main/es/es_AR/daniela/high/MODEL_CARD . Corpus y autores: https://www.openslr.org/61/ . Licencia: https://creativecommons.org/licenses/by-sa/4.0/

Piper (motor utilizado fuera de la aplicación web): https://github.com/OHF-Voice/piper1-gpl . Los modelos y el motor no se envían al navegador ni se alojan en el servidor del juego; se distribuyen únicamente los WAV resultantes.

## Iñaella, Daelly, Coronel, Julián, Alexandro, Catalina y Luciano

Audios sintetizados con voces neuronales de Microsoft mediante la herramienta de preparación `edge-tts` (https://github.com/rany2/edge-tts), fuera del navegador. El juego reproduce archivos WAV ya generados y no envía diálogos a un servicio de voz durante las partidas.

| Personaje | Voz | Interpretación aplicada |
| --- | --- | --- |
| Iñaella Rose | es-ES-XimenaNeural | Ritmo pausado, registro elevado y vibrato suave para una entonación melódica. |
| Daelly | es-PE-CamilaNeural | Registro agudo y ritmo suave. |
| Coronel | es-MX-JorgeNeural | Registro grave, ritmo pausado y realce suave de frecuencias bajas. |
| Julián | es-CO-GonzaloNeural | Voz colombiana, ritmo ligero. |
| Alexandro | es-ES-AlvaroNeural | Español castellano, ritmo dinámico. |
| Catalina | es-VE-PaolaNeural | Registro alto, ritmo rápido y expresivo. |
| Luciano | es-AR-TomasNeural | Registro elevado y ajuste adicional de tono y velocidad para una voz caricaturesca. |

Todas estas grabaciones se normalizaron y convirtieron a PCM mono de 22.050 Hz. Las frases nuevas y corregidas de Dani conservan Microsoft Sabina Desktop. La voz de Luciano es una interpretación sintética caricaturesca; no es una grabación de Mickey Mouse ni de su actor de doblaje.

## Ignacio Ricci, Lalamila, Lucas Mendez, Cocomong, Bryan Montalvo, Beto, Greg y Sal Lua

46 frases nuevas sintetizadas con voces neuronales de Microsoft mediante `edge-tts`, preparadas y convertidas fuera de la aplicación. Misma normalización a PCM mono de 22.050 Hz.

| Personaje | Voz | Interpretación aplicada |
| --- | --- | --- |
| Ignacio Ricci | es-CL-LorenzoNeural | Registro bajo, ritmo pausado y realce suave de graves. |
| Lalamila | es-VE-PaolaNeural | Registro femenino joven y ritmo ligero. |
| Lucas Mendez | es-DO-EmilioNeural | Voz dominicana masculina, ritmo dinámico. |
| Cocomong | es-PE-AlexNeural | Tono y velocidad adaptados a una voz infantil; vibrato en el llanto. |
| Bryan Montalvo | es-PR-VictorNeural | Voz masculina cálida, coqueta y pausada. |
| Beto | es-EC-LuisNeural | Voz masculina joven y natural. |
| Greg | es-CO-SalomeNeural | Tono femenino alto y ritmo rápido. |
| Sal Lua | es-BO-MarceloNeural | Registro elevado y vibrato cómico suave. |

## Ivy, Eduard, Kim Camila, Carlos Harrington, Nahuee, Pier, Esteban y Marcos

43 frases escritas para estos personajes y sintetizadas con voces neuronales de Microsoft mediante `edge-tts`, fuera del navegador. Se normalizaron a PCM mono de 22.050 Hz. El juego reproduce los WAV locales; no envía los diálogos a un servicio de voz durante las partidas.

| Personaje | Voz | Interpretación aplicada |
| --- | --- | --- |
| Ivy | es-MX-DaliaNeural | Ritmo seguro y registro ligeramente elevado para una entrega arrogante. |
| Eduard | es-VE-SebastianNeural | Voz venezolana masculina, ritmo rápido y tono cómico. |
| Kim Camila | es-CO-SalomeNeural | Voz femenina de registro más grave y fraseo firme. |
| Carlos Harrington | es-US-AlonsoNeural | Voz masculina en español, dicción clara y cadencia tranquila. |
| Nahuee | es-VE-PaolaNeural | Tono muy agudo y ritmo rápido. |
| Pier | es-MX-JorgeNeural | Registro muy grave y ritmo pausado, con tono oscuro. |
| Esteban | es-CO-GonzaloNeural | Voz masculina joven y directa. |
| Marcos | es-VE-SebastianNeural | Voz venezolana masculina, cálida, grave y pausada. |

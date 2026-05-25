# BABYLON.IA - Modelos Cognitivos e Integración (Omni-Channel)

BABYLON.IA soporta una de las matrices cognitivas más grandes del mercado actual, permitiendo cambiar el núcleo de inferencia lógica de tu orquestador al vuelo utilizando el comando:

```bash
babylonia models
```

## Familia de Modelos Soportados
Al iniciar `babylonia onboard` o `babylonia models`, el CLI te ofrecerá integrar motores de razonamiento que van desde la vanguardia propietaria hasta el Edge Computing Local.

### 1. Google Gemini (Por Defecto)
El sistema está construido primariamente sobre las directivas de Google GenAI.
- **`gemini-3.1-pro-preview`**: Máximo razonamiento lógico actual.
- **`gemini-3.1-flash`**: Equilibrio perfecto entre velocidad e inteligencia.
- **`gemini-3.0-pro`**: Version estable con altas capacidades lógicas.
- **`gemini-2.5-pro`** y **`gemini-2.5-flash`**: Modelos legados estables de uso general.
- **`gemini-2.0-flash-lite-preview-02-05`**: Ultra ligero, ideal para despliegues masivos.

### 2. Anthropic Claude (Vía API o Bridge)
Modelos top para redacción y análisis de código profundo.
- `claude-3-7-sonnet-20250219`
- `claude-3-5-haiku-20241022`
- `claude-3-opus-20240229`

*(Requiere configurar un puente API local o sustituir la validación nativa GenAI en `src/agent_core.js` usando librerías como LangChain o el SDK de Anthropic).*

### 3. Alternativas de Alto Rendimiento (Groq, xAI, China AI)
- **Kimi (Moonshot AI)**: `moonshot-v1-auto`. Extraordinario para contextos largos y análisis documental masivo.
- **MiniMax**: `abab6.5s-chat`. Altísima eficiencia y coste reducido.
- **Grok 2**: `grok-2-latest`. Respuestas directas, sin filtros agresivos.
- **DeepSeek R1**: Excelente para lógica matemática y coding (vía Groq o DeepSeek API).

#### ¿Cómo integrar MiniMax, Kimi o DeepSeek nativamente?
Dado que `agent_core.js` utiliza el SDK `@google/genai` por defecto para las peticiones API, para utilizar estos modelos alternativos debes:
1. **Opción A (OpenAI Bridge)**: Kimi, MiniMax y Groq exponen URLs compatibles con la API de OpenAI. Puedes modificar `src/agent_core.js` para inicializar el cliente genérico de OpenAI apuntando a sus respectivos `baseURL` y pasando sus API Keys en tu `.env`.
2. **Opción B (Local Proxy)**: Ejecuta una herramienta como [LiteLLM](https://github.com/vllm-project/vllm) o Proxy de terceros que intercepte peticiones de OpenAI/Gemini y las redirija a estos proveedores.

### 4. Edge & Local Computing (Ollama y Llama.cpp)
BABYLON.IA brilla por su capacidad de correr completamente offline en sistemas embebidos, Laptops, y dispositivos móviles Android vía Termux.

**Modelos Destacados:**
- `ollama:gemma3:27b` y `ollama:gemma3:4b`: La familia Gemma 3 corriendo en local.
- `aiedge:gemma-3-4b-it`: Para ejecución nativa (NPU/CPU) extrema sin Ollama.
- `ollama:qwen2.5:0.5b` y `ollama:llama3.2:1b`: Los reyes absolutos para correr en Android (Termux) con < 3GB de RAM asignada.

#### Despliegue Local (Ollama)
1. Instala [Ollama](https://ollama.com/).
2. Descarga el modelo: `ollama run gemma3:4b`.
3. Ejecuta `babylonia models` y selecciona `ollama:gemma3:4b`.
4. BABYLON.IA enrutará (vía `src/agent_core.js` o scripts Python subyacentes del proyecto) las inferencias al puerto `localhost:11434` de forma automática.

*(Nota: La integración 100% nativa sin dependencias de Python requiere actualizar la sección de inferencia local en `agent_core.js` para hacer `fetch` directamente a la API REST de Ollama).*

# BABYLON.IA
*Agente Autónomo Multi-Canal (WhatsApp + Gemini OAuth) con Arquitectura Geist.*

**Autor:** Juan Esteban Gómez Bernal

## Visión General
**BABYLON.IA** es la materialización en código de la Síntesis Escohotado-Kojève. Es un agente autónomo descentralizado que se comunica a través de WhatsApp, utilizando tu propio teléfono como puente para orquestar tareas locales y flujos B2B (como el Proyecto Babilonia China) en tu PC.

Para lograr esto sin costos de API abusivos, el repositorio implementa un **Auth-Bridge** que lee y utiliza el token `OAuth 2.0` generado por la interfaz de línea de comandos (CLI) de Gemini local.

## Características Clave
- **WhatsApp Web Integration (`whatsapp-web.js`):** El usuario envía un comando como `!geist resume la importación`.
- **Gemini OAuth Bridge:** Lee `~/.gemini/oauth_creds.json` para enrutar el análisis hacia el LLM.
- **OpenClaw Backend:** Orquestación (Bucle Dialéctico) del *framework* para ejecutar bash, leer excels y escribir documentos autónomamente.
- **Terminal Fancy UX:** Diseños dinámicos en consola usando `chalk`, `gradient-string` y `figlet`.

## Instalación en Windows
Abre tu PowerShell como Administrador y ejecuta:

```powershell
# 1. Clona el repositorio
git clone https://github.com/DOMINUSBABEL/BABYLON.IA.git
cd BABYLON.IA

# 2. Ejecuta el script de instalación (Instala Node.js Dependencies y verifica Gemini Auth)
.\install.ps1

# 3. Arranca el Agente BABYLON.IA
.\start.ps1
```

## Uso
Una vez ejecutado `.\start.ps1`, el sistema mostrará una animación en terminal y desplegará un **Código QR**.
1. Escanéalo con la sección "Dispositivos Vinculados" de tu WhatsApp.
2. Desde tu propio celular (o cualquier chat), envía un mensaje: `!geist Eres libre. Inicia el protocolo de comercio espontáneo.`
3. BABYLON.IA tomará el control en la terminal de tu PC y responderá vía WhatsApp al concluir la tarea.

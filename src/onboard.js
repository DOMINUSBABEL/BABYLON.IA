import { input, select, checkbox, confirm } from '@inquirer/prompts';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

export async function runOnboard() {
  console.log(chalk.cyan(`\n================================================`));
  console.log(chalk.bold.hex('#FFD700')(` BABYLON.IA - SECUENCIA DE INICIO (ONBOARD)`));
  console.log(chalk.cyan(`================================================\n`));

  console.log(chalk.gray('Iniciando configuración interactiva del Agente BABYLON.IA...\n'));

  // 1. Gemini Configuration
  const linkGeminiCLI = await confirm({ message: '¿Deseas enlazar el agente usando el perfil OAuth actual de Gemini CLI? (Recomendado)' });
  let geminiApiKey = '';
  if (!linkGeminiCLI) {
      geminiApiKey = await input({ message: 'Introduce tu API Key de Gemini:' });
  }

  // 2. Select Model
  const model = await select({
    message: 'Selecciona el modelo cognitivo a utilizar:',
    choices: [
      { name: 'gemini-3.1-pro-preview (Súper-Inteligencia, máximo razonamiento)', value: 'gemini-3.1-pro-preview' },
      { name: 'gemini-3.0-pro (Avanzado, reasoning superior)', value: 'gemini-3.0-pro' },
      { name: 'gemini-2.5-pro (Avanzado, razonamiento complejo)', value: 'gemini-2.5-pro' },
      { name: 'gemini-2.5-flash (Rápido, respuestas instantáneas)', value: 'gemini-2.5-flash' },
      { name: 'gemini-2.0-flash-lite-preview-02-05 (Experimental)', value: 'gemini-2.0-flash-lite-preview-02-05' },
      { name: 'ollama:gemma2 (Local Open Source - Optimizado)', value: 'ollama:gemma2' },
      { name: 'ollama:qwen2.5 (Local Open Source - Rápido)', value: 'ollama:qwen2.5' }
    ]
  });

  // 2.5 Select Environment
  const environment = await select({
    message: 'Selecciona el entorno de despliegue (afecta el consumo de recursos y dependencias de UI):',
    choices: [
      { name: 'Desktop (PC/Mac/Linux) - Modo estándar', value: 'desktop' },
      { name: 'Mobile Terminal (Termux/iSH en Android/iOS) - Bajo consumo, Puppeteer ligero', value: 'mobile_terminal' }
    ]
  });

  // 3. Platform integrations
  const platforms = await checkbox({
    message: 'Selecciona las plataformas donde el agente estará activo (Usa la barra espaciadora):',
    choices: [
      { name: 'WhatsApp Web', value: 'whatsapp' },
      { name: 'Dashboard Web Local (Chat Interno)', value: 'web', checked: true },
      { name: 'Telegram Bot', value: 'telegram' },
      { name: 'X (Twitter)', value: 'twitter' }
    ]
  });

  // 4. Skills / Features
  const features = await checkbox({
    message: 'Activa funciones y herramientas (Skills/MCPs) para el agente:',
    choices: [
      { name: 'Acceso a Búsqueda Web (Google Search)', value: 'google_search', checked: true },
      { name: 'Ejecución de Código en Sandbox', value: 'code_execution' },
      { name: 'MCP: Explorador de Archivos', value: 'mcp_file_explorer', checked: true },
      { name: 'MCP: Administrador de Memoria (Geist)', value: 'mcp_geist_memory', checked: true }
    ]
  });

  // 5. Workspace / Sandbox directory
  const defaultWorkspace = path.join(rootDir, 'workspace');
  let workspaceDir = await input({
    message: 'Ruta para el Sandbox/Workspace del agente (donde operará con archivos):',
    default: defaultWorkspace
  });

  workspaceDir = path.resolve(workspaceDir);
  if (!fs.existsSync(workspaceDir)) {
    fs.mkdirSync(workspaceDir, { recursive: true });
    console.log(chalk.green(`  [+] Carpeta Workspace creada en: ${workspaceDir}`));
  }

  // Extra configs per platform
  let telegramToken = '';
  if (platforms.includes('telegram')) {
      telegramToken = await input({ message: 'Introduce el Token de tu Bot de Telegram (obtenido en BotFather):' });
  }

  let twitterBearer = '';
  if (platforms.includes('twitter')) {
      twitterBearer = await input({ message: 'Introduce el Bearer Token de la API de X (Twitter):' });
  }

  // Save to .env
  const envPath = path.join(rootDir, '.env');
  const envContent = `
# Configuración generada por babylon.ia onboard
ENVIRONMENT=${environment}
GEMINI_MODEL=${model}
USE_GEMINI_CLI_OAUTH=${linkGeminiCLI ? 'true' : 'false'}
GEMINI_API_KEY=${geminiApiKey}

# Plataformas Activadas (separadas por coma)
ENABLED_PLATFORMS=${platforms.join(',')}

# Entorno de Trabajo
WORKSPACE_DIR=${workspaceDir}

# Herramientas y Skills
ENABLED_SKILLS=${features.join(',')}

# Tokens Específicos
TELEGRAM_BOT_TOKEN=${telegramToken}
TWITTER_BEARER_TOKEN=${twitterBearer}
  `.trim();

  fs.writeFileSync(envPath, envContent, 'utf-8');
  console.log(chalk.green(`\n[✓] Configuración guardada exitosamente en ${envPath}`));
  console.log(chalk.magenta(`\nEl Agente BABYLON.IA está configurado. Inicia el motor usando:`));
  console.log(chalk.cyan(`  babylonia gateway\n`));
}

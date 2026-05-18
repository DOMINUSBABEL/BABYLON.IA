import { input, select, checkbox, confirm } from '@inquirer/prompts';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { fileURLToPath } from 'url';
import CFonts from 'cfonts';
import gradient from 'gradient-string';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function showOnboardBanner() {
    console.clear();
    const termWidth = process.stdout.columns || 80;
    const isMobile = termWidth < 70;

    CFonts.say(isMobile ? 'BABYLON' : 'BABYLON.IA', {
        font: isMobile ? 'simpleBlock' : 'block',
        align: 'center',
        colors: ['#00aaff', '#ffd700'],
        background: 'transparent',
        letterSpacing: 1,
        lineHeight: 1,
        space: true,
        maxLength: '0',
        gradient: ['#0000ff', '#ffd700'],
        independentGradient: false,
        transitionGradient: true,
        env: 'node'
    });

    const babylonGradient = gradient(['#0000aa', '#0000ff', '#ffd700']);

    if (!isMobile) {
        const city = [
            "                                       /\\                                          ",
            "                                      |::|                                          ",
            "                                     < ++ >                                         ",
            "                                      |::|                                          ",
            "         _/\\_                         /++++\\                         _/\\_           ",
            "        |    |                       /++++++\\                       |    |          ",
            "       /      \\                     |========|                     /      \\         ",
            "      |        |                   /++++++++++\\                   |        |        ",
            "     /__________\\                 /++++++++++++\\                 /__________\\       ",
            "     |==========|                |==============|                |==========|       ",
            "    /++++++++++++\\              /++++++++++++++++\\              /++++++++++++\\      ",
            "   /++++++++++++++\\            |==================|            /++++++++++++++\\     ",
            "   |==============|           /++++++++++++++++++++\\           |==============|     ",
            "  /++++++++++++++++\\         /++++++++++++++++++++++\\         /++++++++++++++++\\    ",
            "  |================|        |========================|        |================|    ",
            " /++++++++++++++++++\\      /++++++++++++++++++++++++++\\      /++++++++++++++++++\\   ",
            " |==================|     /++++++++++++++++++++++++++++\\     |==================|   ",
            "/++++++++++++++++++++\\   |==============================|   /++++++++++++++++++++\\  ",
            "|======+======+======|  /++++++++++++++++++++++++++++++++\\  |======+======+======|  ",
            "|  ||  |  ||  |  ||  | |==================================| |  ||  |  ||  |  ||  |  ",
            "|__||__|__||__|__||__|/++++++++++++++++++++++++++++++++++++\\|__||__|__||__|__||__|  "
        ];
        for (let line of city) {
            console.log(babylonGradient(line));
            await sleep(20);
        }
    }

    const archText = isMobile 
        ? '   ::: ONBOARD SEQUENCE :::\n'
        : '               ::: ARCHITECTURE GEIST // ONBOARD SEQUENCE :::\n';
        
    let typingEffect = '';
    const textPadding = isMobile ? Math.max(0, Math.floor((termWidth - archText.trim().length) / 2)) : 0;
    
    if (isMobile && textPadding > 0) {
        process.stdout.write(' '.repeat(textPadding));
    }
    
    for (let i = 0; i < archText.length; i++) {
        typingEffect += archText[i];
        if (archText[i] !== '\n') {
            process.stdout.write('\r' + (isMobile ? ' '.repeat(textPadding) : '') + chalk.hex('#ffd700').bold(typingEffect));
        }
        await sleep(10);
    }
    console.log('\n');
}

export async function runOnboard() {
  await showOnboardBanner();
  console.log(chalk.gray('Iniciando configuración interactiva del Agente BABYLON.IA...\n'));

  // 1. Gemini Configuration
  const linkGeminiCLI = await confirm({ message: '¿Deseas enlazar el agente usando el perfil OAuth actual de Gemini CLI? (Recomendado)' });
  let geminiApiKey = '';
  if (!linkGeminiCLI) {
      geminiApiKey = await input({ message: 'Introduce tu API Key de Gemini:' });
  }

  // 2. Select Environment & OS
  const environment = await select({
    message: 'Selecciona tu Entorno/OS de despliegue (optimiza los recursos y modelos sugeridos):',
    choices: [
      { name: 'Android (Termux) - Bajo consumo extremo para móviles (Ej. Honor X6c)', value: 'mobile_terminal' },
      { name: 'Windows - Modo Desktop estándar', value: 'desktop_windows' },
      { name: 'macOS / iOS (iSH) - Apple Silicon / x86_64', value: 'desktop_mac' },
      { name: 'Linux - Servidor o Desktop', value: 'desktop_linux' }
    ]
  });

  const envSimplified = environment === 'mobile_terminal' ? 'mobile_terminal' : 'desktop';

  // 3. Select Cognitive Model
  console.log(chalk.gray(`\nSugerencia: Para tu entorno seleccionado (${environment}), se recomiendan opciones marcadas con [Recomendado]`));

  const modelChoices = [
      { name: 'gemini-3.1-pro-preview (Súper-Inteligencia, máximo razonamiento) [Recomendado]', value: 'gemini-3.1-pro-preview' },
      { name: 'gemini-3.0-pro (Avanzado, reasoning superior)', value: 'gemini-3.0-pro' },
      { name: 'gemini-2.5-pro (Avanzado, razonamiento complejo)', value: 'gemini-2.5-pro' },
      { name: 'gemini-2.5-flash (Rápido, respuestas instantáneas)', value: 'gemini-2.5-flash' },
      { name: 'gemini-2.0-flash-lite-preview-02-05 (Ultra Ligero)', value: 'gemini-2.0-flash-lite-preview-02-05' },
  ];

  if (environment === 'mobile_terminal') {
      modelChoices.push({ name: 'ollama:qwen2.5:0.5b / llama3.2:1b (Local Open Source - Ultra Cuantizado para Android)', value: 'ollama:qwen2.5:0.5b' });
  } else {
      modelChoices.push({ name: 'ollama:gemma2 (Local Open Source - Optimizado OS)', value: 'ollama:gemma2' });
  }

  const model = await select({
    message: 'Selecciona el modelo cognitivo a utilizar:',
    choices: modelChoices
  });

  // 4. Platform integrations (Omni-Channel)
  console.log(chalk.magenta(`\n[🌐] Configuración Omni-Channel (Arquitectura Hermes)`));
  const platforms = await checkbox({
    message: 'Selecciona las plataformas donde el agente estará activo (Usa la barra espaciadora):',
    choices: [
      { name: 'Dashboard Web Local y TUI', value: 'web', checked: true },
      { name: 'WhatsApp (via whatsapp-web.js)', value: 'whatsapp' },
      { name: 'WhatsApp Autónomo (via OpenWA REST API)', value: 'openwa' },
      { name: 'Discord Bot', value: 'discord' },
      { name: 'WeChat Bot', value: 'wechat' },
      { name: 'Telegram Bot', value: 'telegram' },
      { name: 'X (Twitter)', value: 'twitter' },
      { name: 'GitHub Webhooks', value: 'github' }
    ]
  });

  // 5. Hermes Broker (Redis)
  const useRedis = await confirm({ 
      message: '¿Deseas activar la Arquitectura Hermes usando Redis para mensajería asíncrona de alto tráfico?',
      default: true 
  });
  let redisUrl = '';
  if (useRedis) {
      redisUrl = await input({ message: 'URL de conexión a Redis:', default: 'redis://127.0.0.1:6379' });
  }

  // 6. Security & Whitelist
  const authorizedNumbers = await input({
      message: 'Introduce los números autorizados separados por coma (ej. 573000000000,573110000000):',
      default: ''
  });

  // 7. Platform Specific Tokens
  let telegramToken = '';
  if (platforms.includes('telegram')) {
      telegramToken = await input({ message: 'Token del Bot de Telegram (BotFather):' });
  }

  let discordToken = '';
  if (platforms.includes('discord')) {
      discordToken = await input({ message: 'Token del Bot de Discord:' });
  }

  let twitterBearer = '';
  if (platforms.includes('twitter')) {
      twitterBearer = await input({ message: 'Bearer Token de la API de X (Twitter):' });
  }

  let openwaApiUrl = '', openwaApiKey = '', openwaSessionId = '', publicUrl = '';
  if (platforms.includes('openwa')) {
      openwaApiUrl = await input({ message: 'OpenWA API URL:', default: 'http://localhost:2785' });
      openwaApiKey = await input({ message: 'OpenWA API Key (Opcional):' });
      openwaSessionId = await input({ message: 'OpenWA Session ID:', default: 'default' });
      publicUrl = await input({ message: 'URL Pública (ngrok/dominio) para Webhooks (requerido para recibir mensajes):' });
  }

  // 8. Workspace / Sandbox directory
  const defaultWorkspace = path.join(rootDir, 'workspace');
  let workspaceDir = await input({
    message: 'Ruta para el Sandbox/Workspace del agente:',
    default: defaultWorkspace
  });

  workspaceDir = path.resolve(workspaceDir);
  if (!fs.existsSync(workspaceDir)) {
    fs.mkdirSync(workspaceDir, { recursive: true });
    console.log(chalk.green(`  [+] Carpeta Workspace creada en: ${workspaceDir}`));
  }

  // Save to .env
  const envPath = path.join(rootDir, '.env');
  const envContent = `
# Configuración generada por babylon.ia onboard
ENVIRONMENT=${envSimplified}
OS_TARGET=${environment}
GEMINI_MODEL=${model}
USE_GEMINI_CLI_OAUTH=${linkGeminiCLI ? 'true' : 'false'}
GEMINI_API_KEY=${geminiApiKey}
WORKSPACE_DIR=${workspaceDir}
ENABLED_PLATFORMS=${platforms.join(',')}

# Seguridad
AUTHORIZED_NUMBERS=${authorizedNumbers}

# Integraciones Específicas
TELEGRAM_BOT_TOKEN=${telegramToken}
DISCORD_TOKEN=${discordToken}
TWITTER_BEARER_TOKEN=${twitterBearer}
OPENWA_API_URL=${openwaApiUrl}
OPENWA_API_KEY=${openwaApiKey}
OPENWA_SESSION_ID=${openwaSessionId}
PUBLIC_URL=${publicUrl}
  `.trim();

  fs.writeFileSync(envPath, envContent, 'utf-8');
  console.log(chalk.green(`\n[✓] Configuración base guardada exitosamente en ${envPath}`));

  // 9. QR Linking Process for active platforms
  if (platforms.includes('whatsapp')) {
      console.log(chalk.magenta(`\n[📱] Emparejamiento de WhatsApp Web (whatsapp-web.js)`));
      const linkWa = await confirm({ message: '¿Deseas escanear el código QR de WhatsApp ahora?' });
      if (linkWa) {
          try {
              const { pairWhatsAppClient } = await import('./whatsapp.js');
              await pairWhatsAppClient();
          } catch (e) {
              console.log(chalk.yellow('\n[!] No se pudo enlazar WhatsApp en este momento.'));
          }
      }
  }

  if (platforms.includes('wechat')) {
      console.log(chalk.magenta(`\n[💬] Emparejamiento de WeChat`));
      console.log(chalk.gray(`Inicia el motor "babylonia gateway" para desplegar el QR de WeChat interactivo en la TUI.`));
  }

  if (platforms.includes('openwa')) {
      console.log(chalk.magenta(`\n[🌐] Despliegue OpenWA`));
      console.log(chalk.gray(`Recuerda iniciar tu contenedor OpenWA y escanear el QR desde el Dashboard de OpenWA o vía API en ${openwaApiUrl}/api/sessions/${openwaSessionId}/qr`));
  }

  console.log(chalk.magenta(`\nEl Agente BABYLON.IA está configurado. Inicia el motor Omni-Channel usando:`));
  console.log(chalk.cyan.bold(`  babylonia gateway\n`));
}

#!/usr/bin/env node

import { program } from 'commander';
import { fork } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import open from 'open';
import fs from 'fs';
import { runOnboard } from '../src/onboard.js';
import { startTUI, startGatewayTUI } from '../src/tui_dashboard.js';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Cargar variables de entorno
dotenv.config({ path: path.join(rootDir, '.env') });

import CFonts from 'cfonts';
import chalk from 'chalk';
import gradient from 'gradient-string';

import ora from 'ora';
import boxen from 'boxen';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function showBanner() {
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
            "                                     :::                                           ",
            "                                    /\\^/\\                                          ",
            "                                   |::|::|                                         ",
            "                                  < ++|++ >                                        ",
            "                                  /:::|:::\\                                        ",
            "                                 /====|====\\                                       ",
            "                                /+++++|+++++\\                                      ",
            "                               /======|======\\                                     ",
            "                              /+++++++|+++++++\\                                    ",
            "                             /========|========\\                                   ",
            "         ___                /+++++++++|+++++++++\\                ___               ",
            "        |   |              /==========|==========\\              |   |              ",
            "       /     \\            /+++++++++++|+++++++++++\\            /     \\             ",
            "      |       |          |============|============|          |       |            ",
            "     /_________\\        /+++++++++++++|+++++++++++++\\        /_________\\           ",
            "     |=========|       |==============|==============|       |=========|           ",
            "    /+++++++++++\\     /+++++++++++++++|+++++++++++++++\\     /+++++++++++\\          ",
            "   /+++++++++++++\\   |================|================|   /+++++++++++++\\         ",
            "   |=============|  /+++++++++++++++++|+++++++++++++++++\\  |=============|         ",
            "  /+++++++++++++++\\|==================|==================|/+++++++++++++++\\        ",
            " /+++++++++++++++++|++++++++++++++++++|++++++++++++++++++|+++++++++++++++++\\       ",
            "|======+======+====|==================|==================|====+======+======|      ",
            "|  ||  |  ||  |  |||  ||  |  ||  |  |||  ||  |  ||  |  |||  ||  |  ||  |  |||      ",
            "|__||__|__||__|__|||__||__|__||__|__|||__||__|__||__|__|||__||__|__||__|__|||      ",
            "|                  |=====================================|                  |      ",
            "|  [ DATA-NEXUS ]  |   |  ||  |   GEIST AI  |  ||  |     | [ OMNI-CHANNEL ] |      ",
            "|__________________|___|__||__|_____________|__||__|_____|__________________|      "
        ];
        for (let line of city) {
            console.log(babylonGradient(line));
            await sleep(30); // Delay para la animación
        }
    } else {
        // Torre minimalista para terminales verticales (mÃ³viles)
        const mobileTower = [
            "         /\\         ",
            "        |::|        ",
            "       < ++ >       ",
            "        |::|        ",
            "       /++++\\       ",
            "      /++++++\\      ",
            "     |========|     ",
            "    /++++++++++\\    ",
            "   /++++++++++++\\   ",
            "  |==============|  ",
            " /++++++++++++++++\\ ",
            "|==================|",
            "|   [ GEIST-AI ]   |",
            "|__________________|"
        ];
        for (let line of mobileTower) {
            // Centrar la torre segÃºn el ancho del terminal
            const padding = Math.max(0, Math.floor((termWidth - line.length) / 2));
            console.log(babylonGradient(' '.repeat(padding) + line));
            await sleep(35);
        }
    }

    const archText = isMobile 
        ? '   ::: GEIST OMNI-CHANNEL :::\n'
        : '               ::: ARCHITECTURE GEIST // OMNI-CHANNEL :::\n';
        
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
        await sleep(15);
    }
    console.log('\n');

    // Inicialización profesional de módulos con ora
    const modules = ['NÃºcleo Base (Zero-RAM)', 'Motor de Memoria', 'DialÃ©ctica Hegelian', 'Puente OAuth/GGUF', 'Enlace Multi-Canal (Gateway)'];
    
    for (const mod of modules) {
        const spinner = ora({
            text: chalk.gray(`Sincronizando capa: ${mod}...`),
            spinner: 'dots'
        }).start();
        
        await sleep(250 + Math.random() * 200);
        spinner.succeed(chalk.green(`Capa enlazada: ${chalk.white.bold(mod)}`));
    }

    const readinessBox = boxen(
        chalk.hex('#00ffff').bold('Sincronización Geist Completada.\n') +
        chalk.gray('El tejido cognitivo está preparado para procesar directivas.'),
        {
            padding: 1,
            margin: { top: 1, bottom: 1 },
            borderStyle: 'double',
            borderColor: 'cyan',
            align: 'center'
        }
    );
    console.log(readinessBox);
    await sleep(400);
}

program
  .name('babylonia')
  .description('Agente AutÃ³nomo Multi-Canal (WhatsApp, Telegram, X, Web) con Arquitectura Geist')
  .version('1.0.0');

program
  .command('onboard')
  .description('Inicia la secuencia de configuraciÃ³n interactiva del agente.')
  .action(async () => {
    await showBanner();
    await runOnboard();
  });

program
  .command('gateway')
  .description('Inicia el motor principal y las plataformas activadas en el Onboarding, junto al servidor web.')
  .action(async () => {
    await showBanner();
    
    if (!fs.existsSync(path.join(rootDir, '.env'))) {
      console.warn(chalk.yellow('Advertencia: No se encontró el archivo .env. Por favor, ejecuta "babylonia onboard" primero.'));
    }

    console.log('Iniciando BABYLON.IA Gateway con TUI (Prime Radiant)...');
    
    // El TUI se encarga de forkar el server.js con stdio pipes y manejar la UI avanzada
    startGatewayTUI(rootDir);
  });

program
  .command('dashboard')
  .description('Abre el panel de control web en el navegador.')
  .action(async () => {
    const port = process.env.PORT || 3000;
    const url = `http://localhost:${port}`;
    console.log(`Abriendo BABYLON.IA Dashboard en ${url} ...`);

    await open(url);
    process.exit(0);
  });

program
  .command('console')
  .description('Inicia la interfaz de terminal futurista (Prime Radiant / Foundation UI).')
  .action(() => {
    startTUI();
  });

program
  .command('models')
  .description('Despliega el menú para seleccionar el modelo cognitivo en tiempo real.')
  .action(async () => {
    console.clear();
    CFonts.say('MODELS', { font: 'block', align: 'center', colors: ['#ffd700', '#00aaff'] });
    console.log(chalk.cyan('Selecciona el nuevo núcleo cognitivo para BABYLON.IA:\n'));
    
    // Lazy import Inquirer to keep CLI fast
    const { select, Separator } = await import('@inquirer/prompts');
    
    const environment = process.env.ENVIRONMENT || 'desktop';

    const modelChoices = [
        new Separator('--- Google Gemini ---'),
        { name: 'gemini-3.1-pro-preview (Súper-Inteligencia, máximo razonamiento) [Recomendado]', value: 'gemini-3.1-pro-preview' },
        { name: 'gemini-3.1-flash (Equilibrio perfecto velocidad/inteligencia)', value: 'gemini-3.1-flash' },
        { name: 'gemini-3.0-pro (Avanzado, reasoning superior)', value: 'gemini-3.0-pro' },
        { name: 'gemini-2.5-pro (Avanzado, razonamiento complejo)', value: 'gemini-2.5-pro' },
        { name: 'gemini-2.5-flash (Rápido, respuestas instantáneas)', value: 'gemini-2.5-flash' },
        { name: 'gemini-2.0-flash-lite-preview-02-05 (Ultra Ligero)', value: 'gemini-2.0-flash-lite-preview-02-05' },
        
        new Separator('--- Anthropic (Claude) ---'),
        { name: 'claude-3-7-sonnet-20250219 (Máximo Coding & Reasoning)', value: 'claude-3-7-sonnet-20250219' },
        { name: 'claude-3-5-haiku-20241022 (Velocidad extrema)', value: 'claude-3-5-haiku-20241022' },
        { name: 'claude-3-opus-20240229 (Análisis Profundo)', value: 'claude-3-opus-20240229' },
        
        new Separator('--- OpenAI ---'),
        { name: 'o3-mini (Reasoning Ligero y Rápido)', value: 'o3-mini' },
        { name: 'o1-preview (Máximo Razonamiento)', value: 'o1-preview' },
        { name: 'gpt-4.5-preview (Capacidad General Avanzada)', value: 'gpt-4.5-preview' },
        { name: 'gpt-4o (Versatilidad)', value: 'gpt-4o' },
        { name: 'gpt-4o-mini (Cost-Effective)', value: 'gpt-4o-mini' },
        
        new Separator('--- xAI / DeepSeek / Groq / China AI ---'),
        { name: 'grok-2-latest (xAI Grok 2)', value: 'grok-2-latest' },
        { name: 'deepseek-r1 (Groq/API)', value: 'deepseek-r1' },
        { name: 'moonshot-v1-auto (Kimi - Moonshot AI)', value: 'moonshot-v1-auto' },
        { name: 'abab6.5s-chat (MiniMax - High Efficiency)', value: 'abab6.5s-chat' },
        { name: 'llama-3.3-70b-versatile (Groq Llama)', value: 'llama-3.3-70b-versatile' },
        { name: 'mixtral-8x7b-32768 (Groq Mixtral)', value: 'mixtral-8x7b-32768' }
    ];

    if (environment === 'mobile_terminal') {
        modelChoices.push(new Separator('--- Local / Edge (Termux / Android) ---'));
        modelChoices.push({ name: 'ollama:qwen2.5:0.5b (Local Open Source - Ultra Cuantizado)', value: 'ollama:qwen2.5:0.5b' });
        modelChoices.push({ name: 'ollama:llama3.2:1b (Local Meta Llama 3.2)', value: 'ollama:llama3.2:1b' });
        modelChoices.push({ name: 'aiedge:gemma-3-4b-it (Nativo llama.cpp E4B)', value: 'aiedge:gemma-3-4b-it' });
        modelChoices.push({ name: 'aiedge:gemma-2-2b-it (Nativo llama.cpp E2B)', value: 'aiedge:gemma-2-2b-it' });
    } else {
        modelChoices.push(new Separator('--- Local (Ollama, LM Studio, vLLM) ---'));
        modelChoices.push({ name: 'ollama:gemma3:27b (Google Gemma 3 27B Local)', value: 'ollama:gemma3:27b' });
        modelChoices.push({ name: 'ollama:gemma3:4b (Google Gemma 3 4B Local)', value: 'ollama:gemma3:4b' });
        modelChoices.push({ name: 'ollama:gemma2 (Google Gemma 2 Local)', value: 'ollama:gemma2' });
        modelChoices.push({ name: 'ollama:deepseek-r1:8b (DeepSeek Local Reasoning)', value: 'ollama:deepseek-r1:8b' });
        modelChoices.push({ name: 'ollama:llama3.3:70b (Servidor GPU/Mac Studio)', value: 'ollama:llama3.3:70b' });
        modelChoices.push({ name: 'ollama:mistral (Generalista Local)', value: 'ollama:mistral' });
        modelChoices.push({ name: 'ollama:phi4 (Coding Local Pequeño)', value: 'ollama:phi4' });
        modelChoices.push({ name: 'ollama:qwen2.5-coder:14b (Coding Local)', value: 'ollama:qwen2.5-coder:14b' });
    }

    const model = await select({
        message: 'Selecciona el modelo cognitivo a utilizar:',
        choices: modelChoices,
        default: process.env.GEMINI_MODEL
    });

    const envPath = path.join(rootDir, '.env');
    if (fs.existsSync(envPath)) {
        let envContent = fs.readFileSync(envPath, 'utf-8');
        // Reemplazar o añadir
        if (envContent.includes('GEMINI_MODEL=')) {
            envContent = envContent.replace(/GEMINI_MODEL=.*/, `GEMINI_MODEL=${model}`);
        } else {
            envContent += `\nGEMINI_MODEL=${model}\n`;
        }
        fs.writeFileSync(envPath, envContent, 'utf-8');
        console.log(chalk.green(`\n[✓] Núcleo actualizado a ${chalk.bold(model)}.`));
        console.log(chalk.gray(`Si el gateway está en ejecución, reinícialo (Ctrl+C y babylonia gateway) para aplicar el cambio.`));
    } else {
        console.log(chalk.red(`\n[X] No se encontró el archivo .env. Ejecuta 'babylonia onboard' primero.`));
    }
  });

program.parse(process.argv);

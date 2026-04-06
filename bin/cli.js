#!/usr/bin/env node

import { program } from 'commander';
import { fork } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import open from 'open';
import fs from 'fs';
import { runOnboard } from '../src/onboard.js';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Cargar variables de entorno
dotenv.config({ path: path.join(rootDir, '.env') });

import CFonts from 'cfonts';
import chalk from 'chalk';
import gradient from 'gradient-string';

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
            "|__||__|__||__|__||__|/++++++++++++++++++++++++++++++++++++\\|__||__|__||__|__||__|  ",
            "|                    |======================================|                    |  ",
            "|  [ DATA-NEXUS ]    |    |  ||  |   GEIST  |  ||  |        |  [ OMNI-CHANNEL ]  |  ",
            "|____________________|____|__||__|__________|__||__|________|____________________|  "
        ];
        for (let line of city) {
            console.log(babylonGradient(line));
            await sleep(35); // Delay para la animaciÃ³n
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

    // Simular inicializaciÃ³n de mÃ³dulos neuronales
    const modules = ['NÃºcleo Base', 'Motor de Memoria', 'DialÃ©ctica Hegelian', 'Puente OAuth', 'Enlace Multi-Canal'];
    for (const mod of modules) {
        process.stdout.write(chalk.gray(`[+] Cargando mÃ³dulo ${mod}... `));
        await sleep(200);
        console.log(chalk.green('OK'));
    }

    console.log(chalk.hex('#00ffff').bold('\n[+] SincronizaciÃ³n Geist Completada. Iniciando secuencia...\n'));
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
      console.warn(chalk.yellow('Advertencia: No se encontrÃ³ el archivo .env. Por favor, ejecuta "babylonia onboard" primero.'));
    }

    console.log('Iniciando BABYLON.IA Gateway...');

    // Iniciar el servidor web (Dashboard)
    const serverProcess = fork(path.join(rootDir, 'src', 'server.js'), [], {
      cwd: rootDir,
      env: { ...process.env, BABYLON_MODE: 'gateway' },
      stdio: 'inherit'
    });

    serverProcess.on('exit', (code) => {
      console.log(`Gateway detenido con cÃ³digo ${code}`);
      process.exit(code);
    });
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

program.parse(process.argv);

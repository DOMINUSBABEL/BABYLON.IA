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
    CFonts.say('BABYLON.IA', {
        font: 'block',
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

    const city = [
        "                                                                                    ",
        "                                       .::::.                                       ",
        "                                      /++++++\\                                      ",
        "                                     /++++++++\\                                     ",
        "                                    |==========|                                    ",
        "                                   /++++++++++++\\                                   ",
        "                   ._.            /++++++++++++++\\             ._.                  ",
        "                   | |           |================|            | |                  ",
        "                 _ | | _        /++++++++++++++++++\\         _ | | _                ",
        "                / \\| |/ \\      /++++++++++++++++++++\\       / \\| |/ \\               ",
        "                |=======|     |======================|      |=======|               ",
        "               /+++++++++\\   /++++++++++++++++++++++++\\    /+++++++++\\              ",
        "               |=========|  /++++++++++++++++++++++++++\\   |=========|              ",
        "              /+++++++++++\\|============================| /+++++++++++\\             ",
        "              |===========/++++++++++++++++++++++++++++++\\|===========|             ",
        "             /+++++++++++/++++++++++++++++++++++++++++++++\\++++++++++++\\            ",
        "             |==========|==================================|===========|            ",
        "            /++++++++++/++++++++++++++++++++++++++++++++++++\\+++++++++++\\           ",
        "    .       |=========/++++++++++++++++++++++++++++++++++++++\\==========|      .    ",
        "   / \\     /+++++++++|========================================|++++++++++\\    / \\   ",
        "  /   \\    |========/++++++++++++++++++++++++++++++++++++++++++\\=========|   /   \\  ",
        " /_____\\  /++++++++/++++++++++++++++++++++++++++++++++++++++++++\\+++++++++\\ /_____\\ ",
        " |=====|  |=======|==============================================|========| |=====| ",
        "/+++++++\\/+++++++/++++++++++++++++++++++++++++++++++++++++++++++++\\++++++++\\/+++++++\\",
        "|=======||======/++++++++++++++++++++++++++++++++++++++++++++++++++\\=======||=======|",
        "|       ||     |====================================================|      ||       |",
        "|_______||____/++++++++++++++++++++++++++++++++++++++++++++++++++++++\\_____||_______|"
    ];

    const babylonGradient = gradient(['#0000aa', '#0000ff', '#ffd700']);

    for (let line of city) {
        console.log(babylonGradient(line));
        await sleep(35); // Delay para la animación
    }

    const archText = '               ::: ARCHITECTURE GEIST // OMNI-CHANNEL :::\n';
    let typingEffect = '';
    for (let i = 0; i < archText.length; i++) {
        typingEffect += archText[i];
        process.stdout.write('\r' + chalk.hex('#ffd700').bold(typingEffect));
        await sleep(15);
    }
    console.log('\n');
    
    // Simular inicialización de módulos neuronales
    const modules = ['Núcleo Base', 'Motor de Memoria', 'Dialéctica Hegelian', 'Puente OAuth', 'Enlace Multi-Canal'];
    for (const mod of modules) {
        process.stdout.write(chalk.gray(`[+] Cargando módulo ${mod}... `));
        await sleep(200);
        console.log(chalk.green('OK'));
    }
    
    console.log(chalk.hex('#00ffff').bold('\n[+] Sincronización Geist Completada. Iniciando secuencia...\n'));
    await sleep(400);
}

program
  .name('babylonia')
  .description('Agente Autónomo Multi-Canal (WhatsApp, Telegram, X, Web) con Arquitectura Geist')
  .version('1.0.0');

program
  .command('onboard')
  .description('Inicia la secuencia de configuración interactiva del agente.')
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

    console.log('Iniciando BABYLON.IA Gateway...');
    
    // Iniciar el servidor web (Dashboard)
    const serverProcess = fork(path.join(rootDir, 'src', 'server.js'), [], {
      cwd: rootDir,
      env: { ...process.env, BABYLON_MODE: 'gateway' },
      stdio: 'inherit'
    });

    serverProcess.on('exit', (code) => {
      console.log(`Gateway detenido con código ${code}`);
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

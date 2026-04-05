#!/usr/bin/env node

import { program } from 'commander';
import { fork } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import open from 'open';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

program
  .name('babylon.ia')
  .description('Agente Autónomo Multi-Canal (WhatsApp + Gemini OAuth) con Arquitectura Geist')
  .version('1.0.0');

program
  .command('gateway')
  .description('Inicia el motor principal (WhatsApp Web + Bucle Dialéctico) y el servidor web para monitoreo.')
  .action(() => {
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
    
    // Si el servidor no está corriendo, lo ideal sería advertir o intentar iniciarlo.
    // Por simplicidad, abrimos el navegador.
    await open(url);
    process.exit(0);
  });

program.parse(process.argv);

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import events from 'events';

// Submódulos del agente
import { getGeminiOAuthToken } from './auth.js';
import { initWhatsAppClient } from './whatsapp.js';
import { initTelegramBot } from './telegram.js';
import { initTwitterBot } from './twitter.js';
import { processTask } from './agent_core.js';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const app = express();
const server = createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Configurar Express para servir archivos estáticos (Dashboard Web)
app.use(express.static(path.join(rootDir, 'public')));
app.use(express.json());

// --- Interceptor de Console.log para enviar logs por WebSocket ---
const originalLog = console.log;
const originalError = console.error;

// Creamos un event emitter global para comunicarnos con WhatsApp
export const agentEvents = new events.EventEmitter();

console.log = function () {
    const args = Array.from(arguments);
    const message = args.join(' ');
    originalLog.apply(console, args);
    // Enviar el texto limpio (sin códigos ANSI de tiza)
    // Usamos una regex simple para limpiar los códigos de escape ANSI
    const cleanMsg = typeof message === 'string' ? message.replace(/\u001b\[.*?m/g, '') : JSON.stringify(message);
    io.emit('system_log', cleanMsg);
};

console.error = function () {
    const args = Array.from(arguments);
    const message = args.join(' ');
    originalError.apply(console, args);
    const cleanMsg = typeof message === 'string' ? message.replace(/\u001b\[.*?m/g, '') : JSON.stringify(message);
    io.emit('system_error', cleanMsg);
};

// Configuración de WebSockets
io.on('connection', (socket) => {
    // console.log(chalk.gray('  [Dashboard] Cliente Web conectado.'));
    
    // Escuchar el evento de QR desde whatsapp.js y reenviarlo a la web
    agentEvents.on('qr_code', (qrCodeBase64) => {
        socket.emit('whatsapp_qr', qrCodeBase64);
    });

    agentEvents.on('whatsapp_ready', () => {
        socket.emit('whatsapp_status', 'connected');
    });

    // Permitir enviar comandos directamente desde el Dashboard web
    socket.on('dashboard_command', async (cmd) => {
        console.log(chalk.magenta(`\n[+] Tesis Recibida (Web Dashboard): ${cmd}`));
        
        io.emit('agent_status', 'Pensando...');
        
        try {
            const response = await processTask(cmd, (progressText) => {
                console.log(chalk.yellow(`     [Geist] ${progressText}`));
                io.emit('agent_progress', progressText);
            });
            
            console.log(chalk.green('  -> Síntesis generada (Web).'));
            io.emit('agent_response', response);
            io.emit('agent_status', 'En espera de directivas');
            
        } catch (error) {
            console.error(chalk.red(`[Error Procesando Tarea]: ${error.message}`));
            io.emit('agent_error', error.message);
            io.emit('agent_status', 'Error');
        }
    });
});

// Arrancar el Servidor
server.listen(PORT, async () => {
    console.log(chalk.cyan(`\n================================================`));
    console.log(chalk.bold.hex('#FFD700')(` BABYLON.IA Dashboard Node Activo en puerto ${PORT}`));
    console.log(chalk.cyan(`================================================\n`));

    // Si se inició a través de "gateway", también inicializamos el agente de WhatsApp
    if (process.env.BABYLON_MODE === 'gateway') {
        const spinner = (await import('ora')).default('Verificando Conciencia Geist y Credenciales OAuth de Gemini...').start();
        try {
            if (process.env.USE_GEMINI_CLI_OAUTH !== 'false') {
                const creds = getGeminiOAuthToken();
                spinner.succeed(chalk.green(`Conciencia enlazada. Token OAuth detectado.`));
            } else if (process.env.GEMINI_API_KEY) {
                spinner.succeed(chalk.green(`Conciencia enlazada vía API Key.`));
            } else {
                spinner.warn(chalk.yellow(`No se detectó configuración de autenticación, el agente podría fallar al procesar tareas.`));
            }
            
            const platforms = (process.env.ENABLED_PLATFORMS || 'whatsapp,web').split(',');

            if (platforms.includes('whatsapp')) {
                console.log(chalk.cyanBright('\n[!] Iniciando Motor de Comunicación (WhatsApp Web)...'));
                initWhatsAppClient(agentEvents);
            }

            if (platforms.includes('telegram')) {
                initTelegramBot(process.env.TELEGRAM_BOT_TOKEN);
            }

            if (platforms.includes('twitter')) {
                initTwitterBot(process.env.TWITTER_BEARER_TOKEN);
            }
            
            if (platforms.includes('web')) {
                console.log(chalk.magentaBright('\n[!] Dashboard Web activado. Escuchando directivas locales...'));
            }
            
        } catch (error) {
            spinner.fail(chalk.red('Error en el arranque de la conciencia.'));
            console.error(chalk.redBright(`[X] Detalle: ${error.message}`));
        }
    }
});

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import events from 'events';
import readline from 'readline';
import fs from 'fs';

// Submódulos del agente
import { getGeminiOAuthToken } from './auth.js';
import { initWhatsAppClient } from './whatsapp.js';
import { initTelegramBot } from './telegram.js';
import { initTwitterBot } from './twitter.js';
import { processTask } from './agent_core.js';
import dotenv from 'dotenv';
import boxen from 'boxen';
import logUpdate from 'log-update';

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

// TUI / Readline instanciación (definido luego, pero se necesita para el prompt padding)
let rlInterface = null;

console.log = function () {
    if (rlInterface) {
        process.stdout.write('\x1b[2K\x1b[0G'); // Clear current line and return to start
    }
    const args = Array.from(arguments);
    const message = args.join(' ');
    originalLog.apply(console, args);

    // Restaurar prompt de Readline después de que console.log printee algo
    if (rlInterface) rlInterface.prompt(true);

    // Enviar el texto limpio (sin códigos ANSI de tiza)
    // Usamos una regex simple para limpiar los códigos de escape ANSI
    const cleanMsg = typeof message === 'string' ? message.replace(/\u001b\[.*?m/g, '') : JSON.stringify(message);
    io.emit('system_log', cleanMsg);
};

console.error = function () {
    if (rlInterface) {
        process.stdout.write('\x1b[2K\x1b[0G'); // Clear current line
    }
    const args = Array.from(arguments);
    const message = args.join(' ');
    originalError.apply(console, args);

    if (rlInterface) rlInterface.prompt(true);

    const cleanMsg = typeof message === 'string' ? message.replace(/\u001b\[.*?m/g, '') : JSON.stringify(message);
    io.emit('system_error', cleanMsg);
};

// Función para inicializar el TUI
function initTerminalUI() {
    rlInterface = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: chalk.hex('#FFD700').bold('BABYLON.IA > ')
    });

    rlInterface.prompt();

    rlInterface.on('line', async (line) => {
        const input = line.trim();
        if (!input) {
            rlInterface.prompt();
            return;
        }

        // TUI Comando directo
        if (input.toLowerCase() === 'exit' || input.toLowerCase() === 'quit') {
            console.log(chalk.red('Cerrando BABYLON.IA Gateway...'));
            process.exit(0);
        }

        console.log(chalk.cyan(`\n[~] Tesis Natural Recibida (TUI Terminal): ${input}`));

        try {
            // Buffer to store reasoning steps for TUI panel
            let reasoningSteps = [];

            const response = await processTask(input, (progressText) => {
                reasoningSteps.push(`• ${progressText}`);

                // Re-render the reasoning box dynamically using log-update
                const reasoningBox = boxen(reasoningSteps.join('\n'), {
                    title: chalk.hex('#ffd700').bold('🧠 Flujo de Razonamiento Geist'),
                    titleAlignment: 'left',
                    padding: 1,
                    margin: { top: 1, bottom: 1 },
                    borderColor: '#0000ff',
                    borderStyle: 'round'
                });

                logUpdate(reasoningBox);
            });

            // Finalizar la actualización en vivo
            logUpdate.done();

            console.log(chalk.green('  -> Síntesis natural generada (Terminal).'));
            console.log(`\n*BABYLON.IA (TUI)*:\n${response}\n`);
            
            // Sincronizar con WhatsApp
            agentEvents.emit('broadcast_whatsapp', `*[Directiva desde Terminal TUI]*\n_Tesis:_ ${input}\n\n*Síntesis:*\n${response}`);
        } catch (error) {
            console.error(chalk.red(`[Error Procesando Tarea]: ${error.message}`));
        }

        rlInterface.prompt();
    }).on('close', () => {
        console.log(chalk.red('\nSaliendo del Agente de Consola...'));
        process.exit(0);
    });
}

// Configuración de WebSockets
// Sincronizar eventos de WhatsApp hacia el Dashboard
agentEvents.on('whatsapp_command_start', (cmd) => {
    io.emit('agent_status', 'Pensando...');
});
agentEvents.on('whatsapp_progress', (progressText) => {
    io.emit('agent_progress', progressText);
});
agentEvents.on('whatsapp_response', (response) => {
    io.emit('agent_response', response);
    io.emit('agent_status', 'En espera de directivas');
});
agentEvents.on('whatsapp_error', (error) => {
    io.emit('agent_error', error);
    io.emit('agent_status', 'Error');
});

io.on('connection', (socket) => {
    // console.log(chalk.gray('  [Dashboard] Cliente Web conectado.'));
    
    // Escuchar el evento de QR desde whatsapp.js y reenviarlo a la web
    agentEvents.on('qr_code', (qrCodeBase64) => {
        socket.emit('whatsapp_qr', qrCodeBase64);
    });

    agentEvents.on('whatsapp_ready', () => {
        socket.emit('whatsapp_status', 'connected');
    });

    // --- NUEVAS RUTAS DASHBOARD V2 ---
    socket.on('get_config', () => {
        // Leemos variables de entorno actuales como fuente de verdad
        const currentConfig = {
            model: process.env.GEMINI_MODEL || 'gemini-3.1-pro-preview',
            whatsapp: (process.env.ENABLED_PLATFORMS || 'whatsapp,web').includes('whatsapp'),
            telegram: (process.env.ENABLED_PLATFORMS || 'whatsapp,web').includes('telegram'),
            twitter: (process.env.ENABLED_PLATFORMS || 'whatsapp,web').includes('twitter')
        };
        socket.emit('config_data', currentConfig);
    });

    socket.on('update_config', (newConfig) => {
        // En un entorno de producción real, esto debería guardar en un archivo .env
        // Por ahora, actualizamos process.env dinámicamente para la sesión actual
        if (newConfig.model) {
            process.env.GEMINI_MODEL = newConfig.model;
            console.log(chalk.yellow(`[Config] Motor de Inferencia cambiado a: ${newConfig.model}`));
        }

        let platforms = ['web']; // Web siempre activo para el dashboard
        if (newConfig.whatsapp) platforms.push('whatsapp');
        if (newConfig.telegram) platforms.push('telegram');
        if (newConfig.twitter) platforms.push('twitter');

        process.env.ENABLED_PLATFORMS = platforms.join(',');
        console.log(chalk.yellow(`[Config] Plataformas activas actualizadas: ${process.env.ENABLED_PLATFORMS}`));

        socket.emit('config_updated', 'Configuración de OPS actualizada en memoria.');
    });

    socket.on('get_agents_md', () => {
        const agentsMdPath = path.join(rootDir, 'AGENTS.md');
        if (fs.existsSync(agentsMdPath)) {
            const content = fs.readFileSync(agentsMdPath, 'utf8');
            socket.emit('agents_md_data', content);
        } else {
            socket.emit('agents_md_data', '');
        }
    });

    socket.on('save_agents_md', (content) => {
        const agentsMdPath = path.join(rootDir, 'AGENTS.md');
        try {
            fs.writeFileSync(agentsMdPath, content, 'utf8');
            console.log(chalk.green(`[Context] AGENTS.md actualizado desde el Dashboard.`));
            socket.emit('agents_md_saved', 'Contexto AGENTS.md guardado en disco exitosamente.');
        } catch (error) {
            console.error(chalk.red(`[Error] Fallo al guardar AGENTS.md: ${error.message}`));
            socket.emit('system_error', `No se pudo guardar el archivo: ${error.message}`);
        }
    });

    // Permitir enviar comandos directamente desde el Dashboard web
    socket.on('dashboard_command', async (cmd) => {
        console.log(chalk.magenta(`\n[+] Tesis Recibida (Web Dashboard): ${cmd}`));
        
        io.emit('agent_status', 'Pensando...');
        
        try {
            let webReasoningSteps = [];
            const response = await processTask(cmd, (progressText) => {
                webReasoningSteps.push(`• ${progressText}`);

                // Re-render the reasoning box dynamically using log-update for web requests too
                const reasoningBox = boxen(webReasoningSteps.join('\n'), {
                    title: chalk.hex('#ffd700').bold('🧠 Flujo de Razonamiento Geist (Web)'),
                    titleAlignment: 'left',
                    padding: 1,
                    margin: { top: 1, bottom: 1 },
                    borderColor: '#0000ff',
                    borderStyle: 'round'
                });

                logUpdate(reasoningBox);
                io.emit('agent_progress', progressText);
            });
            
            logUpdate.done();

            console.log(chalk.green('  -> Síntesis generada (Web).'));
            io.emit('agent_response', response);
            io.emit('agent_status', 'En espera de directivas');
            
            // Sincronizar con WhatsApp
            agentEvents.emit('broadcast_whatsapp', `*[Directiva desde Dashboard Web]*\n_Tesis:_ ${cmd}\n\n*Síntesis:*\n${response}`);
            
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
                try {
                    const creds = await getGeminiOAuthToken();
                    spinner.succeed(chalk.green(`Conciencia enlazada. Token OAuth detectado.`));
                } catch (tokenError) {
                    spinner.warn(chalk.yellow(`Aviso Auth-Bridge: ${tokenError.message}. Asegúrate de ejecutar 'gemini login' o configurar tu API Key.`));
                }
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

            // Iniciar la TUI de la terminal independientemente de las plataformas de mensajería
            setTimeout(() => {
                console.log(chalk.magentaBright('\n[!] Consola TUI activada. Escribe tus directivas en lenguaje natural...'));
                initTerminalUI();
            }, 500); // Pequeño retraso para que los logs de arranque terminen
            
        } catch (error) {
            spinner.fail(chalk.red('Error en el arranque de la conciencia.'));
            console.error(chalk.redBright(`[X] Detalle: ${error.message}`));
        }
    }
});

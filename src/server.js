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
import { gateway } from './gateway.js';
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

let isShuttingDown = false;

console.log = function () {
    if (isShuttingDown) return originalLog.apply(console, arguments);
    if (rlInterface) {
        process.stdout.write('\x1b[2K\x1b[0G'); // Clear current line and return to start
    }
    const args = Array.from(arguments);
    const message = args.join(' ');
    originalLog.apply(console, args);

    // Restaurar prompt de Readline después de que console.log printee algo
    if (rlInterface && !rlInterface.closed) { try { if (rlInterface.prompt) rlInterface.prompt(true); } catch(e) { rlInterface = null; } }

    // Enviar el texto limpio (sin códigos ANSI de tiza)
    // Usamos una regex simple para limpiar los códigos de escape ANSI
    const cleanMsg = typeof message === 'string' ? message.replace(/\u001b\[.*?m/g, '') : JSON.stringify(message);
    io.emit('system_log', cleanMsg);
};

console.error = function () {
    if (isShuttingDown) return originalError.apply(console, arguments);
    if (rlInterface) {
        process.stdout.write('\x1b[2K\x1b[0G'); // Clear current line
    }
    const args = Array.from(arguments);
    const message = args.join(' ');
    originalError.apply(console, args);

    if (rlInterface && !rlInterface.closed) { try { if (rlInterface.prompt) rlInterface.prompt(true); } catch(e) { rlInterface = null; } }

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

    if (rlInterface && !rlInterface.closed) { try { if (rlInterface.prompt) rlInterface.prompt(); } catch(e) { rlInterface = null; } }

    rlInterface.on('line', async (line) => {
        const input = line.trim();
        if (!input) {
            if (rlInterface && !rlInterface.closed) { try { if (rlInterface.prompt) rlInterface.prompt(); } catch(e) { rlInterface = null; } }
            return;
        }

        // TUI Comando directo
        if (input.toLowerCase() === 'exit' || input.toLowerCase() === 'quit') {
            console.log(chalk.red('Cerrando BABYLON.IA Gateway...'));
            try { if (rlInterface) { rlInterface.close(); rlInterface = null; } } catch(e) {} process.exit(0);
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

        if (rlInterface && !rlInterface.closed) { try { if (rlInterface.prompt) rlInterface.prompt(); } catch(e) { rlInterface = null; } }
    }).on('close', () => {
        rlInterface = null;
        isShuttingDown = true;
        console.log(chalk.red('\nSaliendo del Agente de Consola...'));
        try { if (rlInterface) { rlInterface.close(); rlInterface = null; } } catch(e) {} process.exit(0);
    });
}

// Configuración de WebSockets
// Estado global para clientes nuevos
let lastQrCode = null;
let isWhatsappReady = false;

// Mover listeners fuera de io.on('connection') para evitar memory leaks
agentEvents.on('qr_code', (qrCodeBase64) => {
    lastQrCode = qrCodeBase64;
    io.emit('whatsapp_qr', qrCodeBase64);
});

agentEvents.on('whatsapp_ready', () => {
    isWhatsappReady = true;
    lastQrCode = null; // Ya no necesitamos el QR
    io.emit('whatsapp_status', 'connected');
});

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

    // Enviar estado inicial guardado al nuevo cliente
    if (isWhatsappReady) {
        socket.emit('whatsapp_status', 'connected');
    } else if (lastQrCode) {
        socket.emit('whatsapp_qr', lastQrCode);
    } else {
        // Estado inicial genérico si no hay QR ni está ready
        socket.emit('whatsapp_status', 'waiting');
    }

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

    let heartbeatIntervalId = null;

    socket.on('update_config', (newConfig) => {
        // En un entorno de producción real, esto debería guardar en un archivo .env
        // Por ahora, actualizamos process.env dinámicamente para la sesión actual
        if (newConfig.model) {
            // Validación de seguridad para evitar inyección de comandos
            if (!/^[a-zA-Z0-9.\-:]+$/.test(newConfig.model)) {
                console.error(chalk.red(`[Error] Intento de inyección detectado en modelo: ${newConfig.model}`));
            } else {
                process.env.GEMINI_MODEL = newConfig.model;
                console.log(chalk.yellow(`[Config] Motor de Inferencia cambiado a: ${newConfig.model}`));
            }
        }

        let platforms = ['web']; // Web siempre activo para el dashboard
        if (newConfig.whatsapp) platforms.push('whatsapp');
        if (newConfig.telegram) platforms.push('telegram');
        if (newConfig.twitter) platforms.push('twitter');

        process.env.ENABLED_PLATFORMS = platforms.join(',');
        console.log(chalk.yellow(`[Config] Plataformas activas actualizadas: ${process.env.ENABLED_PLATFORMS}`));

        // Configuración del Heartbeat Loop
        if (heartbeatIntervalId) clearInterval(heartbeatIntervalId);
        
        let intervalMins = 0;
        if (newConfig.heartbeat === 'custom') {
            intervalMins = parseInt(newConfig.customHeartbeat) || 0;
        } else {
            intervalMins = parseInt(newConfig.heartbeat) || 0;
        }

        if (intervalMins > 0) {
            console.log(chalk.red(`[Geist] Heartbeat Loop activado cada ${intervalMins} minutos.`));
            socket.emit('system_log', `Heartbeat/Autoresearch Loop activado: Ejecutándose cada ${intervalMins} minutos.`);
            
            heartbeatIntervalId = setInterval(async () => {
                const autoPrompt = "Heartbeat Loop: Revisa tu subgeist_automejora.md interno. Analiza el historial reciente de operaciones, detecta cuellos de botella e infiere una optimización arquitectónica o crea un pull request conceptual de mejora.";
                console.log(chalk.red(`\n[♥] Iniciando ciclo de automejora Geist (Heartbeat)...`));
                io.emit('agent_status', 'Heartbeat Loop...');
                try {
                    let steps = [];

                    const gatewayEvent = {
                        text: autoPrompt,
                        hasMedia: false,
                        media: null,
                        channel: 'heartbeat',
                        author: 'system',
                        from: 'internal',
                        to: 'bot',
                        isCommand: false
                    };

                    const responseObj = await gateway.handleEvent(gatewayEvent, (text) => {
                        steps.push(`• ${text}`);
                        io.emit('agent_progress', text);
                    });
                    
                    console.log(chalk.green(`[♥] Ciclo de automejora completado.`));
                    io.emit('system_log', `Heartbeat completado. Revisa tu Wiki Memory para nuevas síntesis.`);
                    io.emit('agent_status', 'En espera de directivas');
                } catch(e) {
                    console.error(chalk.red(`[♥] Error en Heartbeat: ${e.message}`));
                    io.emit('system_error', `Error en Heartbeat Loop: ${e.message}`);
                }
            }, intervalMins * 60000);
        } else {
            console.log(chalk.gray(`[Geist] Heartbeat Loop desactivado.`));
        }

        socket.emit('config_updated', 'Configuración de OPS actualizada en memoria.');
    });

    socket.on('check_local_models', async () => {
        // Simular o ejecutar un chequeo de modelos en el sistema (Ollama, Edge)
        const { exec } = await import('child_process');
        
        exec('ollama list', (err, stdout, stderr) => {
            if (!err && stdout) {
                socket.emit('system_log', `Modelos Ollama detectados:\n${stdout.split('\n').slice(1,4).join('\n')}`);
            } else {
                socket.emit('system_log', `Servicio Ollama no detectado o inactivo.`);
            }
        });

        // Heurística básica para buscar modelos Gemma en descargas o rutas comunes de Android/Windows
        const possiblePaths = [
            path.join(process.env.USERPROFILE || process.env.HOME || '', 'Downloads', 'gemma-2b-it-cpu-int4.bin'),
            path.join('/data/data/com.termux/files/home', 'models', 'gemma-2b.bin')
        ];
        
        let foundEdge = false;
        for (const p of possiblePaths) {
            if (fs.existsSync(p)) {
                socket.emit('system_log', `Local Edge Model detectado en: ${p}`);
                foundEdge = true;
                break;
            }
        }
        if (!foundEdge) {
            socket.emit('system_log', `No se detectaron binarios de Gemma Edge Model (E2B/E4B) en rutas predeterminadas.`);
        }
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

    // --- NUEVAS RUTAS DASHBOARD WIKI TREE (Workspace Completo) ---
    function buildDirectoryTree(dirPath, basePath = '') {
        const tree = [];
        const items = fs.readdirSync(dirPath);

        // Add root AGENTS.md explicitly if we are at root, or handle it differently.
        // Let's assume workspace is the root.

        for (const item of items) {
            const itemPath = path.join(dirPath, item);
            const relPath = path.join(basePath, item).replace(/\\/g, '/');
            const stat = fs.statSync(itemPath);

            if (stat.isDirectory()) {
                // Ignore node_modules, .git, etc if they happen to be there
                if (item === 'node_modules' || item === '.git' || item === 'media' && basePath === '') continue;

                tree.push({
                    name: item,
                    path: relPath,
                    type: 'directory',
                    isOpen: false, // Default state for UI
                    children: buildDirectoryTree(itemPath, relPath)
                });
            } else {
                tree.push({
                    name: item,
                    path: relPath,
                    type: 'file',
                    size: stat.size
                });
            }
        }

        // Sort: directories first, then files alphabetically
        tree.sort((a, b) => {
            if (a.type === 'directory' && b.type === 'file') return -1;
            if (a.type === 'file' && b.type === 'directory') return 1;
            return a.name.localeCompare(b.name);
        });

        return tree;
    }

    socket.on('get_wiki_tree', () => {
        const workspaceDir = path.join(rootDir, 'workspace');
        try {
            if (!fs.existsSync(workspaceDir)) {
                fs.mkdirSync(workspaceDir, { recursive: true });
                // Also ensure wiki dir inside workspace
                fs.mkdirSync(path.join(workspaceDir, 'wiki'), { recursive: true });
            }

            let tree = buildDirectoryTree(workspaceDir);

            // Add root AGENTS.md to the tree explicitly at the top level
            if (fs.existsSync(path.join(rootDir, 'AGENTS.md'))) {
                const stat = fs.statSync(path.join(rootDir, 'AGENTS.md'));
                tree.unshift({
                    name: 'AGENTS.md',
                    path: 'AGENTS.md', // Special path identifier
                    type: 'file',
                    size: stat.size
                });
            }

            socket.emit('wiki_tree_data', tree);
        } catch (error) {
            console.error(chalk.red(`[Error] Fallo al leer workspace tree: ${error.message}`));
            socket.emit('system_error', `No se pudo leer el árbol del workspace: ${error.message}`);
        }
    });

    // Helper to validate paths and prevent Path Traversal
    function resolveAndValidatePath(basePath, relativePath) {
        const resolvedBase = path.resolve(basePath);
        const fullPath = path.resolve(resolvedBase, relativePath);
        if (fullPath !== resolvedBase && !fullPath.startsWith(resolvedBase + path.sep)) {
            throw new Error('Intento de acceso a ruta no autorizada detectado.');
        }
        return fullPath;
    }

    socket.on('get_wiki_file', (filepath) => {
        let fullPath;
        try {
            if (filepath === 'AGENTS.md') {
                fullPath = path.join(rootDir, 'AGENTS.md');
            } else {
                fullPath = resolveAndValidatePath(path.join(rootDir, 'workspace'), filepath);
            }

            if (fs.existsSync(fullPath)) {
                const content = fs.readFileSync(fullPath, 'utf8');
                const stat = fs.statSync(fullPath);
                socket.emit('wiki_file_data', { filename: filepath, content, size: stat.size });
            } else {
                socket.emit('system_error', `El archivo ${filepath} no existe.`);
            }
        } catch (error) {
            socket.emit('system_error', `No se pudo leer el archivo: ${error.message}`);
        }
    });

    socket.on('save_wiki_file', ({ filename, content }) => {
        let fullPath;
        try {
            if (filename === 'AGENTS.md') {
                fullPath = path.join(rootDir, 'AGENTS.md');
            } else {
                fullPath = resolveAndValidatePath(path.join(rootDir, 'workspace'), filename);
                // Ensure directory exists if saving in a nested path
                const dir = path.dirname(fullPath);
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }
            }
            fs.writeFileSync(fullPath, content, 'utf8');
            console.log(chalk.green(`[Workspace] ${filename} actualizado desde el Dashboard.`));
            socket.emit('wiki_file_saved', `Archivo ${filename} guardado exitosamente.`);
            socket.emit('get_wiki_tree'); // Actualizar árbol
        } catch (error) {
            socket.emit('system_error', `No se pudo guardar el archivo: ${error.message}`);
        }
    });

    socket.on('delete_wiki_file', (filepath) => {
        let fullPath;
        try {
            if (filepath === 'AGENTS.md') {
                fullPath = path.join(rootDir, 'AGENTS.md');
            } else {
                fullPath = resolveAndValidatePath(path.join(rootDir, 'workspace'), filepath);
            }

            if (fs.existsSync(fullPath)) {
                fs.unlinkSync(fullPath);
                console.log(chalk.yellow(`[Workspace] Archivo eliminado: ${filepath}`));
                socket.emit('wiki_file_deleted', `El archivo ${filepath} fue eliminado de la memoria.`);
            }
        } catch (error) {
            socket.emit('system_error', `No se pudo eliminar el archivo: ${error.message}`);
        }
    });

    socket.on('upload_file', ({ filename, content, isText }) => {
        try {
            // Validate the path to prevent directory traversal in the filename
            const fullPath = resolveAndValidatePath(path.join(rootDir, 'workspace'), path.basename(filename));

            if (isText) {
                fs.writeFileSync(fullPath, content, 'utf8');
            } else {
                // Remove data URL prefix if present (e.g., data:image/png;base64,...)
                const base64Data = content.replace(/^data:([A-Za-z-+/]+);base64,/, '');
                fs.writeFileSync(fullPath, base64Data, 'base64');
            }
            console.log(chalk.green(`[Workspace] Archivo subido exitosamente: ${filename}`));
            socket.emit('file_upload_success', `Archivo ${filename} asimilado en el Workspace.`);
        } catch (error) {
            socket.emit('system_error', `Error al subir el archivo: ${error.message}`);
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
server.listen(PORT, '0.0.0.0', async () => {
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

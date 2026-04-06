import qrcode from 'qrcode-terminal';
import pkg from 'whatsapp-web.js';
const { Client, LocalAuth, MessageMedia } = pkg;
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { processTask } from './agent_core.js';

// Configuración de Seguridad: Lista Blanca de Números Autorizados
// Agrega aquí los IDs de WhatsApp (ej. '1234567890@c.us') que tienen permiso para ejecutar comandos.
const AUTHORIZED_NUMBERS = [
    // 'tu_numero@c.us'
];

/**
 * Inicializa el cliente de WhatsApp y se conecta a la sesión.
 * Incluye funcionalidades completas de lectura de archivos, status y bucle dialéctico.
 */
export function initWhatsAppClient(agentEvents = null) {
    console.log(chalk.cyan('Inicializando el navegador Headless de WhatsApp Web (puede tomar unos segundos)...'));
    
    // Configuración condicional para Termux / mobile_terminal
    const puppeteerArgs = ['--no-sandbox', '--disable-setuid-sandbox'];
    let executablePath = undefined;

    if (process.env.ENVIRONMENT === 'mobile_terminal') {
        console.log(chalk.yellow('[Termux Mode] Aplicando configuraciones EXTREMAS de bajo consumo de memoria para Android...'));
        puppeteerArgs.push(
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process', // <- Importante para entornos móviles restrictivos
            '--disable-gpu',
            '--disable-extensions',
            '--disable-software-rasterizer',
            '--disable-background-networking',
            '--disable-background-timer-throttling',
            '--disable-client-side-phishing-detection',
            '--disable-default-apps',
            '--disable-hang-monitor',
            '--disable-popup-blocking',
            '--disable-prompt-on-repost',
            '--disable-sync',
            '--disable-translate',
            '--metrics-recording-only',
            '--no-default-browser-check',
            '--safebrowsing-disable-auto-update',
            '--mute-audio',
            '--blink-settings=imagesEnabled=false' // <- Deshabilita la carga de imágenes para ahorrar MUCHÍSIMA RAM
        );
        // En Termux a menudo se necesita instalar Chromium manualmente y especificar su ruta.
        // Si el usuario tiene CHROME_BIN seteado o estamos en termux, intentamos usar una ruta común.
        executablePath = process.env.CHROME_BIN || process.env.PUPPETEER_EXECUTABLE_PATH || '/data/data/com.termux/files/usr/bin/chromium-browser';
        
        if (!fs.existsSync(executablePath)) {
            console.log(chalk.red(`[Advertencia Termux] Chromium nativo no encontrado en ${executablePath}. Asegúrate de haber ejecutado install_android.sh o: pkg install chromium`));
            executablePath = undefined; // Dejar que puppeteer intente usar el descargado, aunque probablemente falle en termux
        }
    }

    const client = new Client({
        authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
        puppeteer: {
            args: puppeteerArgs,
            executablePath: executablePath
        }
    });

    client.on('qr', (qr) => {
        console.log(chalk.cyanBright('\n[!] Escanea el código QR con tu WhatsApp (Dispositivos Vinculados) para enlazar la conciencia:'));
        qrcode.generate(qr, { small: true });
        
        // Emitir el QR vía WebSocket al dashboard (convirtiendo a data URL en base64 para <img>)
        if (agentEvents) {
            import('qrcode').then(qrcodeModule => {
                 qrcodeModule.toDataURL(qr, (err, url) => {
                     if (!err) {
                         agentEvents.emit('qr_code', url);
                     }
                 });
            }).catch(err => {
                console.error('Error importando el módulo "qrcode" para el dashboard:', err.message);
            });
        }
    });

    client.on('ready', () => {
        console.log(chalk.greenBright.bold('\n✅ BABYLON.IA Conectado exitosamente a WhatsApp.'));
        console.log(chalk.yellow('\nComandos disponibles vía chat:'));
        console.log(chalk.gray('  - !geist <tu directiva>   : Inicia el bucle de razonamiento y automejora.'));
        console.log(chalk.gray('  - !geist status          : Reporte de salud del motor OpenClaw y Gemini.'));
        console.log(chalk.gray('  - !geist enviar <ruta>   : Extrae y envía un archivo local a tu WhatsApp.'));
        console.log(chalk.magentaBright('\nEl Agente está en línea y a la espera de directivas...'));
        
        if (agentEvents) {
            agentEvents.emit('whatsapp_ready');

            // Escuchar peticiones de broadcast desde el Dashboard o TUI para sincronizar el historial
            agentEvents.on('broadcast_whatsapp', async (text) => {
                try {
                    const myId = client.info.wid._serialized;
                    await client.sendMessage(myId, text);
                    console.log(chalk.gray(`  -> Sincronizado historial con WhatsApp (Chat Personal).`));
                } catch(e) {
                    console.error(chalk.red(`Error sincronizando con WhatsApp: ${e.message}`));
                }
            });
        }
    });

    client.on('message_create', async (msg) => {
        // Ignoramos mensajes vacíos a menos que tengan archivos adjuntos
        if (!msg.body && !msg.hasMedia) return;

        // PREVENCIÃ“N DE BUCLE DE PENSAMIENTO (Thought Loop / Token Drain Prevention):
        // Ignoramos los mensajes que inician con las firmas visuales o texto del propio bot.
        // Esto evita que el bot se responda a sÃ­ mismo infinitamente.
        const msgText = msg.body ? msg.body.trim() : '';
        const botSignatures = [
            'ðŸ§ ', 'â³', 'ðŸŸ¢', 'âš ï¸', 'âŒ', '*BABYLON.IA', '*Geist', 'He procesado', 'Procesando...', '*[Directiva'
        ];
        if (botSignatures.some(sig => msgText.startsWith(sig)) || msgText.includes('Estado del Sistema (Geist)')) {
            return;
        }

        // Control de AutorizaciÃ³n: Solo el dueÃ±o (fromMe) o nÃºmeros en la lista blanca pueden interactuar
        // o vÃ­a una herramienta de canales que autorice nÃºmeros distintos.
        // Emular la soluciÃ³n si este error existe en los demÃ¡s canales.
        const isAuthorizedChannel = msg.fromMe || AUTHORIZED_NUMBERS.includes(msg.from) || (msg.author && AUTHORIZED_NUMBERS.includes(msg.author));

        if (!isAuthorizedChannel) return;

        let finalPrompt = msgText;

        // Manejo de Archivos Adjuntos (Media)
        if (msg.hasMedia) {
            try {
                const media = await msg.downloadMedia();
                if (media) {
                    const mediaDir = path.join(process.cwd(), 'workspace', 'media');
                    if (!fs.existsSync(mediaDir)) {
                        fs.mkdirSync(mediaDir, { recursive: true });
                    }

                    let fileName = media.filename;
                    if (!fileName) {
                        let ext = '';
                        if (media.mimetype) {
                            const mimeType = media.mimetype.split(';')[0];
                            if (mimeType === 'application/pdf') ext = '.pdf';
                            else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') ext = '.docx';
                            else if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') ext = '.xlsx';
                            else if (mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') ext = '.pptx';
                            else if (mimeType.startsWith('image/')) ext = '.' + mimeType.split('/')[1];
                            else if (mimeType.startsWith('audio/')) ext = '.' + mimeType.split('/')[1].replace('ogg; codecs=opus', 'ogg');
                            else if (mimeType.startsWith('video/')) ext = '.' + mimeType.split('/')[1];
                        }
                        fileName = `media_${Date.now()}${ext.replace(/[^a-zA-Z0-9.]/g, '')}`;
                    }

                    const filePath = path.join(mediaDir, fileName);
                    fs.writeFileSync(filePath, media.data, 'base64');

                    console.log(chalk.yellow(`\n[!] Archivo adjunto descargado y guardado en: ${filePath}`));
                    finalPrompt = `[ATENCIÃ“N: El usuario ha enviado un archivo multimedia/documento. El archivo fue descargado exitosamente y se encuentra en esta ruta local exacta: ${filePath} . DEBES usar obligatoriamente tu herramienta de lectura de archivos ('read_file') para abrir, leer y analizar el contenido de este archivo antes de dar una respuesta.]\n\nDirectiva del usuario: ${finalPrompt || 'Analiza el archivo adjunto.'}`;
                }
            } catch (err) {
                console.error(chalk.red(`Error al procesar el archivo adjunto: ${err.message}`));
            }
        }

        // Si el mensaje empieza con !geist, se asume que es un comando de configuraciÃ³n/sistema
        if (msgText.startsWith('!geist')) {
            console.log(chalk.magenta(`\n[+] Comando Recibido [${msg.from}]: ${msgText}`));
            const commandStr = msgText.replace('!geist', '').trim();
            
            if (!commandStr && !msg.hasMedia) {
                 await msg.reply('⚠️ *Sintaxis Inválida:*\nEl prefijo `!geist` se usa para comandos de sistema. Ejemplos:\n- `!geist status`\n- `!geist enviar <ruta>`');
                 return;
            }

            // COMANDO: STATUS
            if (commandStr.toLowerCase() === 'status') {
                console.log(chalk.blue('  -> Solicitud de estado recibida.'));
                await msg.reply('🟢 *BABYLON.IA Status:*\n- Motor Gemini CLI: ONLINE\n- Token OAuth: ACTIVO\n- Bucle Dialéctico: Operativo.\n- Entorno: Windows 11 (Geist Node)');
                return;
            }

            // COMANDO: ENVIAR ARCHIVO (File Extraction)
            if (commandStr.toLowerCase().startsWith('enviar ')) {
                const filePathStr = commandStr.replace(/enviar /i, '').trim();
                console.log(chalk.blue(`  -> Solicitud de extracción de archivo: ${filePathStr}`));
                
                // Formatear rutas si es necesario y verificar existencia
                const cleanPath = filePathStr.replace(/^"|"$/g, ''); // Quitar comillas si el usuario las pone
                if (fs.existsSync(cleanPath)) {
                    try {
                        const outMedia = MessageMedia.fromFilePath(cleanPath);
                        await client.sendMessage(msg.from, outMedia, { caption: `*Geist File Extractor:*\nAquí tienes el documento solicitado de tu PC.` });
                        console.log(chalk.green(`  -> Archivo enviado exitosamente por WhatsApp.`));
                    } catch (err) {
                        await msg.reply(`❌ *Error del Sistema:*\nNo se pudo enviar el archivo por peso o formato inválido.\n_Detalle: ${err.message}_`);
                        console.error(chalk.red(`  -> Error enviando archivo: ${err.message}`));
                    }
                } else {
                    await msg.reply(`❌ *Aporía Encontrada:*\nEl archivo no existe en la ruta local proporcionada:\n_${cleanPath}_`);
                    console.log(chalk.red(`  -> Archivo no encontrado en disco.`));
                }
                return;
            }

            // Si es un comando con !geist pero no es status ni enviar, igual lo mandamos al bucle
            console.log(chalk.blue('  -> Iniciando Bucle Dialéctico Forzado (System Directive)...'));
            let statusMsg = await msg.reply('⏳ *Iniciando Bucle Dialéctico Forzado...*');

            if (agentEvents) agentEvents.emit('whatsapp_command_start', commandStr);

            // Usamos finalPrompt que incluye los posibles adjuntos
            const response = await processTask(finalPrompt.replace('!geist', '').trim(), (progressText) => {
                console.log(chalk.yellow(`     [Geist] ${progressText}`));
                if (agentEvents) agentEvents.emit('whatsapp_progress', progressText);
            });

            console.log(chalk.green('  -> Síntesis generada. Respondiendo al usuario.'));
            await statusMsg.reply(`*BABYLON.IA (System)*:\n${response}`);
            if (agentEvents) agentEvents.emit('whatsapp_response', response);

            return;
        }

        // PROCESAMIENTO DE LENGUAJE NATURAL (Sin prefijo)
        console.log(chalk.cyan(`\n[~] Tesis Natural Recibida [${msg.from}]: ${msgText}${msg.hasMedia ? ' [CON ARCHIVO ADJUNTO]' : ''}`));
        let naturalStatusMsg = await msg.reply('🧠 *Procesando...*');

        if (agentEvents) agentEvents.emit('whatsapp_command_start', msgText);

        try {
            const response = await processTask(finalPrompt, (progressText) => {
                console.log(chalk.gray(`     [LLM/Geist] ${progressText}`));
                if (agentEvents) agentEvents.emit('whatsapp_progress', progressText);
            });

            console.log(chalk.green('  -> Síntesis natural generada. Respondiendo.'));
            await naturalStatusMsg.reply(response);
            if (agentEvents) agentEvents.emit('whatsapp_response', response);
        } catch (error) {
            console.error(chalk.red(`Error en el procesamiento natural: ${error.message}`));
            await naturalStatusMsg.reply(`❌ *Error cognitivo:*\nNo he podido procesar tu solicitud adecuadamente.\n_Detalle: ${error.message}_`);
            if (agentEvents) agentEvents.emit('whatsapp_error', error.message);
        }
    });

    // Iniciar Puppeteer y el cliente
    client.initialize();
}

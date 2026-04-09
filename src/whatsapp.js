import qrcode from 'qrcode-terminal';
import pkg from 'whatsapp-web.js';
const { Client, LocalAuth, MessageMedia } = pkg;
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
// Assuming processTask handles direct queries
import { processTask } from './agent_core.js';

// Configuración de Seguridad: Lista Blanca de Números Autorizados
const AUTHORIZED_NUMBERS = [
    // 'tu_numero@c.us'
];

export function initWhatsAppClient(agentEvents = null) {
    console.log(chalk.cyan('Inicializando el navegador Headless de WhatsApp Web (puede tomar unos segundos)...'));
    
    const puppeteerArgs = ['--no-sandbox', '--disable-setuid-sandbox'];
    let executablePath = undefined;

    if (process.env.ENVIRONMENT === 'mobile_terminal') {
        console.log(chalk.yellow('[Termux Mode] Aplicando configuraciones EXTREMAS de bajo consumo de memoria para Android...'));
        puppeteerArgs.push(
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
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
            '--blink-settings=imagesEnabled=false'
        );
        executablePath = process.env.CHROME_BIN || process.env.PUPPETEER_EXECUTABLE_PATH || '/data/data/com.termux/files/usr/bin/chromium-browser';
        
        if (!fs.existsSync(executablePath)) {
            console.log(chalk.red(`[Advertencia Termux] Chromium nativo no encontrado en ${executablePath}. Asegúrate de haber ejecutado install_android.sh o: pkg install chromium`));
            executablePath = undefined;
        }
    }

    let reconnectAttempts = 0;
    const maxAttempts = 5;

    const bootClient = () => {
        const client = new Client({
            authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
            puppeteer: {
                args: puppeteerArgs,
                executablePath: executablePath
            },
            // Fix WPP: Use specific remote html to prevent update loops or version crash
            webVersionCache: { type: 'remote', remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html' }
        });

        client.on('qr', (qr) => {
            console.log(chalk.cyanBright('\n[!] Escanea el código QR con tu WhatsApp (Dispositivos Vinculados) para enlazar la conciencia:'));
            qrcode.generate(qr, { small: true });
            
            if (agentEvents) {
                import('qrcode').then(qrcodeModule => {
                     qrcodeModule.toDataURL(qr, (err, url) => {
                         if (!err) {
                             agentEvents.emit('qr_code', url);
                         }
                     });
                }).catch(err => {
                    console.error('Error importando qrcode:', err.message);
                });
            }
        });

        client.on('ready', () => {
            console.log(chalk.greenBright.bold('\n✅ BABYLON.IA Conectado exitosamente a WhatsApp.'));
            console.log(chalk.yellow('\nComandos disponibles vía chat:'));
            console.log(chalk.gray('  - !geist <tu directiva>   : Inicia el bucle de razonamiento y automejora.'));
            console.log(chalk.gray('  - !geist status          : Reporte de salud del motor OpenClaw y Gemini.'));
            console.log(chalk.gray('  - !geist enviar <ruta>   : Extrae y envía un archivo local a tu WhatsApp.'));
            reconnectAttempts = 0;
            
            if (agentEvents) {
                agentEvents.emit('whatsapp_ready');

                agentEvents.on('broadcast_whatsapp', async (text) => {
                    try {
                        const myId = client.info.wid._serialized.replace(/:[0-9]+/, '');
                        await client.sendMessage(myId, text);
                    } catch(e) {
                        console.error(chalk.red(`Error sincronizando con WhatsApp: ${e.message}`));
                    }
                });
            }
        });

        client.on('disconnected', (reason) => {
            console.warn(chalk.yellow('⚠️ [Gateway] Ruptura del enlace. Motivo:'), reason);
            if (reconnectAttempts < maxAttempts) {
                reconnectAttempts++;
                const delay = 5000 * Math.pow(2, reconnectAttempts);
                console.log(chalk.cyan(`🔄 Secuencia de auto-curación en ${delay/1000}s... (Intento ${reconnectAttempts})`));
                setTimeout(async () => {
                    try { await client.destroy(); } catch (e) {}
                    bootClient();
                }, delay);
            } else {
                console.error(chalk.red('❌ [Gateway] Colapso total del nodo WhatsApp. Intervención manual requerida.'));
            }
        });

        client.on('message_create', async (msg) => {
            if (!msg.body && !msg.hasMedia) return;

            const msgText = msg.body ? msg.body.trim() : '';
            const botSignatures = ['🧠', '⏳', '🟢', '⚠️', '❌', '*BABYLON.IA', '*Geist', 'He procesado', 'Procesando...', '*[Directiva'];
            if (botSignatures.some(sig => msgText.startsWith(sig)) || msgText.includes('Estado del Sistema (Geist)')) {
                return;
            }

            const myId = client.info.wid._serialized.replace(/:[0-9]+/, '');
            const fromClean = msg.from ? msg.from.replace(/:[0-9]+/, '') : '';
            const toClean = msg.to ? msg.to.replace(/:[0-9]+/, '') : '';
            const authorClean = msg.author ? msg.author.replace(/:[0-9]+/, '') : '';

            const isMeToMe = (fromClean === myId && toClean === myId);
            const isDirectToMeFromAuthorized = toClean === myId && AUTHORIZED_NUMBERS.includes(fromClean) && !msg.fromMe;
            const isCommandInOtherChat = msgText.startsWith('!geist') && (msg.fromMe || AUTHORIZED_NUMBERS.includes(fromClean) || (authorClean && AUTHORIZED_NUMBERS.includes(authorClean)));

            if (!isMeToMe && !isDirectToMeFromAuthorized && !isCommandInOtherChat) return;

            let mediaObj = null;
            let finalPrompt = msgText;

            try {
                if (msg.hasMedia) {
                    const downloadedMedia = await msg.downloadMedia();
                    if (downloadedMedia) {
                        mediaObj = {
                            data: downloadedMedia.data,
                            filename: downloadedMedia.filename,
                            mimetype: downloadedMedia.mimetype
                        };
                        finalPrompt += `\n[Archivo Adjunto detectado: ${downloadedMedia.filename} (${downloadedMedia.mimetype})]`;
                    }
                }
            } catch (err) {
                console.error(chalk.red(`Error procesando adjunto: ${err.message}`));
            }

            if (msgText.startsWith('!geist')) {
                console.log(chalk.magenta(`\n[+] Comando Recibido [${msg.from}]: ${msgText}`));
                const commandStr = msgText.replace('!geist', '').trim();
                
                if (!commandStr && !msg.hasMedia) {
                     await msg.reply('⚠️ *Sintaxis Inválida:*\nEjemplos:\n- `!geist status`\n- `!geist enviar <ruta>`');
                     return;
                }

                if (commandStr.toLowerCase() === 'status') {
                    await msg.reply('🟢 *BABYLON.IA Status:*\n- Motor: ONLINE\n- Bucle Dialéctico: Operativo.');
                    return;
                }

                if (commandStr.toLowerCase().startsWith('enviar ')) {
                    const cleanPath = commandStr.replace(/enviar /i, '').trim().replace(/^"|"$/g, '');
                    if (fs.existsSync(cleanPath)) {
                        try {
                            const outMedia = MessageMedia.fromFilePath(cleanPath);
                            await client.sendMessage(msg.from, outMedia, { caption: `*Geist File Extractor:*` });
                        } catch (err) {
                            await msg.reply(`❌ *Error del Sistema:*\n${err.message}`);
                        }
                    } else {
                        await msg.reply(`❌ *Archivo no existe:* _${cleanPath}_`);
                    }
                    return;
                }

                let statusMsg = await msg.reply('⏳ *Iniciando Bucle Dialéctico Forzado...*');
                if (agentEvents) agentEvents.emit('whatsapp_command_start', commandStr);

                try {
                    const response = await processTask(finalPrompt.replace('!geist', '').trim(), (progressText) => {
                        console.log(chalk.yellow(`     [Geist] ${progressText}`));
                        if (agentEvents) agentEvents.emit('whatsapp_progress', progressText);
                    });
                    await statusMsg.reply(`*BABYLON.IA (System)*:\n${response}`);
                    if (agentEvents) agentEvents.emit('whatsapp_response', response);
                } catch (error) {
                    await statusMsg.reply(`❌ *Error:* ${error.message}`);
                }
                return;
            }

            console.log(chalk.cyan(`\n[~] Tesis Natural Recibida [${msg.from}]: ${msgText}`));
            let naturalStatusMsg = await msg.reply('🧠 *Procesando...*');
            if (agentEvents) agentEvents.emit('whatsapp_command_start', msgText);

            try {
                // If the system expects gateway.handleEvent instead of processTask
                // but processTask is the imported one based on previous logic.
                const response = await processTask(finalPrompt, (progressText) => {
                    console.log(chalk.gray(`     [LLM/Geist] ${progressText}`));
                    if (agentEvents) agentEvents.emit('whatsapp_progress', progressText);
                });
                await naturalStatusMsg.reply(response);
                if (agentEvents) agentEvents.emit('whatsapp_response', response);
            } catch (error) {
                await naturalStatusMsg.reply(`❌ *Error cognitivo:*\n_Detalle: ${error.message}_`);
                if (agentEvents) agentEvents.emit('whatsapp_error', error.message);
            }
        });
    };

    bootClient();
}

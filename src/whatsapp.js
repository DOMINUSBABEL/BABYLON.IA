import qrcode from 'qrcode-terminal';
import pkg from 'whatsapp-web.js';
const { Client, LocalAuth, MessageMedia } = pkg;
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { gateway } from './gateway.js';

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

            const eventData = {
                text: msgText,
                hasMedia: msg.hasMedia,
                media: null,
                channel: 'whatsapp',
                author: authorClean,
                from: fromClean,
                to: toClean,
                isCommand: msgText.toLowerCase().startsWith('!geist'),
                isFromMe: msg.fromMe,
                myId: myId
            };

            // Implementación de Homologación de Autorización a través del Gateway
            if (!gateway.isAuthorized(eventData)) {
                return; // Descartar silenciosamente comandos/mensajes no autorizados
            }

            try {
                if (msg.hasMedia) {
                    const downloadedMedia = await msg.downloadMedia();
                    if (downloadedMedia) {
                        eventData.media = {
                            data: downloadedMedia.data,
                            filename: downloadedMedia.filename,
                            mimetype: downloadedMedia.mimetype
                        };
                    }
                }
            } catch (err) {
                console.error(chalk.red(`Error descargando adjunto: ${err.message}`));
            }

            let statusMsg = await msg.reply(eventData.isCommand ? '⏳ *Iniciando Bucle Dialéctico Forzado...*' : '🧠 *Procesando...*');
            if (agentEvents) agentEvents.emit('whatsapp_command_start', msgText);

            try {
                const responseObj = await gateway.handleEvent(eventData, (progressText) => {
                    console.log(chalk.gray(`     [Geist] ${progressText}`));
                    if (agentEvents) agentEvents.emit('whatsapp_progress', progressText);
                });

                if (responseObj.type === 'file' && responseObj.path) {
                    try {
                        const outMedia = MessageMedia.fromFilePath(responseObj.path);
                        await client.sendMessage(msg.from, outMedia, { caption: responseObj.caption });
                        if (agentEvents) agentEvents.emit('whatsapp_response', 'Archivo enviado');
                    } catch (err) {
                        await statusMsg.reply(`❌ *Error del Sistema:*\n${err.message}`);
                        if (agentEvents) agentEvents.emit('whatsapp_error', err.message);
                    }
                } else if (responseObj.text) {
                    await statusMsg.reply((eventData.isCommand ? '*BABYLON.IA (System)*:\n' : '') + responseObj.text);
                    if (agentEvents) agentEvents.emit('whatsapp_response', responseObj.text);
                }

            } catch (error) {
                await statusMsg.reply(`❌ *Error cognitivo:*\n_Detalle: ${error.message}_`);
                if (agentEvents) agentEvents.emit('whatsapp_error', error.message);
            }
        });

        client.initialize();
    };

    bootClient();
}

export function pairWhatsAppClient() {
    return new Promise((resolve, reject) => {
        console.log(chalk.cyan('\n[!] Inicializando motor temporal para escaneo de código QR...'));
        const puppeteerArgs = ['--no-sandbox', '--disable-setuid-sandbox'];
        let executablePath = undefined;

        if (process.env.ENVIRONMENT === 'mobile_terminal') {
            puppeteerArgs.push(
                '--disable-dev-shm-usage', '--disable-accelerated-2d-canvas', '--no-first-run', '--no-zygote',
                '--single-process', '--disable-gpu', '--disable-extensions', '--disable-software-rasterizer',
                '--disable-background-networking', '--disable-background-timer-throttling', '--disable-client-side-phishing-detection',
                '--disable-default-apps', '--disable-hang-monitor', '--disable-popup-blocking', '--disable-prompt-on-repost',
                '--disable-sync', '--disable-translate', '--metrics-recording-only', '--no-default-browser-check',
                '--safebrowsing-disable-auto-update', '--mute-audio', '--blink-settings=imagesEnabled=false'
            );
            executablePath = process.env.CHROME_BIN || process.env.PUPPETEER_EXECUTABLE_PATH || '/data/data/com.termux/files/usr/bin/chromium-browser';
            if (!fs.existsSync(executablePath)) executablePath = undefined;
        }

        const client = new Client({
            authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
            puppeteer: {
                args: puppeteerArgs,
                executablePath: executablePath
            },
            webVersionCache: { type: 'remote', remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html' }
        });

        client.on('qr', (qr) => {
            console.log(chalk.yellow('\n[!] Escanea el siguiente código QR con tu aplicación de WhatsApp (Dispositivos Vinculados):'));
            qrcode.generate(qr, { small: true });
        });

        client.on('ready', async () => {
            console.log(chalk.greenBright.bold('\n✅ Autenticación exitosa. Enlace guardado en memoria de sesión.'));
            await client.destroy();
            resolve();
        });

        client.on('auth_failure', async (msg) => {
            console.error(chalk.red(`\n❌ Error de autenticación: ${msg}`));
            await client.destroy();
            reject(new Error(msg));
        });

        client.initialize().catch(err => {
            console.error(chalk.red(`\n❌ Error inicializando cliente para emparejamiento: ${err.message}`));
            reject(err);
        });
    });
}

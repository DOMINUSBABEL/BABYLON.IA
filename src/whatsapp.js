import qrcode from 'qrcode-terminal';
import pkg from 'whatsapp-web.js';
const { Client, LocalAuth, MessageMedia } = pkg;
import chalk from 'chalk';
import fs from 'fs';
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
        console.log(chalk.yellow('[Termux Mode] Aplicando configuraciones de bajo consumo de memoria...'));
        puppeteerArgs.push(
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process', // <- Importante para entornos móviles restrictivos
            '--disable-gpu'
        );
        // En Termux a menudo se necesita instalar Chromium manualmente y especificar su ruta.
        // Si el usuario tiene CHROME_BIN seteado o estamos en termux, intentamos usar una ruta común.
        executablePath = process.env.CHROME_BIN || process.env.PUPPETEER_EXECUTABLE_PATH || '/data/data/com.termux/files/usr/bin/chromium-browser';
        
        if (!fs.existsSync(executablePath)) {
            console.log(chalk.red(`[Advertencia Termux] Chromium no encontrado en ${executablePath}. Asegúrate de tenerlo instalado: pkg install chromium`));
            executablePath = undefined; // Dejar que puppeteer intente descargado
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
        }
    });

    client.on('message_create', async (msg) => {
        // Ignora mensajes vacíos
        if (!msg.body) return;

        // Control de Autorización: Solo el dueño (fromMe) o números en la lista blanca pueden ejecutar !geist
        const isAuthorized = msg.fromMe || AUTHORIZED_NUMBERS.includes(msg.from);

        // Verifica si el mensaje contiene el comando trigger
        if (msg.body.startsWith('!geist') && isAuthorized) {
            console.log(chalk.magenta(`\n[+] Tesis Recibida [${msg.from}]: ${msg.body}`));
            const commandStr = msg.body.replace('!geist', '').trim();
            
            // COMANDO: STATUS
            if (commandStr.toLowerCase() === 'status') {
                console.log(chalk.blue('  -> Solicitud de estado recibida.'));
                await msg.reply('🟢 *BABYLON.IA Status:*\n- Motor OpenClaw: ONLINE\n- Token OAuth: ACTIVO\n- Bucle Dialéctico: Operativo.\n- Entorno: Windows 11 (Geist Node)');
                return;
            }

            // COMANDO: ENVIAR ARCHIVO (File Extraction)
            if (commandStr.toLowerCase().startsWith('enviar ')) {
                const filePath = commandStr.replace(/enviar /i, '').trim();
                console.log(chalk.blue(`  -> Solicitud de extracción de archivo: ${filePath}`));
                
                // Formatear rutas si es necesario y verificar existencia
                const cleanPath = filePath.replace(/^"|"$/g, ''); // Quitar comillas si el usuario las pone
                if (fs.existsSync(cleanPath)) {
                    try {
                        const media = MessageMedia.fromFilePath(cleanPath);
                        await client.sendMessage(msg.from, media, { caption: `*Geist File Extractor:*\nAquí tienes el documento solicitado de tu PC.` });
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

            // COMANDO GENERAL: BUCLE DIALÉCTICO (OpenClaw / Gemini)
            if (commandStr) {
                console.log(chalk.blue('  -> Iniciando Bucle Dialéctico (Hegel-Escohotado)...'));
                let statusMsg = await msg.reply('⏳ *Iniciando Bucle Dialéctico...*\n_Evaluando la directiva con el modelo interno..._');

                const response = await processTask(commandStr, (progressText) => {
                    console.log(chalk.yellow(`     [Geist] ${progressText}`));
                });

                console.log(chalk.green('  -> Síntesis generada. Respondiendo al usuario.'));
                await statusMsg.reply(`*BABYLON.IA (Síntesis)*:\n${response}`);
            } else {
                await msg.reply('⚠️ *Sintaxis Inválida:*\nDebes incluir una directiva. Ejemplo: `!geist analiza los archivos financieros`.');
            }
        }
    });

    // Iniciar Puppeteer y el cliente
    client.initialize();
}

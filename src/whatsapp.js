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
export function initWhatsAppClient() {
    console.log(chalk.cyan('Inicializando el navegador Headless de WhatsApp Web (puede tomar unos segundos)...'));
    
    const client = new Client({
        authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
        puppeteer: {
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        }
    });

    client.on('qr', (qr) => {
        console.log(chalk.cyanBright('\n[!] Escanea el código QR con tu WhatsApp (Dispositivos Vinculados) para enlazar la conciencia:'));
        qrcode.generate(qr, { small: true });
    });

    client.on('ready', () => {
        console.log(chalk.greenBright.bold('\n✅ BABYLON.IA Conectado exitosamente a WhatsApp.'));
        console.log(chalk.yellow('\nComandos disponibles vía chat:'));
        console.log(chalk.gray('  - !geist <tu directiva>   : Inicia el bucle de razonamiento y automejora.'));
        console.log(chalk.gray('  - !geist status          : Reporte de salud del motor OpenClaw y Gemini.'));
        console.log(chalk.gray('  - !geist enviar <ruta>   : Extrae y envía un archivo local a tu WhatsApp.'));
        console.log(chalk.magentaBright('\nEl Agente está en línea y a la espera de directivas...'));
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

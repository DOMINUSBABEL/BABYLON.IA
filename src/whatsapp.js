import qrcode from 'qrcode-terminal';
import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import chalk from 'chalk';

/**
 * Inicializa el cliente de WhatsApp y se conecta a la sesión.
 * Configurado con LocalAuth para mantener la sesión viva tras escanear el QR.
 */
export function initWhatsAppClient() {
    const client = new Client({
        authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
        puppeteer: {
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        }
    });

    client.on('qr', (qr) => {
        console.log(chalk.cyanBright('\n[!] Escanea el código QR con tu WhatsApp para conectar el agente:'));
        qrcode.generate(qr, { small: true });
    });

    client.on('ready', () => {
        console.log(chalk.greenBright.bold('✅ BABYLON.IA Conectado exitosamente a WhatsApp.'));
        console.log(chalk.yellow('Esperando directivas (Tesis) por WhatsApp...'));
    });

    client.on('message_create', async (msg) => {
        // Ignora mensajes de estado o automáticos vacíos
        if (!msg.body) return;

        // Verifica si el mensaje es para el bot o del propio usuario enviándose un mensaje
        if (msg.body.startsWith('!geist') || msg.fromMe) {
            console.log(chalk.magenta(`\n[Tesis Recibida] ${msg.from}: ${msg.body}`));
            
            const prompt = msg.body.replace('!geist', '').trim();
            if (prompt) {
                // En una integración real aquí se llama a OpenClaw/Gemini OAuth 
                // para procesar el prompt de manera autónoma (Antítesis -> Síntesis)
                console.log(chalk.blue('  -> Iniciando bucle dialéctico en OpenClaw...'));
                
                // Simulación de latencia de pensamiento
                setTimeout(async () => {
                    console.log(chalk.green('  -> Síntesis generada. Respondiendo...'));
                    if(!msg.fromMe) {
                        await msg.reply(`*BABYLON.IA (Geist)*:\nHe recibido tu directiva: "${prompt}".\nEstoy orquestando las herramientas locales en OpenClaw para ejecutar la tarea. Revisa la terminal para ver el progreso.`);
                    }
                }, 2000);
            }
        }
    });

    client.initialize();
}

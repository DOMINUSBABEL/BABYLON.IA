import chalk from 'chalk';
import figlet from 'figlet';
import gradient from 'gradient-string';
import ora from 'ora';
import { getGeminiOAuthToken } from './src/auth.js';
import { initWhatsAppClient } from './src/whatsapp.js';

// Diseño Visual al Iniciar
function displayFancyHeader() {
    console.clear();
    const asciiArt = figlet.textSync('BABYLON.IA', {
        font: '3D-ASCII',
        horizontalLayout: 'default',
        verticalLayout: 'default'
    });

    console.log(gradient.pastel.multiline(asciiArt));
    console.log(chalk.dim('========================================================================'));
    console.log(chalk.bold.hex('#FFD700')(' BABYLON.IA ')+ chalk.gray('| Arquitectura Geist x OpenClaw | Bucle Hegel-Asimov'));
    console.log(chalk.dim(' Autor: Juan Esteban Gómez Bernal'));
    console.log(chalk.dim('========================================================================\n'));
}

async function startAgent() {
    displayFancyHeader();

    const spinner = ora('Verificando Conciencia Geist y Credenciales OAuth de Gemini...').start();
    
    try {
        // 1. Verificar credenciales de Gemini CLI (OAUTH BRIDGE)
        const creds = getGeminiOAuthToken();
        spinner.succeed(chalk.green(`Conciencia enlazada. Token OAuth detectado para el cliente: ${chalk.bold(creds.client_id.substring(0,10))}...`));

        // 2. Levantar la Interfaz Móvil (WhatsApp)
        console.log(chalk.cyanBright('\n[!] Iniciando Motor de Comunicación (WhatsApp Web)...'));
        initWhatsAppClient();

    } catch (error) {
        spinner.fail(chalk.red('Error en el arranque de la conciencia.'));
        console.error(chalk.redBright(`[X] Detalle: ${error.message}`));
        console.log(chalk.yellow('\nPara solucionar este error, asegúrate de haber ejecutado "gemini login" en tu terminal previamente.'));
        process.exit(1);
    }
}

// Ejecución principal
startAgent();

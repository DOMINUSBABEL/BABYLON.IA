import chalk from 'chalk';
import figlet from 'figlet';
import gradient from 'gradient-string';
import ora from 'ora';
import { getGeminiOAuthToken } from './src/auth.js';
import { initWhatsAppClient } from './src/whatsapp.js';

// DiseÃ±o Visual al Iniciar
function displayFancyHeader() {
    console.clear();
    const termWidth = process.stdout.columns || 80;
    const fontToUse = termWidth < 65 ? 'Standard' : '3D-ASCII';
    const separator = '='.repeat(Math.min(termWidth, 72));

    const asciiArt = figlet.textSync(termWidth < 50 ? 'BABYLON' : 'BABYLON.IA', {
        font: fontToUse,
        horizontalLayout: 'default',
        verticalLayout: 'default',
        width: termWidth,
        whitespaceBreak: true
    });

    console.log(gradient.pastel.multiline(asciiArt));
    console.log(chalk.dim(separator));
    
    if (termWidth < 65) {
        console.log(chalk.bold.hex('#FFD700')(' BABYLON.IA '));
        console.log(chalk.gray(' Arquitectura Geist x OpenClaw'));
    } else {
        console.log(chalk.bold.hex('#FFD700')(' BABYLON.IA ')+ chalk.gray('| Arquitectura Geist x OpenClaw | Bucle Hegel-Asimov'));
    }
    
    console.log(chalk.dim(' Autor: Juan Esteban GÃ³mez Bernal'));
    console.log(chalk.dim(separator) + '\n');
}

async function startAgent() {
    displayFancyHeader();

    const spinner = ora('Verificando Conciencia Geist y Credenciales OAuth de Gemini...').start();

    try {
        // 1. Verificar credenciales de Gemini CLI (OAUTH BRIDGE)
        const creds = getGeminiOAuthToken();
        spinner.succeed(chalk.green(`Conciencia enlazada. Token OAuth detectado para el cliente: ${chalk.bold(creds.client_id.substring(0,10))}...`));

        // 2. Levantar la Interfaz MÃ³vil (WhatsApp)
        console.log(chalk.cyanBright('\n[!] Iniciando Motor de ComunicaciÃ³n (WhatsApp Web)...'));
        initWhatsAppClient();

    } catch (error) {
        spinner.fail(chalk.red('Error en el arranque de la conciencia.'));
        console.error(chalk.redBright(`[X] Detalle: ${error.message}`));
        console.log(chalk.yellow('\nPara solucionar este error, asegÃºrate de haber ejecutado "gemini login" en tu terminal previamente.'));
        process.exit(1);
    }
}

// EjecuciÃ³n principal
startAgent();

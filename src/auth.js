import open from 'open';
import fs from 'fs';
import path from 'path';
import os from 'os';

import { promises as fsPromises } from 'fs';

/**
 * Intenta abrir una URL en el navegador predeterminado del sistema
 * @param {string} url La URL a abrir
 */
function openBrowser(url) {
    open(url).catch(err => {
        console.error(`\nNo se pudo abrir el navegador automáticamente. Por favor abre la siguiente URL manualmente: ${url}`);
    });
}

/**
 * Lee las credenciales OAuth del Gemini CLI local
 * @returns {Promise<object>} Contenido del archivo oauth_creds.json
 */
export async function getGeminiOAuthToken() {
    const homedir = os.homedir();
    const credsPath = path.join(homedir, '.gemini', 'oauth_creds.json');
    
    if (!fs.existsSync(credsPath)) {
        console.log(`\n[OAuth] No se encontró el archivo de credenciales en ${credsPath}.`);
        console.log(`[OAuth] Intentando abrir el navegador para la autenticación u obteniendo URL de configuración...`);
        // Provide general instructions or point to gemini setup URL, as the actual gemini CLI runs its own flow
        // The user usually runs 'gemini login' to create this file.
        // We will output instructions.
        console.log(`[!] Por favor, ejecuta 'gemini login' en tu terminal y completa el proceso en el navegador.`);

        // As a fallback/help we can open the Google AI Studio page to get the user started if they prefer API Keys
        open('https://aistudio.google.com/app/apikey').catch(e => console.error("Error abriendo el navegador:", e));

        throw new Error(`No se encontró el archivo de credenciales. Debes iniciar sesión con Gemini CLI primero.`);
    }

    try {
        const data = await fsPromises.readFile(credsPath, 'utf8');
        const creds = JSON.parse(data);
        return creds;
    } catch (error) {
        throw new Error(`Error leyendo o parseando oauth_creds.json: ${error.message}`);
    }
}


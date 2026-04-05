import fs from 'fs';
import path from 'path';
import os from 'os';

import { promises as fsPromises } from 'fs';

/**
 * Lee las credenciales OAuth del Gemini CLI local
 * @returns {Promise<object>} Contenido del archivo oauth_creds.json
 */
export async function getGeminiOAuthToken() {
    const homedir = os.homedir();
    const credsPath = path.join(homedir, '.gemini', 'oauth_creds.json');
    
    if (!fs.existsSync(credsPath)) {
        throw new Error(`No se encontró el archivo de credenciales en ${credsPath}. Debes iniciar sesión con Gemini CLI primero.`);
    }

    try {
        const data = await fsPromises.readFile(credsPath, 'utf8');
        const creds = JSON.parse(data);
        return creds;
    } catch (error) {
        throw new Error(`Error leyendo o parseando oauth_creds.json: ${error.message}`);
    }
}


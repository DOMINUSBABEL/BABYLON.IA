import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';

export class QuickReadPlugin {
    constructor() {
        this.name = 'QuickRead Text Plugin';
        this.supportedExtensions = [
            '.txt', '.csv', '.json', '.md', '.html', '.xml', 
            '.js', '.ts', '.py', '.java', '.c', '.cpp', '.h', '.hpp',
            '.css', '.yml', '.yaml', '.sh', '.bat', '.ps1'
        ];
    }

    async process(filePath) {
        try {
            const stats = await fs.stat(filePath);
            
            // Si el archivo pesa menos de 15KB, lo leemos directamente para ahorrar un tool call al LLM
            if (stats.size < 15 * 1024) {
                console.log(chalk.gray(`[QuickRead] Archivo de ${stats.size} bytes. Inyectando contenido directo...`));
                const content = await fs.readFile(filePath, 'utf-8');
                return `[CONTENIDO DIRECTO EXTRAÍDO DEL ARCHIVO]\n${content}\n[FIN DEL CONTENIDO DEL ARCHIVO]`;
            } else {
                console.log(chalk.gray(`[QuickRead] Archivo muy grande (${stats.size} bytes). Delegando a las herramientas del LLM.`));
                return `[NOTA DE SISTEMA]\nEl archivo de texto/código pesa ${Math.round(stats.size / 1024)}KB y excede el límite de auto-inyección rápida. DEBES usar la herramienta 'read_file' o 'grep_search' obligatoriamente en la ruta proporcionada para leer su contenido y poder responder.\n[/NOTA DE SISTEMA]`;
            }
        } catch (error) {
            console.error(`Error en QuickReadPlugin: ${error.message}`);
            return null;
        }
    }
}

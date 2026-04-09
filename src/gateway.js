import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { processTask } from './agent_core.js';
import { pluginManager } from './plugins/PluginManager.js';

/**
 * Unificación de Canales (API Gateway / Middleware)
 * Centraliza la recepción de eventos, validación de autorización, 
 * descarga de media y enrutamiento hacia el core del agente.
 */
class Gateway {
    constructor() {
        this.AUTHORIZED_NUMBERS = [
            // 'tu_numero@c.us'
        ];
    }

    /**
     * Procesa un evento unificado proveniente de cualquier canal.
     * @param {Object} event { text, hasMedia, media, channel, author, from, to, isCommand, isAuthorized }
     * @param {Function} updateProgress Callback para el progreso
     */
    async handleEvent(event, updateProgress) {
        let finalPrompt = event.text || '';

        // Descarga y formateo de Media (Común para todos los canales si proveen el objeto media)
        if (event.hasMedia && event.media) {
            try {
                const mediaDir = path.join(process.cwd(), 'workspace', 'media');
                if (!fs.existsSync(mediaDir)) {
                    fs.mkdirSync(mediaDir, { recursive: true });
                }
                
                let fileName = event.media.filename;
                if (!fileName) {
                    let ext = '';
                    if (event.media.mimetype) {
                        const mimeType = event.media.mimetype.split(';')[0];
                        if (mimeType === 'application/pdf') ext = '.pdf';
                        else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') ext = '.docx';
                        else if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') ext = '.xlsx';
                        else if (mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') ext = '.pptx';
                        else if (mimeType.startsWith('image/')) ext = '.' + mimeType.split('/')[1];
                        else if (mimeType.startsWith('audio/')) ext = '.' + mimeType.split('/')[1].replace('ogg; codecs=opus', 'ogg');
                        else if (mimeType.startsWith('video/')) ext = '.' + mimeType.split('/')[1];
                    }
                    fileName = `media_${Date.now()}${ext.replace(/[^a-zA-Z0-9.]/g, '')}`;
                }
                
                const filePath = path.join(mediaDir, fileName);
                fs.writeFileSync(filePath, event.media.data, 'base64');
                
                console.log(chalk.yellow(`\n[!] Archivo adjunto descargado y guardado en: ${filePath}`));

                // --- Plugin Manager Integration ---
                const pluginReport = await pluginManager.processFile(filePath);
                let reportInjection = '';
                if (pluginReport) {
                    reportInjection = `\n\n--- REPORTE DE PLUGINS DE ANÁLISIS AUTOMÁTICO ---\n${pluginReport}\n-------------------------------------------------\n`;
                }

                finalPrompt = `[ATENCIÓN: El usuario ha enviado un archivo multimedia/documento. El archivo fue descargado exitosamente y se encuentra en esta ruta local exacta: ${filePath} . DEBES usar obligatoriamente tu herramienta de lectura de archivos ('read_file') para abrir, leer y analizar el contenido de este archivo antes de dar una respuesta.]${reportInjection}\n\nDirectiva del usuario: ${finalPrompt || 'Analiza el archivo adjunto.'}`;
            } catch (err) {
                console.error(chalk.red(`Error al procesar el archivo adjunto en Gateway: ${err.message}`));
            }
        }

        // Comandos Especiales (!geist)
        const isGeistCommand = finalPrompt.trim().toLowerCase().startsWith('!geist');
        if (isGeistCommand || event.isCommand) {
            const commandStr = finalPrompt.replace(/^!geist/i, '').trim();
            
            if (!commandStr && !event.hasMedia) {
                return { type: 'error', text: '⚠️ *Sintaxis Inválida:*\nEl prefijo `!geist` se usa para comandos de sistema. Ejemplos:\n- `!geist status`\n- `!geist enviar <ruta>`' };
            }

            if (commandStr.toLowerCase() === 'status') {
                return { type: 'text', text: '🟢 *BABYLON.IA Status:*\n- Motor Gemini CLI: ONLINE\n- Token OAuth: ACTIVO\n- Bucle Dialéctico: Operativo.\n- Entorno: Gateway Middleware' };
            }

            if (commandStr.toLowerCase().startsWith('enviar ')) {
                const filePathStr = commandStr.replace(/enviar /i, '').trim();
                const cleanPath = filePathStr.replace(/^"|"$/g, '');
                
                if (fs.existsSync(cleanPath)) {
                    return { type: 'file', path: cleanPath, caption: '*Geist File Extractor:*\nAquí tienes el documento solicitado de tu PC.' };
                } else {
                    return { type: 'error', text: `❌ *Aporía Encontrada:*\nEl archivo no existe en la ruta local proporcionada:\n_${cleanPath}_` };
                }
            }
        }

        // Procesamiento en Agent Core
        const response = await processTask(finalPrompt, updateProgress);
        return { type: 'text', text: response };
    }
}

export const gateway = new Gateway();

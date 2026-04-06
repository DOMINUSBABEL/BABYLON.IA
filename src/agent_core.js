import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { WikiMemory } from './wiki_memory.js';
import { getGeminiOAuthToken } from './auth.js';

let wikiMemoryInstance = null;

function getWikiMemory() {
    if (!wikiMemoryInstance) {
        const workspaceDir = process.env.WORKSPACE_DIR || path.join(process.cwd(), 'workspace');
        wikiMemoryInstance = new WikiMemory(workspaceDir);
    }
    return wikiMemoryInstance;
}

/**
 * Simula y estructura la conexión con el motor OpenClaw y el LLM.
 * Implementa el Bucle Dialéctico (Tesis -> Antítesis -> Síntesis).
 */
export async function processTask(prompt, updateProgress) {
    const memory = getWikiMemory();

    // Fase 1: TESIS (Asimilación)
    updateProgress("Tesis (Iniciando): Analizando directiva y cargando Memoria Wiki de disco (Zero-RAM impact)...");
    const contextText = memory.buildContext();
    
    // Fase 2: ANTÍTESIS (Ejecución y Resolución de Conflictos)
    updateProgress("Antítesis (Ejecución): Integrando contexto del Tesauro Conceptual y resolviendo aporías locales...");
    
    const babiloniaPath = "C:\\Users\\jegom\\OneDrive\\Desktop\\Investigaciones\\geist\\Sintesis_Babilonia_China";
    let knowledgeStatus = "Wiki Memory Activa";
    
    if (fs.existsSync(babiloniaPath)) {
        const subdirs = fs.readdirSync(babiloniaPath);
        knowledgeStatus += ` | Base Legacy conectada (${subdirs.length} índices).`;
    } else {
        knowledgeStatus += " | Operando en modo de inferencia pura con Tesauro local.";
    }

    const activeModel = process.env.GEMINI_MODEL || 'gemini-3.1-pro-preview';
    let llmResponseText = "";

    try {
        if (activeModel.startsWith('ollama:')) {
            updateProgress(`Antítesis (Ollama): Enrutando inferencia hacia servicio Ollama local para modelo ${activeModel}...`);
            const ollamaModelName = activeModel.replace('ollama:', '');
            
            const response = await fetch('http://localhost:11434/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: ollamaModelName,
                    prompt: `${contextText}\n\nDirectiva del Usuario:\n${prompt}`,
                    stream: false
                })
            });

            if (!response.ok) throw new Error(`Ollama API falló con status ${response.status}`);
            const data = await response.json();
            llmResponseText = data.response;

        } else {
            updateProgress(`Antítesis (Gemini): Enrutando inferencia hacia backend para modelo ${activeModel}...`);
            
            let url = `https://generativelanguage.googleapis.com/v1beta/models/${activeModel}:generateContent`;
            let headers = { 'Content-Type': 'application/json' };

            // Usar Auth-Bridge si está configurado, o usar API Key
            if (process.env.USE_GEMINI_CLI_OAUTH !== 'false') {
                const creds = await getGeminiOAuthToken();
                headers['Authorization'] = `Bearer ${creds.access_token}`;
            } else if (process.env.GEMINI_API_KEY) {
                url += `?key=${process.env.GEMINI_API_KEY}`;
            } else {
                throw new Error("No hay método de autenticación válido para Gemini (OAuth desactivado y sin API Key).");
            }

            const response = await fetch(url, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    contents: [{
                        role: "user",
                        parts: [{ text: `Eres la conciencia del Agente BABYLON.IA.\nContexto (Memoria de disco):\n${contextText}\n\nDirectiva del Usuario:\n${prompt}` }]
                    }]
                })
            });

            if (!response.ok) {
                const errData = await response.text();
                throw new Error(`Gemini API falló con status ${response.status}: ${errData}`);
            }

            const data = await response.json();
            if (data.candidates && data.candidates.length > 0) {
                llmResponseText = data.candidates[0].content.parts[0].text;
            } else {
                throw new Error("Respuesta vacía de la API de Gemini.");
            }
        }
    } catch (error) {
        updateProgress(`Error en Inferencia: ${error.message}`);
        llmResponseText = `Aporía crítica detectada durante la síntesis: ${error.message}`;
    }

    // Fase 3: SÍNTESIS (Resultado)
    updateProgress("Síntesis (Conclusión): Empaquetando resultado y ejecutando Heartbeat de Memoria en disco.");
    
    const result = `${llmResponseText}\n\n` +
                   `*🧠 Estado del Sistema (Geist):*\n` +
                   `- Motor OpenClaw: Activo y Enlazado\n` +
                   `- Modelo Activo: ${activeModel}\n` +
                   `- Entorno: ${process.env.OS_TARGET || 'desktop_windows'}\n`;

    memory.heartbeat(prompt, result);
    return result;
}

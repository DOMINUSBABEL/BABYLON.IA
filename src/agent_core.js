import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { WikiMemory } from './wiki_memory.js';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

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
            updateProgress(`Antítesis (OpenClaw): Enrutando inferencia mediante el daemon local OpenClaw usando modelo ${activeModel}...`);
            
            // Reemplazo del fetch directo por la llamada al agente inter-proceso de OpenClaw
            // Esto utiliza de forma nativa los scopes OAuth y tokens que ya tiene validados OpenClaw
            const escapedPrompt = `${contextText}\n\nDirectiva del Usuario:\n${prompt}`.replace(/"/g, '\\"');
            
            const { stdout, stderr } = await execPromise(`openclaw agent --agent main --message "${escapedPrompt}" --json`, {
                maxBuffer: 1024 * 1024 * 5, // Aumentar el buffer para respuestas largas
            });

            // Encontrar el inicio del JSON en stdout (OpenClaw a veces imprime warnings en stderr o al inicio de stdout)
            const jsonStartIndex = stdout.indexOf('{');
            if (jsonStartIndex === -1) {
                throw new Error("No se pudo analizar la respuesta JSON de OpenClaw: " + stdout);
            }
            
            const jsonOutput = stdout.substring(jsonStartIndex);
            const data = JSON.parse(jsonOutput);

            if (data.payloads && data.payloads.length > 0 && data.payloads[0].text) {
                llmResponseText = data.payloads[0].text;
            } else {
                throw new Error("Respuesta vacía o formato desconocido del agente OpenClaw.");
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

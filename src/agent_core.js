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
    const promptPreview = prompt.length > 30 ? prompt.substring(0, 30) + '...' : prompt;
    updateProgress(`Tesis (Iniciando): Analizando directiva [${promptPreview}] y cargando Memoria Wiki de disco (Zero-RAM impact)...`);
    const contextText = memory.buildContext();
    
    // Fase 2: ANTÍTESIS (Ejecución y Resolución de Conflictos)
    updateProgress("Antítesis (Estructuración): Integrando contexto del Tesauro Conceptual y resolviendo dependencias de la consulta...");
    
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
    let statsStr = "";

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
            updateProgress(`Antítesis (Gemini CLI): Desplegando agentes cognitivos y ejecutando inferencia sobre el modelo ${activeModel}...`);
            
            // Usamos spawn para inyectar el contexto por la entrada estándar (stdin) y evitar el límite de longitud en terminales
            // Esto utiliza de forma nativa los scopes OAuth y tokens que ya tiene validados el CLI de Gemini
            const { spawn } = await import('child_process');
            
            const geminiBin = process.platform === 'win32' ? 'gemini.cmd' : 'gemini';
            
            // Pasamos el comando como un solo string para evitar el DeprecationWarning de Node al usar shell: true con arrays
            const geminiProcess = spawn(`${geminiBin} -m ${activeModel} -p " " -o json`, { 
                shell: true
            });

            let stdoutData = '';
            let stderrData = '';

            geminiProcess.stdout.setEncoding('utf8');
            geminiProcess.stderr.setEncoding('utf8');

            geminiProcess.stdout.on('data', (data) => {
                stdoutData += data;
                // Intentar dar feedback en tiempo real si vemos progreso en herramientas
                if (data.includes('call:')) {
                    updateProgress(`Subagente (Herramienta): Ejecutando operaciones de sistema...`);
                }
            });

            geminiProcess.stderr.on('data', (data) => {
                stderrData += data;
            });

            const fullPrompt = `${contextText}\n\nDirectiva del Usuario:\n${prompt}`;
            
            // Escribir el contexto en la entrada estándar y cerrarla
            geminiProcess.stdin.setDefaultEncoding('utf-8');
            geminiProcess.stdin.write(fullPrompt);
            geminiProcess.stdin.end();

            await new Promise((resolve, reject) => {
                geminiProcess.on('close', (code) => {
                    if (code !== 0) {
                        reject(new Error(`Gemini CLI falló con código ${code}: ${stderrData}`));
                    } else {
                        resolve();
                    }
                });
                geminiProcess.on('error', reject);
            });

            const jsonStartIndex = stdoutData.indexOf('{');
            if (jsonStartIndex === -1) {
                throw new Error("No se pudo analizar la respuesta JSON de Gemini CLI: " + stdoutData);
            }
            
            const jsonOutput = stdoutData.substring(jsonStartIndex);
            const data = JSON.parse(jsonOutput);

            if (data.response) {
                llmResponseText = data.response;
                
                // Extraer estadísticas para detallar el razonamiento
                if (data.stats && data.stats.models && data.stats.models[activeModel]) {
                    const mStats = data.stats.models[activeModel].tokens;
                    const latency = data.stats.models[activeModel].api ? data.stats.models[activeModel].api.totalLatencyMs : 0;
                    const toolCalls = data.stats.tools ? data.stats.tools.totalCalls : 0;
                    
                    statsStr = `\n- Tokens procesados: ${mStats.total || 0} (${latency}ms)`;
                    if (toolCalls > 0) {
                        statsStr += `\n- Subagentes/Tools ejecutados: ${toolCalls}`;
                        updateProgress(`Antítesis (Validación): Subagentes completaron ${toolCalls} tareas satélite. Validando síntesis...`);
                    } else {
                        updateProgress(`Antítesis (Validación): Estructuración cognitiva completada en ${latency}ms.`);
                    }
                }
            } else {
                throw new Error("Respuesta vacía o formato desconocido del agente Gemini CLI.");
            }
        }
    } catch (error) {
        updateProgress(`Error en Inferencia: ${error.message}`);
        llmResponseText = `Aporía crítica detectada durante la síntesis: ${error.message}`;
    }

    // Fase 3: SÍNTESIS (Resultado)
    updateProgress("Síntesis (Conclusión): Empaquetando resultado final, indexando aprendizajes y ejecutando Heartbeat de Memoria en disco.");
    
    const result = `${llmResponseText}\n\n` +
                   `*🧠 Estado del Sistema (Geist):*\n` +
                   `- Motor Gemini CLI: Activo y Enlazado\n` +
                   `- Modelo Activo: ${activeModel}${statsStr}\n` +
                   `- Entorno: ${process.env.OS_TARGET || 'desktop_windows'}\n`;

    memory.heartbeat(prompt, result);
    return result;
}

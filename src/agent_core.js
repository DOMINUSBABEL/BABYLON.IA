import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { WikiMemory } from './wiki_memory.js';
import { TEIParser } from './tei_parser.js';
import { exec } from 'child_process';
import util from 'util';
import { GoogleGenAI } from '@google/genai';

const execPromise = util.promisify(exec);

let wikiMemoryInstance = null;
let teiParserInstance = null;

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
    if (!teiParserInstance) teiParserInstance = new TEIParser();

    // Fase 1: TESIS (Asimilación)
    const promptPreview = prompt.length > 30 ? prompt.substring(0, 30) + '...' : prompt;
    updateProgress(`Tesis (Iniciando): Analizando directiva [${promptPreview}] y cargando Memoria Wiki de disco (Zero-RAM impact)...`);
    let contextText = memory.buildContext();

    // Inyección dinámica si el usuario menciona análisis XML-TEI o archivos XML
    const xmlRegex = /([a-zA-Z0-9_\-\\]+\.xml)/i;
    const xmlMatch = prompt.match(xmlRegex);

    if (xmlMatch) {
        const potentialXmlPath = xmlMatch[1];
        // En un entorno real validaríamos si el path es absoluto o relativo al workspace
        const resolvedPath = path.resolve(process.cwd(), potentialXmlPath);
        if (fs.existsSync(resolvedPath)) {
            updateProgress(`Antítesis (Humanidades Digitales): Detectado corpus XML-TEI. Parseando documento y extrayendo metadatos/entidades...`);
            const teiReport = teiParserInstance.generateAnalysisReport(resolvedPath);
            contextText += `\n\n--- REPORTE XML-TEI EXTRAÍDO AUTOMÁTICAMENTE ---\n${teiReport}\n------------------------------------------------\n`;
        } else {
             updateProgress(`Antítesis (Humanidades Digitales): Se mencionó el archivo ${potentialXmlPath} pero no se encontró en disco. Se procederá con análisis teórico.`);
        }
    } else if (prompt.toLowerCase().includes('tei') || prompt.toLowerCase().includes('tesauro') || prompt.toLowerCase().includes('intertextual')) {
         updateProgress(`Antítesis (Humanidades Digitales): Activando heurísticas de codificación XML-TEI y análisis de redes (Metodología A. Echavarría)...`);
    }
    
    // Fase 2: ANTÍTESIS (Ejecución y Resolución de Conflictos)
    updateProgress("Antítesis (Estructuración): Integrando contexto del Tesauro Conceptual y resolviendo dependencias de la consulta...");
    
    const babiloniaPath = process.env.LEGACY_KNOWLEDGE_DIR || path.join(process.cwd(), 'workspace', 'geist');
    let knowledgeStatus = "Wiki Memory Activa";
    
    if (fs.existsSync(babiloniaPath)) {
        const subdirs = fs.readdirSync(babiloniaPath);
        knowledgeStatus += ` | Base Geist Local conectada (${subdirs.length} índices).`;
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
            
            const ollamaHost = process.env.OLLAMA_HOST || 'http://localhost:11434';
            const response = await fetch(`${ollamaHost}/api/generate`, {
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

        } else if (activeModel.startsWith('aiedge:')) {
            updateProgress(`Antítesis (AI Edge): Enrutando inferencia hacia modelo local GGUF ${activeModel} vía llama.cpp...`);
            const is2B = activeModel.includes('e2b');
            const modelName = is2B ? 'gemma-2-2b-it-Q4_K_M.gguf' : 'gemma-2-9b-it-Q4_K_M.gguf';
            const modelPath = path.join(process.cwd(), 'workspace', 'models', modelName);

            if (!fs.existsSync(modelPath)) {
                throw new Error(`Binario GGUF no encontrado en ${modelPath}. Ejecuta 'babylonia onboard' para descargarlo.`);
            }

            const { spawn } = await import('child_process');
            const fullPrompt = `${contextText}\n\nDirectiva del Usuario:\n${prompt}`;
            
            // Ejecutamos llama-cli en modo completion/instruct, inyectando el prompt
            const llamaProcess = spawn('llama-cli', [
                '-m', modelPath,
                '-c', '2048', // Context window
                '-n', '1024', // Max tokens to generate
                '--temp', '0.7',
                '-p', fullPrompt
            ]);

            let stdoutData = '';
            let stderrData = '';

            llamaProcess.stdout.setEncoding('utf8');
            llamaProcess.stderr.setEncoding('utf8');

            llamaProcess.stdout.on('data', (data) => {
                stdoutData += data;
            });
            llamaProcess.stderr.on('data', (data) => {
                stderrData += data;
            });

            await new Promise((resolve, reject) => {
                llamaProcess.on('close', (code) => {
                    if (code !== 0 && stdoutData.trim() === '') {
                        reject(new Error(`llama.cpp falló con código ${code}: ${stderrData}`));
                    } else {
                        resolve();
                    }
                });
                llamaProcess.on('error', (err) => {
                    reject(new Error(`No se pudo ejecutar llama-cli. ¿Está instalado llama.cpp? Error: ${err.message}`));
                });
            });

            // Extraemos solo el texto generado después del prompt (simplificación)
            const generatedIndex = stdoutData.lastIndexOf(fullPrompt);
            if (generatedIndex !== -1) {
                llmResponseText = stdoutData.substring(generatedIndex + fullPrompt.length).trim();
            } else {
                llmResponseText = stdoutData.trim();
            }

            // Cleanup some common llama.cpp output quirks
            llmResponseText = llmResponseText.replace(/^[\s\S]*?(?:assistant|\])/i, '').trim();

        } else {
            updateProgress(`Antítesis (Gemini): Desplegando agentes cognitivos y ejecutando inferencia sobre el modelo ${activeModel}...`);
            const fullPrompt = `${contextText}\n\nDirectiva del Usuario:\n${prompt}`;

            const useGeminiCli = process.env.USE_GEMINI_CLI_OAUTH === 'true';
            
            if (!useGeminiCli && process.env.GEMINI_API_KEY) {
                updateProgress(`Antítesis (Gemini SDK): Ejecutando inferencia con SDK oficial (Fallback por limitación de CLI)...`);
                
                const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
                
                const response = await ai.models.generateContent({
                    model: activeModel,
                    contents: fullPrompt,
                    config: {
                        temperature: 0.7,
                        maxOutputTokens: 2048,
                    }
                });

                if (response.text) {
                    llmResponseText = response.text;
                } else {
                    throw new Error("Respuesta de API de Gemini sin contenido válido.");
                }
            } else {
                // Usamos spawn para inyectar el contexto por la entrada estándar (stdin) y evitar el límite de longitud en terminales
                // Esto utiliza de forma nativa los scopes OAuth y tokens que ya tiene validados el CLI de Gemini
                const { spawn } = await import('child_process');

                const geminiBin = process.platform === 'win32' ? 'gemini.cmd' : 'gemini';

                // Pasamos el comando como un solo string para evitar el DeprecationWarning de Node al usar shell: true con arrays
                let geminiProcess;
                if (process.platform === 'win32') {
                    geminiProcess = spawn(`${geminiBin} -m ${activeModel} -p . -o json`, { shell: true });
                } else {
                    geminiProcess = spawn(geminiBin, ['-m', activeModel, '-p', '.', '-o', 'json']);
                }

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

                // Escribir el contexto en la entrada estándar y cerrarla
                geminiProcess.stdin.setDefaultEncoding('utf-8');

                try {
                    geminiProcess.stdin.write(fullPrompt);
                    geminiProcess.stdin.end();
                } catch (e) {
                    // Si falla al escribir por tubería rota (EPIPE), el proceso hijo murió rápido (ej. límite de memoria en Android)
                    throw new Error(`Fallo al enviar contexto a Gemini CLI (posible límite de buffer/memoria en Termux). Error: ${e.message}`);
                }

                await new Promise((resolve, reject) => {
                    geminiProcess.on('close', (code) => {
                        if (code !== 0) {
                            reject(new Error(`Gemini CLI falló con código ${code}: ${stderrData}`));
                        } else {
                            resolve();
                        }
                    });
                    geminiProcess.on('error', (err) => {
                        if (err.code === 'ENOENT') {
                            reject(new Error(`No se encontró el ejecutable 'gemini'. Asegúrate de que esté instalado o usa GEMINI_API_KEY en .env.`));
                        } else {
                            reject(err);
                        }
                    });
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

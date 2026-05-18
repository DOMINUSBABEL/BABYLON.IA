import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { WikiMemory } from './wiki_memory.js';
import { pluginManager } from './plugins/PluginManager.js';
import { templateEngine } from './template_engine.js';
import { exec } from 'child_process';
import util from 'util';
import { GoogleGenAI } from '@google/genai';
import { getDialecticalPrompt } from './system_prompt.js';
import { toolsDefinition, executeTool } from './tools_registry.js';
import { hermes } from './hermes_broker.js';

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
 * Implementa el Bucle Dialéctico (Tesis -> Antítesis -> Síntesis) en formato ReAct.
 */
export async function processTask(prompt, updateProgress) {
    const memory = getWikiMemory();

    // Fase 1: TESIS (Asimilación)
    const promptPreview = prompt.length > 30 ? prompt.substring(0, 30) + '...' : prompt;
    updateProgress(`Tesis (Iniciando): Analizando directiva [${promptPreview}] y cargando Memoria Wiki de disco (Zero-RAM impact)...`);
    let contextText = memory.buildContext();

    // Inyección dinámica si el usuario menciona análisis XML-TEI o archivos XML
    const xmlRegex = /([a-zA-Z0-9_\-\\]+\.xml)/i;
    const xmlMatch = prompt.match(xmlRegex);

    if (xmlMatch) {
        const potentialXmlPath = xmlMatch[1];
        const resolvedPath = path.resolve(process.cwd(), potentialXmlPath);
        if (fs.existsSync(resolvedPath)) {
            updateProgress(`Antítesis (Humanidades Digitales): Detectado corpus XML-TEI. Parseando documento y extrayendo metadatos/entidades...`);
            const teiReport = await pluginManager.processFile(resolvedPath);
            if (teiReport) {
                contextText += `\n\n--- REPORTE XML-TEI EXTRAÍDO AUTOMÁTICAMENTE ---\n${teiReport}\n------------------------------------------------\n`;
            }
        } else {
             updateProgress(`Antítesis (Humanidades Digitales): Se mencionó el archivo ${potentialXmlPath} pero no se encontró en disco. Se procederá con análisis teórico.`);
        }
    } else if (prompt.toLowerCase().includes('tei') || prompt.toLowerCase().includes('tesauro') || prompt.toLowerCase().includes('intertextual')) {
         updateProgress(`Antítesis (Humanidades Digitales): Activando heurísticas de codificación XML-TEI y análisis de redes (Metodología A. Echavarría)...`);
    }
    
    const activeModel = process.env.GEMINI_MODEL || 'gemini-3.1-pro-preview';
    let llmResponseText = "";
    let statsStr = "";

    // Fase 2: Bucle Dialéctico ReAct
    updateProgress("Antítesis (Estructuración): Iniciando Bucle Dialéctico ReAct (Observar -> Pensar -> Actuar)...");

    let conversationHistory = [];
    const systemPrompt = getDialecticalPrompt(toolsDefinition);
    let finalAnswer = null;
    const MAX_ITER = 5;
    let iter = 0;

    try {
        while (iter < MAX_ITER) {
            iter++;
            updateProgress(`Ciclo Dialéctico [Iter ${iter}/${MAX_ITER}]: Generando inferencia...`);

            // Construcción del Prompt Híbrido
            let fullPrompt = systemPrompt + "\n\n--- CONTEXTO BASE ---\n" + contextText + "\n\n--- DIRECTIVA DEL USUARIO ---\n" + prompt + "\n\n--- HISTORIAL DE ReAct ---\n";
            for (const turn of conversationHistory) {
                fullPrompt += `[${turn.role}]: ${turn.content}\n`;
            }
            fullPrompt += "\n[Asistente] (Responde en estricto JSON):";

            let rawResponse = "";

            if (activeModel.startsWith('ollama:') || activeModel.startsWith('aiedge:')) {
                // Simplificación para fase 1: Soporte experimental o fallback si no es Gemini CLI
                throw new Error("El bucle ReAct Dialéctico actualmente requiere Gemini CLI/SDK por arquitectura.");
            } else {
                const useGeminiCli = process.env.USE_GEMINI_CLI_OAUTH === 'true';
                
                if (!useGeminiCli && process.env.GEMINI_API_KEY) {
                    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
                    const response = await ai.models.generateContent({
                        model: activeModel,
                        contents: fullPrompt,
                        config: { temperature: 0.7, maxOutputTokens: 2048 }
                    });
                    if (response.text) rawResponse = response.text;
                    else throw new Error("Respuesta vacía del SDK.");
                } else {
                    const { spawn } = await import('child_process');
                    const geminiBin = process.platform === 'win32' ? 'gemini.cmd' : 'gemini';

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
                    geminiProcess.stdout.on('data', (data) => stdoutData += data);
                    geminiProcess.stderr.on('data', (data) => stderrData += data);

                    geminiProcess.stdin.setDefaultEncoding('utf-8');
                    try {
                        geminiProcess.stdin.write(fullPrompt);
                        geminiProcess.stdin.end();
                    } catch (e) {
                        throw new Error(`Fallo al enviar contexto a Gemini CLI. Error: ${e.message}`);
                    }

                    await new Promise((resolve, reject) => {
                        geminiProcess.on('close', (code) => {
                            if (code !== 0) reject(new Error(`Gemini CLI falló con código ${code}: ${stderrData}`));
                            else resolve();
                        });
                        geminiProcess.on('error', (err) => reject(err));
                    });

                    const jsonStartIndex = stdoutData.indexOf('{');
                    if (jsonStartIndex === -1) throw new Error("No se pudo analizar respuesta de Gemini CLI: " + stdoutData);
                    
                    const data = JSON.parse(stdoutData.substring(jsonStartIndex));
                    if (data.response) rawResponse = data.response;
                    else throw new Error("Formato desconocido del CLI.");
                }
            }

            // Parsear Respuesta ReAct (esperada en JSON)
            let parsedResponse;
            try {
                let cleanJson = rawResponse.replace(/```json/gi, '').replace(/```/g, '').trim();
                parsedResponse = JSON.parse(cleanJson);
            } catch(e) {
                conversationHistory.push({ role: 'Observación', content: 'Error: El modelo no devolvió un JSON válido. Reintenta estrictamente en JSON.' });
                updateProgress(`Dialéctica [Iter ${iter}]: Fallo de parseo, reintentando...`);
                continue;
            }

            if (parsedResponse.Thought && parsedResponse.Thought.Tesis) {
                updateProgress(`Pensamiento [Tesis]: ${parsedResponse.Thought.Tesis.substring(0, 40)}...`);
            }

            if (parsedResponse.Action === 'Final_Answer') {
                finalAnswer = parsedResponse.Action_Input;
                updateProgress(`Síntesis [Iter ${iter}]: Resolución alcanzada (Final_Answer).`);
                break;
            } else if (parsedResponse.Action) {
                updateProgress(`Praxis (Herramienta): Ejecutando [${parsedResponse.Action}] con input [${parsedResponse.Action_Input}]...`);
                const observation = await executeTool(parsedResponse.Action, parsedResponse.Action_Input);
                
                conversationHistory.push({ role: 'Pensamiento', content: JSON.stringify(parsedResponse) });
                conversationHistory.push({ role: 'Observación', content: observation });
            } else {
                conversationHistory.push({ role: 'Observación', content: 'Error: Faltan campos Action o Action_Input.' });
            }
        }

        if (!finalAnswer) {
            finalAnswer = "Aporía crítica: Se alcanzó el límite de iteraciones del bucle ReAct sin una resolución final.";
        }
        llmResponseText = finalAnswer;

    } catch (error) {
        updateProgress(`Error en Inferencia Dialéctica: ${error.message}`);
        llmResponseText = `Aporía crítica detectada durante el bucle: ${error.message}`;
    }

    // Fase 3: SÍNTESIS (Resultado)
    updateProgress("Síntesis (Conclusión): Empaquetando resultado final, indexando aprendizajes y ejecutando Heartbeat de Memoria en disco.");
    
    // Aplicar motor de plantillas a la respuesta del LLM (ej. actas o documentos formales)
    const formattedResponse = templateEngine.applyRuthCompliantStyles(llmResponseText);

    const result = `${formattedResponse}\n\n` +
                   `*🧠 Estado del Sistema (Geist):*\n` +
                   `- Bucle Dialéctico: ReAct Completado\n` +
                   `- Modelo Activo: ${activeModel}${statsStr}\n` +
                   `- Entorno: ${process.env.OS_TARGET || 'desktop_windows'}\n`;

    memory.heartbeat(prompt, result);
    return result;
}

export function initHermesConsumer() {
    hermes.subscribeInbound(async (eventData) => {
        try {
            const finalPrompt = eventData.finalPrompt || eventData.text;
            
            const response = await processTask(finalPrompt, (progressText) => {
                hermes.publishOutbound({
                    type: 'progress',
                    eventId: eventData.eventId,
                    text: progressText,
                    channel: eventData.channel,
                    to: eventData.from
                });
            });
            
            hermes.publishOutbound({
                type: 'text',
                text: response,
                eventId: eventData.eventId,
                channel: eventData.channel,
                to: eventData.from
            });
        } catch (error) {
            hermes.publishOutbound({
                type: 'error',
                text: `❌ *Error cognitivo:*\n_Detalle: ${error.message}_`,
                eventId: eventData.eventId,
                channel: eventData.channel,
                to: eventData.from
            });
        }
    });
}

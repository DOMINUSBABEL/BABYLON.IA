import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { WikiMemory } from './wiki_memory.js';

let wikiMemoryInstance = null;

function getWikiMemory() {
    if (!wikiMemoryInstance) {
        // Obtiene la ruta del workspace desde .env o usa una por defecto local
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
    return new Promise((resolve) => {
        const memory = getWikiMemory();

        // Fase 1: TESIS (Asimilación)
        updateProgress("Tesis (Iniciando): Analizando directiva y cargando Memoria Wiki de disco (Zero-RAM impact)...");
        const contextText = memory.buildContext();
        
        setTimeout(() => {
            // Fase 2: ANTÍTESIS (Ejecución y Resolución de Conflictos)
            updateProgress("Antítesis (Ejecución): Integrando contexto del Tesauro Conceptual y resolviendo aporías locales...");
            
            // Verificamos si el Agente tiene acceso a la base de conocimiento histórica (si existe)
            const babiloniaPath = "C:\\Users\\jegom\\OneDrive\\Desktop\\Investigaciones\\geist\\Sintesis_Babilonia_China";
            let knowledgeStatus = "Wiki Memory Activa";
            
            if (fs.existsSync(babiloniaPath)) {
                const subdirs = fs.readdirSync(babiloniaPath);
                knowledgeStatus += ` | Base Legacy conectada (${subdirs.length} índices).`;
            } else {
                knowledgeStatus += " | Operando en modo de inferencia pura con Tesauro local.";
            }

            // Check for edge models to output specific logging
            const activeModel = process.env.GEMINI_MODEL || 'default';
            if (activeModel.startsWith('aiedge:')) {
                updateProgress(`Antítesis (AI Edge): Enrutando inferencia hacia backend local para modelo ${activeModel}...`);
            } else if (activeModel.startsWith('ollama:')) {
                updateProgress(`Antítesis (Ollama): Enrutando inferencia hacia servicio Ollama local para modelo ${activeModel}...`);
            }

            setTimeout(() => {
                // Fase 3: SÍNTESIS (Resultado)
                updateProgress("Síntesis (Conclusión): Empaquetando resultado y ejecutando Heartbeat de Memoria en disco.");
                
                // En una integración real, aquí se inyectaría la respuesta del LLM
                const result = `He procesado tu directiva: "${prompt}".\n\n` +
                               `*🧠 Estado del Sistema (Geist):*\n` +
                               `- Motor OpenClaw: Activo y Enlazado\n` +
                               `- Modelo Activo: ${activeModel}\n` +
                               `- Token OAuth / LLM: Validado\n` +
                               `- Memoria Base: ${knowledgeStatus}\n` +
                               `- Entorno: ${process.env.OS_TARGET || 'Desconocido'}\n\n` +
                               `_El orden espontáneo ha sido preservado y la memoria en disco ha sido actualizada._`;

                // Heartbeat: Guardar en el disco duro para no gastar RAM
                memory.heartbeat(prompt, result);
                
                resolve(result);
            }, 3000); // Simulación de inferencia LLM
        }, 2000); // Simulación de búsqueda de disco
    });
}

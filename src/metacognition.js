import { processTask } from './agent_core.js';
import fs from 'fs/promises';
import path from 'path';
import { geistVault } from './dynamic_rag.js';

export class MetacognitiveLoop {
    constructor(memoryPath = './workspace/geist_vault') {
        this.memoryPath = memoryPath;
        this.currentLogFile = path.join(this.memoryPath, 'thesis_log.md');
        this.synthesisFile = path.join(this.memoryPath, 'Geist_Tuning.md');
    }

    /**
     * Registra las interacciones para su posterior análisis dialéctico.
     */
    async logInteraction(user, input, output) {
        const entry = `\n### [${new Date().toISOString()}] Usuario: ${user}\n**Tesis (Input):** ${input}\n**Antítesis/Síntesis (Ejecución ReAct):** ${output}\n`;
        await fs.mkdir(this.memoryPath, { recursive: true }).catch(() => {});
        await fs.appendFile(this.currentLogFile, entry).catch(() => {});
    }

    /**
     * Orquesta la ejecución de sub-agentes especialistas.
     */
    async delegateToSubAgent(domain, prompt) {
        console.log(`🤖 [Orquestador] Instanciando sub-agente para dominio: ${domain}`);
        const specializedPrompt = `[ROL: Especialista en ${domain}]\n${prompt}`;
        // Reutiliza el motor ReAct de processTask
        return await processTask(specializedPrompt, (msg) => console.log(`  └─ [Sub-${domain}] ${msg}`));
    }

    /**
     * Ejecuta el análisis de los logs aplicando la Restricción Conservadora de Hegel.
     */
    async runSynthesis() {
        console.log('🧠 [Metacognición] Iniciando síntesis dialéctica de logs históricos...');
        try {
            const rawLog = await fs.readFile(this.currentLogFile, 'utf-8').catch(() => null);
            
            if (!rawLog || rawLog.length < 500) {
                console.log('⏳ [Metacognición] Masa crítica insuficiente para síntesis.');
                return;
            }

            const prompt = `Analiza este registro de interacciones del bucle ReAct.
Aplica la Síntesis de Hegel y la Restricción Conservadora: identifica qué resoluciones de herramientas o análisis fueron efectivas y extrae un principio de optimización universalizable para futuras interacciones.
Genera solo la regla final en formato Markdown.
Si la evaluación NO revela un conocimiento técnico universalizable o la optimización no es vital y probada empíricamente, responde EXACTAMENTE con la constante NO_UPDATE.

Registro:
${rawLog}`;
            
            // Ejecutamos la tarea a través del motor ReAct para que también razone su propia mejora
            const synthesis = await processTask(prompt, () => {});

            // Archivar tesis procesada
            await fs.mkdir(path.join(this.memoryPath, 'archive'), { recursive: true }).catch(() => {});
            await fs.rename(this.currentLogFile, path.join(this.memoryPath, `archive/thesis_${Date.now()}.md`)).catch(() => {});

            if (synthesis && synthesis.includes('NO_UPDATE')) {
                console.log('🛡️ [Metacognición] Restricción Conservadora activa: Conocimiento efímero o redundante (NO_UPDATE). Se omite actualización.');
                return;
            }

            const timestamp = new Date().toISOString();
            
            // Guarda tanto en el archivo lineal de tuning como en la nueva bóveda RAG
            await fs.appendFile(this.synthesisFile, `\n## Síntesis - ${timestamp}\n${synthesis}\n`);
            await geistVault.store(`Tuning_${Date.now()}`, synthesis);
            
            console.log('✨ [Metacognición] Bóveda Geist RAG actualizada exitosamente con nuevo conocimiento universalizable.');
        } catch (error) {
            console.error('❌ [Metacognición] Error en el ciclo:', error);
        }
    }

    start(intervalMs = 1000 * 60 * 60 * 6) { // Cada 6 horas
        setInterval(() => this.runSynthesis(), intervalMs);
    }
}

export const metacognition = new MetacognitiveLoop();
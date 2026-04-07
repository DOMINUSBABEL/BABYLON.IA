import { processTask } from './agent_core.js';
import fs from 'fs/promises';
import path from 'path';

export class MetacognitiveLoop {
    constructor(memoryPath = './public/wiki') {
        this.memoryPath = memoryPath;
        this.currentLogFile = path.join(this.memoryPath, 'thesis_log.md');
        this.synthesisFile = path.join(this.memoryPath, 'geist_tuning.md');
    }

    async logInteraction(user, input, output) {
        const entry = `\n### [${new Date().toISOString()}] Usuario: ${user}\n**Tesis (Input):** ${input}\n**Antítesis/Ejecución:** ${output}\n`;
        await fs.appendFile(this.currentLogFile, entry).catch(() => {});
    }

    async runSynthesis() {
        console.log('🧠 [Metacognición] Iniciando síntesis dialéctica...');
        try {
            const rawLog = await fs.readFile(this.currentLogFile, 'utf-8').catch(() => null);
            
            if (!rawLog || rawLog.length < 500) {
                console.log('⏳ [Metacognición] Masa crítica insuficiente para síntesis.');
                return;
            }

            const prompt = `Analiza este registro de interacciones. Aplica la Síntesis de Hegel: identifica qué resoluciones fueron efectivas y extrae un principio de optimización para tus futuras interacciones. Genera solo la regla final en formato Markdown.\n\n${rawLog}`;
            
            const synthesis = await processTask(prompt, () => {});

            const timestamp = new Date().toISOString();
            await fs.appendFile(this.synthesisFile, `\n## Síntesis - ${timestamp}\n${synthesis}\n`);
            
            // Archivar tesis procesada
            await fs.mkdir(path.join(this.memoryPath, 'archive'), { recursive: true }).catch(() => {});
            await fs.rename(this.currentLogFile, path.join(this.memoryPath, `archive/thesis_${Date.now()}.md`)).catch(() => {});
            
            console.log('✨ [Metacognición] Memoria Wiki actualizada exitosamente.');
        } catch (error) {
            console.error('❌ [Metacognición] Error en el ciclo:', error);
        }
    }

    start(intervalMs = 1000 * 60 * 60 * 6) { // Cada 6 horas
        setInterval(() => this.runSynthesis(), intervalMs);
    }
}

export const metacognition = new MetacognitiveLoop();
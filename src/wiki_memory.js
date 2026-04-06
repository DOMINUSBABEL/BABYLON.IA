import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

/**
 * Gestor de Memoria Wiki (Basada en Disco).
 * Escribe y lee archivos Markdown entrelazados, ideal para reducir consumo de RAM
 * en entornos de bajos recursos (Android) y unificar el contexto en todos los SO.
 */
export class WikiMemory {
    constructor(workspacePath) {
        this.wikiDir = path.join(workspacePath, 'wiki');
        this.ensureWikiExists();
    }

    /**
     * Asegura que el directorio de la wiki y el archivo índice existan.
     */
    ensureWikiExists() {
        if (!fs.existsSync(this.wikiDir)) {
            fs.mkdirSync(this.wikiDir, { recursive: true });
            console.log(chalk.green(`[+] Inicializando Tesauro Conceptual (Wiki Memory) en disco: ${this.wikiDir}`));

            const indexContent = `# Índice Principal (Geist)\n\nBienvenido a la memoria raíz. Aquí se indexan los conceptos clave.\n\n## Conceptos Actuales\n- [[Reglas_Base]]\n- [[Historial_Reciente]]\n`;
            fs.writeFileSync(path.join(this.wikiDir, 'Index.md'), indexContent, 'utf-8');

            const rulesContent = `# Reglas Base\n\n1. El agente opera bajo la Ley Cero.\n2. Preservar memoria en disco para ahorrar RAM.\n3. DelegaciÃ³n: Puedes sugerir al usuario el comando !geist jules <tarea> para tareas complejas.\n`;
            fs.writeFileSync(path.join(this.wikiDir, 'Reglas_Base.md'), rulesContent, 'utf-8');

            const historyContent = `# Historial Reciente\n\nRegistro de actividades.\n`;
            fs.writeFileSync(path.join(this.wikiDir, 'Historial_Reciente.md'), historyContent, 'utf-8');
            const julesCapContent = `# Capacidades de Jules\n\nEl sistema BABYLON.IA integra el CLI de Jules de Google para automejora.\nSi el usuario pide mejoras complejas, despliegues, modificaciones de wiki.md, mcp, o habilidades:\n1. El agente debe responder proponiendo usar el asistente Jules.\n2. Se le indica al usuario que use: !geist jules <descripciÃ³n de la tarea>.\n3. Una vez finalizado, se integrarÃ¡ con: !geist jules-pull <session-id>.\n`;
            fs.writeFileSync(path.join(this.wikiDir, 'Capacidades_Jules.md'), julesCapContent, 'utf-8');
        }
    }

    /**
     * Lee un concepto específico del disco.
     * @param {string} conceptName Nombre del archivo sin extensión (ej. 'Reglas_Base')
     * @returns {string} Contenido del concepto o string vacío
     */
    readConcept(conceptName) {
        const filePath = path.join(this.wikiDir, `${conceptName}.md`);
        if (fs.existsSync(filePath)) {
            return fs.readFileSync(filePath, 'utf-8');
        }
        return '';
    }

    /**
     * Escribe o actualiza un concepto en el disco.
     * @param {string} conceptName Nombre del archivo sin extensión
     * @param {string} content Contenido a guardar
     */
    writeConcept(conceptName, content) {
        const filePath = path.join(this.wikiDir, `${conceptName}.md`);
        fs.writeFileSync(filePath, content, 'utf-8');
    }

    /**
     * Analiza un texto para extraer hipervínculos estilo wiki: [[Concepto]]
     * @param {string} text
     * @returns {string[]} Lista de conceptos enlazados
     */
    extractLinks(text) {
        const regex = /\[\[(.*?)\]\]/g;
        let links = [];
        let match;
        while ((match = regex.exec(text)) !== null) {
            links.push(match[1]);
        }
        return links;
    }

    /**
     * Construye un contexto plano leyendo el Índice y los conceptos enlazados
     * a partir de él para inyectarlos en la Tesis.
     * En una implementación de LLM real, el LLM podría decidir qué conceptos leer.
     */
    buildContext() {
        let contextText = "--- MEMORIA WIKI (DISCO) ---\n";

        const indexContent = this.readConcept('Index');
        contextText += `[Index.md]:\n${indexContent}\n`;

        // Leer superficialmente algunos conceptos del índice
        const links = this.extractLinks(indexContent);
        for (const link of links) {
            const linkContent = this.readConcept(link);
            if (linkContent) {
                // Solo adjuntamos un extracto o el inicio para no saturar tokens
                contextText += `[${link}.md]:\n${linkContent.substring(0, 500)}\n`;
            }
        }

        contextText += "----------------------------\n";
        return contextText;
    }

    /**
     * Heartbeat: Actualiza el Historial_Reciente tras la Síntesis.
     * @param {string} prompt Tesis original
     * @param {string} result Síntesis obtenida
     */
    heartbeat(prompt, result) {
        let history = this.readConcept('Historial_Reciente');
        const timestamp = new Date().toISOString();
        const newEntry = `\n## [${timestamp}]\n**Tesis:** ${prompt}\n**Síntesis:** ${result.substring(0, 150)}...\n`;

        // Mantener el archivo ligero truncándolo si es muy grande (ej > 5000 chars)
        if (history.length > 5000) {
            const entries = history.split(/(?=\n## \[)/);
            if (entries.length > 10) {
                history = entries[0] + entries.slice(-10).join('');
            } else {
                history = history.substring(history.length - 4000); // Fallback si no hay suficientes separadores
            }
        }

        this.writeConcept('Historial_Reciente', history + newEntry);
    }
}

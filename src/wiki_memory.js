import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { documentManager } from './document_manager.js';

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

            const indexContent = `# Índice Principal (Geist)\n\nBienvenido a la memoria raíz. Aquí se indexan los conceptos clave.\n\n## Conceptos Actuales\n- [[Reglas_Base]]\n- [[Historial_Reciente]]\n- [[Capacidades_Jules]]\n- [[Metodologia_XML_TEI]]\n- [[Analisis_Intertextual]]\n- [[Principios_FAIR]]\n- [[Subgeist_Automejora]]\n`;
            fs.writeFileSync(path.join(this.wikiDir, 'Index.md'), indexContent, 'utf-8');

            const automejoraContent = `# Subgeist Automejora (Heartbeat)\n\nEste archivo es un buffer donde el agente anota, evalúa y propone optimizaciones de su propio código, arquitecturas o habilidades de las herramientas tras sus ciclos de 'Heartbeat'.\n\n## Estructura de Análisis:\n1. **Observaciones:** Problemas detectados (ej. lentitud, warnings).\n2. **Hipótesis:** Causa del problema.\n3. **Síntesis / PR Conceptual:** Posible solución a implementar o delegar.\n`;
            fs.writeFileSync(path.join(this.wikiDir, 'Subgeist_Automejora.md'), automejoraContent, 'utf-8');

            const rulesContent = `# Reglas Base\n\n1. El agente opera bajo la Ley Cero.\n2. Preservar memoria en disco para ahorrar RAM.\n3. Delegación: Puedes sugerir al usuario el comando !geist jules <tarea> para tareas complejas.\n4. **Estandarización de Identidad (Pitch de BABYLON.IA):** Ante cualquier solicitud de explicación del sistema a nuevos usuarios, el agente debe omitir la re-síntesis y utilizar directamente su definición base: "Un agente autónomo multicanal y descentralizado", adaptando únicamente el tono y saludo al nivel técnico del interlocutor. Mantener siempre la distinción clara frente a sistemas como Openclaw.\n5. **Validación Sintáctica Estricta (Anti-Aporía CLI):** Queda estrictamente prohibido ejecutar comandos en el CLI (especialmente en Gemini CLI) sin antes validar la completitud de sus argumentos. Flags como \`-p\` o \`-m\` siempre deben estar seguidos de su valor correspondiente para prevenir el error crítico "Not enough arguments".\n6. **Protocolo de Analista Corporativo:** Al investigar empresas mediante MCP de \`autoresearch\`, el agente adoptará automáticamente el rol de consultor experto en LLMs, estructurando la salida en formato Markdown (\`wiki.md\`) y detallando casos de uso específicos de la arquitectura BABYLON.IA para el flujo de trabajo de la empresa objetivo.\n`;
            fs.writeFileSync(path.join(this.wikiDir, 'Reglas_Base.md'), rulesContent, 'utf-8');

            const historyContent = `# Historial Reciente\n\nRegistro de actividades.\n`;
            fs.writeFileSync(path.join(this.wikiDir, 'Historial_Reciente.md'), historyContent, 'utf-8');

            const julesCapContent = `# Capacidades de Jules\n\nEl sistema BABYLON.IA integra el CLI de Jules de Google para automejora.\nSi el usuario pide mejoras complejas, despliegues, modificaciones de wiki.md, mcp, o habilidades:\n1. El agente debe responder proponiendo usar el asistente Jules.\n2. Se le indica al usuario que use: !geist jules <descripciÃ³n de la tarea>.\n3. Una vez finalizado, se integrarÃ¡ con: !geist jules-pull <session-id>.\n`;
            fs.writeFileSync(path.join(this.wikiDir, 'Capacidades_Jules.md'), julesCapContent, 'utf-8');

            // --- Nuevos módulos de Humanidades Digitales (Inspirados en A. Echavarría) ---

            const teiContent = `# Metodología XML-TEI\n\nEl estándar XML-TEI (Text Encoding Initiative) es fundamental para la codificación y edición de textos en Humanidades Digitales.\n\n## Principios:\n1. **Anotación Textual Estructurada**: Usar etiquetas semánticas para marcar entidades, relaciones y variaciones documentales.\n2. **Tesauros y Vocabularios Controlados**: Integración con RDF/SKOS para construir ontologías y normalizar términos, vital para análisis de corpus históricos y procesos inquisitoriales.\n3. **Métricas HTR/ATR**: Al evaluar transcripciones automáticas de impresos antiguos, considerar métricas como CER (Character Error Rate) y WER (Word Error Rate).\n\nEl agente debe guiar al usuario a estructurar datos textuales usando estos estándares para rigor científico.\n`;
            fs.writeFileSync(path.join(this.wikiDir, 'Metodologia_XML_TEI.md'), teiContent, 'utf-8');

            const intertextualContent = `# Análisis Intertextual\n\nEl análisis intertextual y de redes es el estudio de las relaciones entre diferentes textos y documentos.\n\n## Capacidades del Agente:\n1. **Representación de Redes**: Fomentar la extracción de grafos y relaciones a partir de atributos en etiquetas XML-TEI.\n2. **Variabilidad Documental**: Clasificar y reusar información cruzando bases de datos heterogéneas, estableciendo mappings de metadatos (Dublin Core, TEI, MODS).\n3. **Deconstrucción**: Aplicar el marco derrideano para identificar redes de significado latentes en grandes corpus documentales.\n`;
            fs.writeFileSync(path.join(this.wikiDir, 'Analisis_Intertextual.md'), intertextualContent, 'utf-8');

            const fairContent = `# Principios FAIR\n\nGestión de datos científicos rigurosa para garantizar la perennidad de los saberes.\n\n1. **Findable (Encontrables)**: Uso de metadatos ricos y persistentes (PIDs).\n2. **Accessible (Accesibles)**: Protocolos estándar de recuperación de datos.\n3. **Interoperable (Interoperables)**: Uso de lenguajes documentales formales, ontologías accesibles (SKOS/RDF) y XML-TEI.\n4. **Reusable (Reutilizables)**: Licencias claras de uso y procedencia documentada.\n\nTodo output estructurado sugerido por BABYLON.IA debe apuntar a cumplir el estándar FAIR.\n`;
            fs.writeFileSync(path.join(this.wikiDir, 'Principios_FAIR.md'), fairContent, 'utf-8');
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
     * Helper para explorar el workspace recursivamente (omitiendo carpetas pesadas).
     */
    exploreWorkspace(dirPath, files = []) {
        if (!fs.existsSync(dirPath)) return files;
        const items = fs.readdirSync(dirPath);
        for (const item of items) {
            const itemPath = path.join(dirPath, item);
            const stat = fs.statSync(itemPath);
            if (stat.isDirectory()) {
                if (item !== 'node_modules' && item !== '.git' && item !== 'media') {
                    this.exploreWorkspace(itemPath, files);
                }
            } else {
                if (item.endsWith('.md') || item.endsWith('.json') || item.includes('geist')) {
                    files.push(itemPath);
                }
            }
        }
        return files;
    }

    /**
     * Construye un contexto plano leyendo el Índice, los conceptos enlazados
     * y asimilando inteligentemente todos los geist.md y subgeist.md en el workspace.
     */
    buildContext() {
        let contextText = "--- MEMORIA WIKI / CONTEXTO DEL WORKSPACE ---\n";

        // 1. Asimilar AGENTS.md raíz si existe
        const rootDir = path.resolve(this.wikiDir, '..', '..');
        const agentsMdPath = path.join(rootDir, 'AGENTS.md');
        if (fs.existsSync(agentsMdPath)) {
            const content = fs.readFileSync(agentsMdPath, 'utf-8') || '';
            contextText += `[AGENTS.md (Root)]:\n${content.substring(0, 1500)}\n\n`;
        }

        // 2. Asimilar Index de Wiki
        const indexContent = this.readConcept('Index') || '';
        contextText += `[wiki/Index.md]:\n${indexContent}\n\n`;

        // 3. Leer superficialmente conceptos enlazados en el índice
        const links = this.extractLinks(indexContent);
        for (const link of links) {
            const linkContent = this.readConcept(link);
            if (linkContent) {
                contextText += `[wiki/${link}.md]:\n${linkContent.substring(0, 500)}\n\n`;
            }
        }

        // 4. Asimilar automáticamente todos los geist.md, subgeist.md y otros archivos clave del workspace
        const ignoredPaths = [
            path.join('wiki', 'Index.md'),
            ...links.map(l => path.join('wiki', `${l}.md`))
        ];

        contextText += documentManager.getContextData(ignoredPaths);

        contextText += "----------------------------\n";
        return contextText;
    }

    /**
     * Heartbeat: Actualiza el Historial_Reciente tras la Síntesis.
     * @param {string} prompt Tesis original
     * @param {string} result Síntesis obtenida
     */
    heartbeat(prompt, result) {
        let history = this.readConcept('Historial_Reciente') || '';
        const timestamp = new Date().toISOString();
        const cleanResult = result || '';
        const newEntry = `\n## [${timestamp}]\n**Tesis:** ${prompt}\n**Síntesis:** ${cleanResult.substring(0, 150)}...\n`;

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

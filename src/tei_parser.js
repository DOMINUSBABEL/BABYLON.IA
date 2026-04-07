import fs from 'fs';
import path from 'path';
import { XMLParser } from 'fast-xml-parser';
import chalk from 'chalk';

/**
 * Módulo de procesamiento XML-TEI.
 * Inspirado en las metodologías de Humanidades Digitales y los
 * trabajos de Andrés Echavarría (codificación de textos, análisis de redes y XML-TEI).
 */
export class TEIParser {
    constructor() {
        this.parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: "@_"
        });
    }

    /**
     * Lee y analiza un archivo XML-TEI local.
     * @param {string} filePath - Ruta absoluta o relativa al archivo XML.
     * @returns {Object|null} - JSON parseado del XML o null en caso de error.
     */
    parseFile(filePath) {
        try {
            if (!fs.existsSync(filePath)) {
                throw new Error(`El archivo ${filePath} no existe.`);
            }
            const xmlContent = fs.readFileSync(filePath, 'utf-8');
            return this.parseString(xmlContent);
        } catch (error) {
            console.error(chalk.red(`[TEI Parser] Error al leer/parsear el archivo: ${error.message}`));
            return null;
        }
    }

    /**
     * Parsea un string en formato XML-TEI a JSON.
     * @param {string} xmlString - Contenido XML en texto.
     * @returns {Object|null} - JSON parseado.
     */
    parseString(xmlString) {
        try {
            return this.parser.parse(xmlString);
        } catch (error) {
            console.error(chalk.red(`[TEI Parser] Error al parsear el string XML: ${error.message}`));
            return null;
        }
    }

    /**
     * Extrae un resumen de los metadatos principales del teiHeader.
     * @param {Object} teiJson - Objeto JSON parseado del TEI.
     * @returns {Object} - Metadatos básicos estructurados.
     */
    extractMetadata(teiJson) {
        const metadata = {
            title: "Desconocido",
            author: "Desconocido",
            date: "Desconocida",
            publisher: "Desconocido"
        };

        try {
            const teiHeader = teiJson?.TEI?.teiHeader;
            if (!teiHeader) return metadata;

            const fileDesc = teiHeader.fileDesc;
            if (fileDesc) {
                const titleStmt = fileDesc.titleStmt;
                if (titleStmt) {
                    metadata.title = titleStmt.title || metadata.title;
                    metadata.author = titleStmt.author || metadata.author;
                }
                const publicationStmt = fileDesc.publicationStmt;
                if (publicationStmt) {
                    metadata.publisher = publicationStmt.publisher || metadata.publisher;
                    metadata.date = publicationStmt.date || metadata.date;
                }
            }
        } catch (e) {
            console.warn(chalk.yellow(`[TEI Parser] No se pudieron extraer algunos metadatos: ${e.message}`));
        }

        return metadata;
    }

    /**
     * Extrae entidades anotadas (como <persName>, <placeName>) que son útiles
     * para la construcción de grafos, análisis de redes y cruce con tesauros (SKOS).
     * @param {Object} teiJson - Objeto JSON parseado.
     * @returns {Array} - Lista de entidades con sus tipos y referencias.
     */
    extractEntitiesForNetwork(teiJson) {
        const entities = [];
        // Esta es una búsqueda recursiva simplificada para propósitos del agente

        function search(node) {
            if (typeof node === 'object' && node !== null) {
                for (let key in node) {
                    // Extraer personas y lugares
                    if (key === 'persName' || key === 'placeName' || key === 'orgName') {
                        const items = Array.isArray(node[key]) ? node[key] : [node[key]];
                        items.forEach(item => {
                            let textContent = typeof item === 'object' ? item['#text'] : item;
                            let ref = item['@_ref'] || item['@_corresp'] || 'No_Ref';
                            if (textContent) {
                                entities.push({
                                    type: key,
                                    text: textContent.toString().trim(),
                                    ref: ref
                                });
                            }
                        });
                    }
                    search(node[key]);
                }
            }
        }

        search(teiJson?.TEI?.text || teiJson);
        return entities;
    }

    /**
     * Analiza un archivo TEI y devuelve un reporte estructurado en Markdown,
     * listo para ser inyectado en el contexto del LLM para análisis intertextual.
     * @param {string} filePath
     */
    generateAnalysisReport(filePath) {
        const teiData = this.parseFile(filePath);
        if (!teiData) return `Error procesando el archivo XML-TEI: ${filePath}`;

        const metadata = this.extractMetadata(teiData);
        const entities = this.extractEntitiesForNetwork(teiData);

        let report = `## Reporte de Análisis XML-TEI\n`;
        report += `**Archivo:** ${path.basename(filePath)}\n\n`;
        report += `### Metadatos (teiHeader)\n`;
        report += `- **Título:** ${metadata.title}\n`;
        report += `- **Autor:** ${metadata.author}\n`;
        report += `- **Fecha:** ${metadata.date}\n`;
        report += `- **Publicador:** ${metadata.publisher}\n\n`;

        report += `### Entidades Semánticas Extraídas (Para Análisis de Redes / Tesauros)\n`;
        if (entities.length === 0) {
            report += `*No se detectaron etiquetas semánticas estándar (persName, placeName, orgName).*`;
        } else {
            // Agrupar por tipo para mayor claridad
            const grouped = { persName: [], placeName: [], orgName: [] };
            entities.forEach(e => grouped[e.type].push(`${e.text} [ref: ${e.ref}]`));

            if (grouped.persName.length > 0) {
                report += `**Personas (persName):**\n- ${[...new Set(grouped.persName)].slice(0,10).join('\n- ')}\n`;
                if(grouped.persName.length > 10) report += `- *...y ${grouped.persName.length - 10} más.*\n`;
            }
            if (grouped.placeName.length > 0) {
                report += `**Lugares (placeName):**\n- ${[...new Set(grouped.placeName)].slice(0,10).join('\n- ')}\n`;
                if(grouped.placeName.length > 10) report += `- *...y ${grouped.placeName.length - 10} más.*\n`;
            }
        }

        report += `\n*Nota: Datos estructurados listos para integración con grafos de conocimiento RDF/SKOS siguiendo principios FAIR.*\n`;
        return report;
    }
}

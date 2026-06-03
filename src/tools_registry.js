import fs from 'fs';
import path from 'path';
import { geistVault } from './dynamic_rag.js';
import { mcpClient } from './mcp_client.js';

export const toolsDefinition = [
    {
        name: "read_local_file",
        description: "Lee el contenido de un archivo local en el workspace.",
        parameters: { type: "string", description: "Ruta del archivo (ej. workspace/notas.md)" }
    },
    {
        name: "get_time",
        description: "Obtiene la hora y fecha actual del sistema.",
        parameters: { type: "string", description: "No requiere entrada, enviar string vacío" }
    },
    {
        name: "search_geist_vault",
        description: "Busca información semántica e histórica en la bóveda RAG de Geist (Obsidian style).",
        parameters: { type: "string", description: "Término de búsqueda o palabra clave." }
    },
    {
        name: "store_geist_vault",
        description: "Almacena una síntesis o nuevo conocimiento universal en la bóveda Geist.",
        parameters: { type: "string", description: "Título y contenido separados por '|'. Ej: 'Resumen|El contenido...'" }
    },
    {
        name: "mcp_execute",
        description: "Ejecuta una herramienta remota a través del Model Context Protocol (MCP).",
        parameters: { type: "string", description: "Nombre de herramienta y parámetros separados por '|'. Ej: 'github_search|repo:DOMINUSBABEL'" }
    }
];

export const executeTool = async (action, actionInput) => {
    try {
        if (action === "read_local_file") {
            const resolvedPath = path.resolve(process.cwd(), actionInput);
            const cwd = process.cwd();
            if (resolvedPath !== cwd && !resolvedPath.startsWith(cwd + path.sep)) {
                return `Error de seguridad: Intento de lectura fuera del directorio base detectado en la ruta ${resolvedPath}.`;
            }
            if (fs.existsSync(resolvedPath)) {
                return fs.readFileSync(resolvedPath, 'utf8');
            }
            return `Error: Archivo no encontrado en la ruta ${resolvedPath}.`;
        }
        if (action === "get_time") {
            return new Date().toISOString();
        }
        if (action === "search_geist_vault") {
            return await geistVault.search(actionInput);
        }
        if (action === "store_geist_vault") {
            const [title, ...contentArr] = actionInput.split('|');
            return await geistVault.store(title || 'Síntesis', contentArr.join('|') || 'Sin contenido');
        }
        if (action === "mcp_execute") {
            const [toolName, ...paramsArr] = actionInput.split('|');
            return await mcpClient.execute(toolName || 'unknown', paramsArr.join('|'));
        }
        return `Error: Herramienta desconocida ${action}`;
    } catch (e) {
        return `Error al ejecutar herramienta: ${e.message}`;
    }
};
import fs from 'fs';
import path from 'path';

export class DynamicRAG {
    constructor(vaultPath = './workspace/geist_vault') {
        this.vaultPath = path.resolve(process.cwd(), vaultPath);
        if (!fs.existsSync(this.vaultPath)) {
            fs.mkdirSync(this.vaultPath, { recursive: true });
        }
    }

    /**
     * Búsqueda semántica simple basada en coincidencias de texto
     * (Simulación estilo Karpathy/Obsidian en archivos locales)
     */
    async search(query) {
        let results = [];
        try {
            const files = fs.readdirSync(this.vaultPath).filter(f => f.endsWith('.md'));
            for (const file of files) {
                const content = fs.readFileSync(path.join(this.vaultPath, file), 'utf8');
                if (content.toLowerCase().includes(query.toLowerCase())) {
                    results.push(`--- ${file} ---\n${content.substring(0, 500)}...\n`);
                }
            }
            if (results.length === 0) return "No se encontraron coincidencias en la bóveda Geist.";
            return results.join('\n');
        } catch (error) {
            return `Error accediendo a la bóveda: ${error.message}`;
        }
    }

    /**
     * Escribe un nuevo conocimiento o síntesis en la bóveda (Obsidian style)
     */
    async store(title, content) {
        const safeTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const filename = `${Date.now()}_${safeTitle}.md`;
        const filepath = path.join(this.vaultPath, filename);
        
        const fileContent = `# ${title}\n\n${content}\n\n*Indexado vía Síntesis ReAct*`;
        fs.writeFileSync(filepath, fileContent, 'utf8');
        return `Síntesis guardada en ${filename}`;
    }
}

export const geistVault = new DynamicRAG();
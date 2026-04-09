import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

class DocumentManager {
    constructor(workspacePath) {
        this.workspacePath = workspacePath;
        this.cache = new Map();
        this.lastScan = 0;
    }

    scanWorkspace() {
        const now = Date.now();
        if (now - this.lastScan < 5000) return; // Cache for 5 seconds to reduce I/O spikes
        
        const files = this.exploreWorkspace(this.workspacePath);
        for (const file of files) {
            try {
                const stat = fs.statSync(file);
                const cached = this.cache.get(file);
                if (!cached || cached.mtimeMs !== stat.mtimeMs) {
                    const content = fs.readFileSync(file, 'utf-8');
                    this.cache.set(file, {
                        mtimeMs: stat.mtimeMs,
                        content: content.substring(0, 1000)
                    });
                }
            } catch (err) {
                console.error(chalk.red(`[DocumentManager] Error reading ${file}: ${err.message}`));
            }
        }
        this.lastScan = now;
    }

    exploreWorkspace(dirPath, files = []) {
        if (!fs.existsSync(dirPath)) return files;
        try {
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
        } catch (err) {
            // Ignore access errors
        }
        return files;
    }

    getContextData(ignoredPaths = []) {
        this.scanWorkspace();
        let text = "--- ASIMILACIÓN AUTOMÁTICA DEL WORKSPACE (CACHED) ---\n";
        for (const [file, data] of this.cache.entries()) {
            if (ignoredPaths.some(ignored => file.includes(ignored))) continue;
            
            const relativePath = path.relative(this.workspacePath, file);
            const fileName = path.basename(file);
            
            if (fileName.toLowerCase().includes('geist') || fileName.toLowerCase().includes('agent') || fileName.endsWith('.md')) {
                text += `[${relativePath}]:\n${data.content}\n\n`;
            }
        }
        text += "----------------------------\n";
        return text;
    }
}

// Export a singleton instance
export const documentManager = new DocumentManager(path.join(process.cwd(), 'workspace'));

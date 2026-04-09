import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { pathToFileURL } from 'url';

export class PluginManager {
    constructor() {
        this.plugins = [];
        this.pluginsDir = path.join(process.cwd(), 'src', 'plugins');
        this.loaded = false;
    }

    async loadPlugins() {
        if (this.loaded) return;
        if (!fs.existsSync(this.pluginsDir)) {
            return;
        }

        const files = fs.readdirSync(this.pluginsDir);
        for (const file of files) {
            if (file.endsWith('.js') && file !== 'PluginManager.js') {
                try {
                    const pluginPath = path.join(this.pluginsDir, file);
                    const fileUrl = pathToFileURL(pluginPath).href;
                    const pluginModule = await import(fileUrl);
                    
                    for (const key in pluginModule) {
                        const PluginClass = pluginModule[key];
                        if (typeof PluginClass === 'function' && PluginClass.prototype) {
                            const pluginInstance = new PluginClass();
                            if (pluginInstance.supportedExtensions) {
                                this.plugins.push(pluginInstance);
                                console.log(chalk.green(`[PluginManager] Plugin cargado: ${pluginInstance.name || file}`));
                            }
                        }
                    }
                } catch (error) {
                    console.error(chalk.red(`[PluginManager] Error cargando plugin ${file}: ${error.message}`));
                }
            }
        }
        this.loaded = true;
    }

    async processFile(filePath) {
        await this.loadPlugins();
        const ext = path.extname(filePath).toLowerCase();
        let finalReport = null;

        for (const plugin of this.plugins) {
            if (plugin.supportedExtensions.includes(ext)) {
                try {
                    console.log(chalk.cyan(`[PluginManager] Procesando archivo adjunto con plugin: ${plugin.name}`));
                    const report = await plugin.process(filePath);
                    if (report) {
                        finalReport = finalReport ? `${finalReport}\n\n${report}` : report;
                    }
                } catch (error) {
                    console.error(chalk.red(`[PluginManager] Excepción en plugin ${plugin.name}: ${error.message}`));
                }
            }
        }

        return finalReport;
    }
}

export const pluginManager = new PluginManager();
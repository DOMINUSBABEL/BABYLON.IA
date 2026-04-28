import child_process from 'child_process';
import util from 'util';
import chalk from 'chalk';

export async function createJulesSession(prompt) {
    try {
        const execFilePromise = util.promisify(child_process.execFile);
        console.log(chalk.cyan(`[Jules Bridge] Iniciando sesiÃ³n remota: "${prompt}"`));
        const { stdout } = await execFilePromise('jules', ['remote', 'new', '--session', prompt]);
        console.log(chalk.green(`[Jules Bridge] SesiÃ³n creada exitosamente.`));
        return stdout;
    } catch (error) {
        console.error(chalk.red(`[Jules Bridge] Error creando sesiÃ³n: ${error.message}`));
        throw error;
    }
}

export async function pullJulesSession(sessionId) {
    try {
        const execFilePromise = util.promisify(child_process.execFile);
        console.log(chalk.cyan(`[Jules Bridge] Haciendo pull de la sesiÃ³n: ${sessionId}`));
        const { stdout } = await execFilePromise('jules', ['remote', 'pull', '--session', sessionId]);
        return stdout;
    } catch (error) {
        console.error(chalk.red(`[Jules Bridge] Error en pull: ${error.message}`));
        throw error;
    }
}

export async function listJulesSessions() {
    try {
        const execFilePromise = util.promisify(child_process.execFile);
        const { stdout } = await execFilePromise('jules', ['remote', 'list', '--session']);
        return stdout;
    } catch (error) {
        throw error;
    }
}

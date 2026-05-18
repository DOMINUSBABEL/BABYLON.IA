import { Octokit } from "@octokit/rest";
import { Webhooks, createNodeMiddleware } from "@octokit/webhooks";
import chalk from "chalk";
import { gateway } from "./gateway.js";
import { hermes } from "./hermes_broker.js";
import crypto from "crypto";

export function initGithubClient(app, agentEvents) {
    const token = process.env.GITHUB_TOKEN;
    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;

    if (!token || !webhookSecret) {
        console.log(chalk.red('[GitHub] Token o Webhook Secret no proporcionados. Nodo GitHub desactivado.'));
        return;
    }

    console.log(chalk.cyan('Inicializando Nodo GitHub...'));

    const octokit = new Octokit({ auth: token });
    const webhooks = new Webhooks({ secret: webhookSecret });
    const activeIssues = new Map();

    // Suscripción asíncrona a las respuestas del motor de IA
    hermes.subscribeOutbound(async (responseObj) => {
        if (responseObj.channel === 'github') {
            try {
                if (responseObj.type === 'progress') {
                    console.log(chalk.yellow(`     [Geist GitHub] ${responseObj.text}`));
                    if (agentEvents) agentEvents.emit('whatsapp_progress', responseObj.text);
                } else if (responseObj.type === 'text') {
                    const issueData = activeIssues.get(responseObj.eventId);
                    if (issueData) {
                        await octokit.rest.issues.createComment({
                            owner: issueData.owner,
                            repo: issueData.repo,
                            issue_number: issueData.issue_number,
                            body: responseObj.text
                        });
                        activeIssues.delete(responseObj.eventId);
                        console.log(chalk.green('  -> Síntesis generada (GitHub).'));
                        if (agentEvents) agentEvents.emit('whatsapp_response', 'Respondido en GitHub.');
                    }
                }
            } catch (error) {
                console.error(chalk.red(`[Error Enviando Tarea a GitHub]: ${error.message}`));
            }
        }
    });

    const processGithubEvent = async (event) => {
        const payload = event.payload;
        let text = '';
        let author = '';
        let repo = payload.repository.full_name;
        let issueNumber = null;

        if (payload.comment) {
            text = payload.comment.body;
            author = payload.comment.user.login;
            issueNumber = payload.issue ? payload.issue.number : payload.pull_request ? payload.pull_request.number : null;
        } else if (payload.issue) {
            text = payload.issue.body || payload.issue.title;
            author = payload.issue.user.login;
            issueNumber = payload.issue.number;
        } else if (payload.pull_request) {
            text = payload.pull_request.body || payload.pull_request.title;
            author = payload.pull_request.user.login;
            issueNumber = payload.pull_request.number;
        }

        if (!text || !issueNumber) return;

        try {
            const me = await octokit.rest.users.getAuthenticated();
            const myLogin = me.data.login;

            if (author === myLogin) {
                return; // Evitar infinite loops respondiendo a sí mismo
            }

            const mentionText = `@${myLogin}`;
            const isMention = text.includes(mentionText);

            if (!isMention) {
                return; // Solo responde si es mencionado
            }

            console.log(chalk.blue(`\n[GitHub] Tesis Recibida de @${author} en ${repo}#${issueNumber}: ${text}`));
            
            const cleanText = text.replace(new RegExp(mentionText, 'gi'), '').trim();
            const eventId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(7);
            
            // Guardar contexto para cuando Hermes responda
            activeIssues.set(eventId, {
                owner: payload.repository.owner.login,
                repo: payload.repository.name,
                issue_number: issueNumber
            });

            const gatewayEvent = {
                eventId: eventId,
                text: cleanText,
                hasMedia: false,
                media: null,
                channel: 'github',
                author: author,
                from: author,
                to: myLogin,
                myId: myLogin,
                isCommand: false,
                isFromMe: false
            };

            if (agentEvents) agentEvents.emit('whatsapp_command_start', `GitHub: ${repo}#${issueNumber}`);

            const ingestResult = await gateway.ingestEvent(gatewayEvent);

            if (ingestResult.type === 'error' && ingestResult.text === '⚠️ No autorizado.') {
                activeIssues.delete(eventId);
                return;
            }

        } catch (error) {
            console.error(chalk.red(`[Error Procesando Tarea en GitHub]: ${error.message}`));
        }
    };

    webhooks.on("issue_comment.created", processGithubEvent);
    webhooks.on("issues.opened", processGithubEvent);
    webhooks.on("pull_request.opened", processGithubEvent);

    // Conectar el middleware de Octokit a Express
    app.use("/webhooks/github", createNodeMiddleware(webhooks));

    console.log(chalk.magentaBright(`[GitHub] Endpoint de Webhooks activo en /webhooks/github`));
}

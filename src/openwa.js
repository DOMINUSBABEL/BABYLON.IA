import chalk from 'chalk';
import { gateway } from './gateway.js';
import { hermes } from './hermes_broker.js';

export function initOpenWAWebhook(app) {
    app.post('/webhook/openwa', async (req, res) => {
        // Responder inmediatamente para evitar timeouts en OpenWA
        res.sendStatus(200);

        const payload = req.body;
        if (!payload || payload.event !== 'message.received') return;

        const data = payload.data;
        if (!data || (!data.body && !data.hasMedia)) return;

        const msgText = data.body ? data.body.trim() : '';
        const botSignatures = ['🧠', '⏳', '🟢', '⚠️', '❌', '*BABYLON.IA', '*Geist', 'He procesado', 'Procesando...', '*[Directiva'];
        if (botSignatures.some(sig => msgText.startsWith(sig))) {
            return;
        }

        const eventData = {
            text: msgText,
            hasMedia: data.hasMedia,
            media: null, // Descarga de media puede implementarse consumiendo el API remoto
            channel: 'openwa',
            author: data.author || data.from,
            from: data.from,
            to: data.to, 
            isCommand: msgText.toLowerCase().startsWith('!geist'),
            isFromMe: data.fromMe || false,
            myId: data.to // Asumimos que data.to es el ID del bot en un chat privado
        };

        try {
            await gateway.ingestEvent(eventData);
        } catch(e) {
            console.error(chalk.red(`[OpenWA] Fallo enviando al gateway: ${e.message}`));
        }
    });
}

export async function initOpenWABot() {
    const apiUrl = process.env.OPENWA_API_URL || 'http://localhost:2785';
    const apiKey = process.env.OPENWA_API_KEY || '';
    const sessionId = process.env.OPENWA_SESSION_ID || 'default';

    console.log(chalk.cyan(`[OpenWA] Inicializando integración con API Gateway en ${apiUrl} (Sesión: ${sessionId})...`));
    
    // Intentar registrar webhook automáticamente si PUBLIC_URL está definido
    if (process.env.PUBLIC_URL) {
        try {
            await fetch(`${apiUrl}/api/sessions/${sessionId}/webhooks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
                body: JSON.stringify({ url: `${process.env.PUBLIC_URL}/webhook/openwa`, events: ["message.received"] })
            });
            console.log(chalk.green(`[OpenWA] Webhook registrado automáticamente hacia ${process.env.PUBLIC_URL}/webhook/openwa`));
        } catch (e) {
            console.warn(chalk.yellow(`[OpenWA] Advertencia: No se pudo registrar webhook automáticamente. Motivo: ${e.message}`));
        }
    } else {
        console.log(chalk.yellow(`[OpenWA] PUBLIC_URL no definido. Recuerda registrar manualmente el webhook hacia /webhook/openwa en tu instancia de OpenWA.`));
    }

    hermes.subscribeOutbound(async (responseObj) => {
        if (responseObj.channel === 'openwa') {
            try {
                if (responseObj.type === 'text' || responseObj.type === 'error') {
                    const text = responseObj.type === 'error' ? `❌ *Error:*\n${responseObj.text}` : responseObj.text;
                    await fetch(`${apiUrl}/api/sessions/${sessionId}/messages/send-text`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
                        body: JSON.stringify({ chatId: responseObj.to, text: text })
                    });
                } else if (responseObj.type === 'file' && responseObj.path) {
                    await fetch(`${apiUrl}/api/sessions/${sessionId}/messages/send-text`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
                        body: JSON.stringify({ chatId: responseObj.to, text: `📎 Archivo local generado en el host:\n${responseObj.path}\n\n${responseObj.caption || ''}` })
                    });
                }
            } catch (e) {
                console.error(chalk.red(`[OpenWA] Error enviando respuesta asíncrona: ${e.message}`));
            }
        }
    });
}

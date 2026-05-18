import { Telegraf } from 'telegraf';
import chalk from 'chalk';
import { gateway } from './gateway.js';
import { hermes } from './hermes_broker.js';

export function initTelegramBot(token) {
    if (!token) {
        console.log(chalk.red('[Telegram] Token no proporcionado. Bot desactivado.'));
        return;
    }

    console.log(chalk.cyan('Inicializando Bot de Telegram...'));
    const bot = new Telegraf(token);

    let botUsername = 'telegram_bot';
    bot.telegram.getMe().then((me) => botUsername = me.username).catch(() => {});

    hermes.subscribeOutbound(async (responseObj) => {
        if (responseObj.channel === 'telegram') {
            try {
                if (responseObj.type === 'text') {
                    await bot.telegram.sendMessage(responseObj.to, responseObj.text);
                } else if (responseObj.type === 'error') {
                    await bot.telegram.sendMessage(responseObj.to, `❌ **Error:**\n${responseObj.text}`);
                } else if (responseObj.type === 'file' && responseObj.path) {
                    await bot.telegram.sendDocument(responseObj.to, { source: responseObj.path }, { caption: responseObj.caption });
                }
            } catch(e) {
                console.error(chalk.red(`[Telegram] Error enviando respuesta asíncrona: ${e.message}`));
            }
        }
    });

    bot.start((ctx) => {
        ctx.reply('Hola, soy BABYLON.IA. ¿En qué te puedo ayudar?');
    });

    bot.on('text', async (ctx) => {
        const userId = ctx.from.id.toString();
        const username = ctx.from.username ? ctx.from.username : '';

        const isPrivate = ctx.chat.type === 'private';
        const isCommand = ctx.message.text && ctx.message.text.startsWith('!geist');

        if (!isPrivate && !isCommand) return;

        const msg = ctx.message.text;
        console.log(chalk.blue(`\n[Telegram] Tesis Recibida de ${ctx.from.first_name}: ${msg}`));
        
        ctx.sendChatAction('typing');

        try {
            const gatewayEvent = {
                text: msg,
                hasMedia: false,
                media: null,
                channel: 'telegram',
                author: username || userId,
                from: username || userId,
                to: ctx.chat.id.toString(), // Where to send back
                myId: botUsername,
                isCommand: isCommand,
                isFromMe: false
            };

            const ingestResult = await gateway.ingestEvent(gatewayEvent);

            if (ingestResult.type === 'error' && ingestResult.text === '⚠️ No autorizado.') {
                return;
            }

            if (ingestResult.type === 'error' || ingestResult.type === 'text') {
                await ctx.reply(ingestResult.text);
            } else if (ingestResult.type === 'file' && ingestResult.path) {
                await ctx.replyWithDocument({ source: ingestResult.path }, { caption: ingestResult.caption });
            }
        } catch (error) {
            console.error(chalk.red(`[Error Procesando Tarea en Telegram]: ${error.message}`));
            ctx.reply('Se ha producido una anomalía procesando tu solicitud.');
        }
    });

    bot.launch();
    console.log(chalk.magentaBright('[Telegram] Bot en línea y a la espera de mensajes...'));

    // Enable graceful stop
    process.once('SIGINT', () => bot.stop('SIGINT'));
    process.once('SIGTERM', () => bot.stop('SIGTERM'));
}

import { Telegraf } from 'telegraf';
import chalk from 'chalk';
import { gateway } from './gateway.js';

export function initTelegramBot(token) {
    if (!token) {
        console.log(chalk.red('[Telegram] Token no proporcionado. Bot desactivado.'));
        return;
    }

    console.log(chalk.cyan('Inicializando Bot de Telegram...'));
    const bot = new Telegraf(token);

    let botUsername = 'telegram_bot';
    bot.telegram.getMe().then((me) => botUsername = me.username).catch(() => {});

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
                to: botUsername,
                myId: botUsername,
                isCommand: isCommand,
                isFromMe: false
            };

            const responseObj = await gateway.handleEvent(gatewayEvent, (progressText) => {
                console.log(chalk.yellow(`     [Geist Telegram] ${progressText}`));
            });

            if (responseObj.type === 'error' && responseObj.text === '⚠️ No autorizado.') {
                // Silencioso o un simple return para no spamear
                return;
            }

            console.log(chalk.green('  -> Síntesis generada (Telegram).'));
            
            if (responseObj.type === 'file') {
                 await ctx.replyWithDocument({ source: responseObj.path }, { caption: responseObj.caption });
            } else if (responseObj.type === 'error' || responseObj.type === 'text') {
                 await ctx.reply(responseObj.text);
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
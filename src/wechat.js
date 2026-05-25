import { WechatyBuilder } from 'wechaty';
import qrTerm from 'qrcode-terminal';
import { gateway } from './gateway.js';
import { hermes } from './hermes_broker.js';
import chalk from 'chalk';

export function initWeChatBot() {
    console.log(chalk.cyan('Inicializando WeChat Bot...'));

    const bot = WechatyBuilder.build({
        name: 'babylonia-wechat',
        puppet: 'wechaty-puppet-wechat'
    });

    bot.on('scan', (qrcode, status) => {
        if (status === 2) { // 2 = waiting for scan
            console.log(chalk.yellow('\n[!] Escanea el siguiente código QR con WeChat:'));
            qrTerm.generate(qrcode, { small: true });
            console.log(chalk.gray('\nEsperando autenticación de WeChat...'));
        }
    });

    bot.on('login', user => {
        console.log(chalk.greenBright(`\n✅ BABYLON.IA Conectado a WeChat como ${user.name()}`));
        
        hermes.subscribeOutbound(async (responseObj) => {
            if (responseObj.channel === 'wechat') {
                try {
                    const contact = await bot.Contact.find({ id: responseObj.to });
                    if (contact) {
                        if (responseObj.type === 'text' || responseObj.type === 'error') {
                            await contact.say(responseObj.text);
                        } else if (responseObj.type === 'file' && responseObj.path) {
                            const { FileBox } = await import('wechaty');
                            const fileBox = FileBox.fromFile(responseObj.path);
                            await contact.say(fileBox);
                        }
                    }
                } catch(e) {
                    console.error(chalk.red(`[WeChat] Error enviando respuesta asíncrona: ${e.message}`));
                }
            }
        });
    });

    bot.on('message', async message => {
        if (message.self()) return;
        
        const contact = message.talker();
        const text = message.text();
        const room = message.room();
        
        // Respond to mentions in rooms or direct messages
        if (room && !(await message.mentionSelf())) return;

        const prompt = text.replace(/@\w+\s*/g, '').trim();

        const eventData = {
            text: prompt,
            hasMedia: message.type() === bot.Message.Type.Image || message.type() === bot.Message.Type.Attachment,
            media: null,
            channel: 'wechat',
            author: contact.id,
            from: contact.id,
            to: contact.id,
            isCommand: prompt.startsWith('!geist'),
            isFromMe: false,
            myId: bot.currentUser.id
        };

        if (eventData.hasMedia) {
            try {
                const fileBox = await message.toFileBox();
                const buffer = await fileBox.toBuffer();
                eventData.media = {
                    data: buffer.toString('base64'),
                    filename: fileBox.name,
                    mimetype: fileBox.mediaType
                };
            } catch(e) {
                console.error(chalk.red(`[WeChat] Fallo al leer attachment: ${e.message}`));
            }
        }

        try {
            const ingestResult = await gateway.ingestEvent(eventData);

            if (ingestResult.type === 'error' || ingestResult.type === 'text') {
                await contact.say(ingestResult.text);
            } else if (ingestResult.type === 'file' && ingestResult.path) {
                const { FileBox } = await import('wechaty');
                const fileBox = FileBox.fromFile(ingestResult.path);
                await contact.say(fileBox);
            }
        } catch(e) {
            console.error(chalk.red(`[WeChat] Fallo enviando al gateway: ${e.message}`));
        }
    });

    bot.start()
        .catch(e => console.error(chalk.red(`[WeChat] Fallo de inicio: ${e.message}`)));
}

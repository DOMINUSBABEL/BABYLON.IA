import { Client, GatewayIntentBits } from 'discord.js';
import { gateway } from './gateway.js';
import { hermes } from './hermes_broker.js';
import chalk from 'chalk';

export class DiscordGateway {
    constructor(token) {
        this.token = token;
        this.client = new Client({ 
            intents: [
                GatewayIntentBits.Guilds, 
                GatewayIntentBits.GuildMessages, 
                GatewayIntentBits.MessageContent
            ] 
        });
    }

    async boot() {
        if (!this.token) {
            console.log(chalk.yellow('⚠️ [Discord] Token ausente (DISCORD_TOKEN). Gateway desactivado.'));
            return;
        }

        this.client.on('ready', () => {
            console.log(chalk.greenBright(`👾 [Gateway] NODO DISCORD ESTABLECIDO como ${this.client.user.tag}`));
            
            // Subscribe to Hermes outbound for Discord channel
            hermes.subscribeOutbound(async (responseObj) => {
                if (responseObj.channel === 'discord') {
                    try {
                        const channel = await this.client.channels.fetch(responseObj.to);
                        if (channel) {
                            if (responseObj.type === 'text') {
                                await channel.send(responseObj.text);
                            } else if (responseObj.type === 'error') {
                                await channel.send(`❌ **Error:**\n${responseObj.text}`);
                            } else if (responseObj.type === 'file' && responseObj.path) {
                                await channel.send({ content: responseObj.caption || '', files: [responseObj.path] });
                            }
                        }
                    } catch(e) {
                        console.error(chalk.red(`[Discord] Error enviando respuesta asíncrona: ${e.message}`));
                    }
                }
            });
        });

        this.client.on('messageCreate', async (message) => {
            if (message.author.bot) return;

            if (message.mentions.has(this.client.user.id) || message.channel.type === 1) { // 1 is DM
                try {
                    await message.channel.sendTyping();
                    const prompt = message.content.replace(`<@${this.client.user.id}>`, '').trim();
                    
                    const eventData = {
                        text: prompt,
                        hasMedia: message.attachments.size > 0,
                        media: null,
                        channel: 'discord',
                        author: message.author.id,
                        from: message.author.id, 
                        to: message.channel.id, // The ID we use to reply back
                        isCommand: prompt.startsWith('!geist'),
                        isFromMe: false,
                        myId: this.client.user.id
                    };

                    // Handle first attachment if present
                    if (eventData.hasMedia) {
                        const attachment = message.attachments.first();
                        const response = await fetch(attachment.url);
                        const buffer = await response.arrayBuffer();
                        eventData.media = {
                            data: Buffer.from(buffer).toString('base64'),
                            filename: attachment.name,
                            mimetype: attachment.contentType
                        };
                    }

                    const ingestResult = await gateway.ingestEvent(eventData);

                    if (ingestResult.type === 'error' || ingestResult.type === 'text') {
                        await message.reply(ingestResult.text);
                    } else if (ingestResult.type === 'file' && ingestResult.path) {
                        await message.reply({ content: ingestResult.caption || '', files: [ingestResult.path] });
                    }
                } catch (error) {
                    console.error('[Discord] Error:', error);
                    await message.reply('❌ Fallo en la deconstrucción del mensaje.');
                }
            }
        });

        await this.client.login(this.token);
    }
}

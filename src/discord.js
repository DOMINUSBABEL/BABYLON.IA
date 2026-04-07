import { Client, GatewayIntentBits } from 'discord.js';
import { processTask } from './agent_core.js';
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
        });

        this.client.on('messageCreate', async (message) => {
            if (message.author.bot) return;

            if (message.mentions.has(this.client.user.id)) {
                try {
                    await message.channel.sendTyping();
                    const prompt = message.content.replace(`<@${this.client.user.id}>`, '').trim();
                    const synthesis = await processTask(prompt, (progress) => {
                        console.log(chalk.gray(`[Discord] ${progress}`));
                    });
                    await message.reply(synthesis);
                } catch (error) {
                    console.error('[Discord] Error:', error);
                    await message.reply('❌ Fallo en la deconstrucción del mensaje.');
                }
            }
        });

        await this.client.login(this.token);
    }
}
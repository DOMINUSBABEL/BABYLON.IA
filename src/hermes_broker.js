import { createClient } from 'redis';
import { EventEmitter } from 'events';
import chalk from 'chalk';

class HermesBroker {
    constructor() {
        this.useRedis = !!process.env.REDIS_URL;
        this.localEmitter = new EventEmitter();
        this.pubClient = null;
        this.subClient = null;
        this.isReady = false;
    }

    async init() {
        if (this.isReady) return;
        
        if (this.useRedis) {
            try {
                this.pubClient = createClient({ url: process.env.REDIS_URL });
                this.subClient = this.pubClient.duplicate();

                this.pubClient.on('error', (err) => console.error(chalk.red(`[Hermes Redis Pub] Error: ${err.message}`)));
                this.subClient.on('error', (err) => console.error(chalk.red(`[Hermes Redis Sub] Error: ${err.message}`)));

                await this.pubClient.connect();
                await this.subClient.connect();
                
                this.isReady = true;
                console.log(chalk.greenBright('🌐 [Hermes Broker] Conectado exitosamente a Redis. Arquitectura Omni-Channel activa.'));
            } catch (err) {
                console.warn(chalk.yellow(`⚠️ [Hermes Broker] Falla al conectar a Redis: ${err.message}. Aplicando fallback a EventEmitter local.`));
                this.useRedis = false;
                this.isReady = true;
            }
        } else {
            console.log(chalk.cyan('🌐 [Hermes Broker] REDIS_URL no detectado. Usando bus de mensajería local (EventEmitter).'));
            this.isReady = true;
        }
    }

    async publishInbound(eventData) {
        if (!this.isReady) await this.init();
        if (this.useRedis) {
            await this.pubClient.publish('babylon:inbound', JSON.stringify(eventData));
        } else {
            this.localEmitter.emit('babylon:inbound', eventData);
        }
    }

    async publishOutbound(responseObj) {
        if (!this.isReady) await this.init();
        if (this.useRedis) {
            await this.pubClient.publish('babylon:outbound', JSON.stringify(responseObj));
        } else {
            this.localEmitter.emit('babylon:outbound', responseObj);
        }
    }

    async subscribeInbound(handler) {
        if (!this.isReady) await this.init();
        if (this.useRedis) {
            await this.subClient.subscribe('babylon:inbound', (message) => {
                try {
                    handler(JSON.parse(message));
                } catch (e) {
                    console.error('[Hermes Broker] Error parseando inbound:', e);
                }
            });
        } else {
            this.localEmitter.on('babylon:inbound', handler);
        }
    }

    async subscribeOutbound(handler) {
        if (!this.isReady) await this.init();
        if (this.useRedis) {
            await this.subClient.subscribe('babylon:outbound', (message) => {
                try {
                    handler(JSON.parse(message));
                } catch (e) {
                    console.error('[Hermes Broker] Error parseando outbound:', e);
                }
            });
        } else {
            this.localEmitter.on('babylon:outbound', handler);
        }
    }
}

export const hermes = new HermesBroker();

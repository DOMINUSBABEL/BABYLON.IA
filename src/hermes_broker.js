import { EventEmitter } from 'events';
import chalk from 'chalk';

/**
 * Hermes Broker - Native Node.js Implementation
 * Reemplaza Redis con un sistema de cola en memoria y EventEmitter
 * para garantizar un procesamiento ordenado y sopesado.
 */
class HermesBroker {
    constructor() {
        this.emitter = new EventEmitter();
        this.inboundQueue = [];
        this.isProcessing = false;
        this.inboundHandlers = [];
        this.isReady = false;
    }

    async init() {
        if (this.isReady) return;
        console.log(chalk.cyan('🌐 [Hermes Broker] Inicializando bus de mensajería asíncrona nativo (Node.js)...'));
        this.isReady = true;
    }

    /**
     * Encola un evento entrante de cualquier plataforma.
     */
    async publishInbound(eventData) {
        if (!this.isReady) await this.init();
        this.inboundQueue.push(eventData);
        // Iniciamos el procesamiento de la cola si no está activo
        this.processQueue();
    }

    /**
     * Procesa la cola de forma ordenada y secuencial para no saturar el Agent Core
     * ni solapar las iteraciones dialécticas de la IA.
     */
    async processQueue() {
        if (this.isProcessing || this.inboundQueue.length === 0) return;
        this.isProcessing = true;

        while (this.inboundQueue.length > 0) {
            const eventData = this.inboundQueue.shift();
            
            // Procesamos el evento mediante todos los consumidores registrados (Agent Core)
            for (const handler of this.inboundHandlers) {
                try {
                    await handler(eventData); // Esperamos a que la IA termine su flujo antes de tomar el siguiente mensaje
                } catch (e) {
                    console.error(chalk.red(`[Hermes Broker] Error procesando evento inbound: ${e.message}`));
                }
            }
        }
        
        this.isProcessing = false;
    }

    /**
     * Publica una respuesta asíncrona de la IA hacia los canales.
     * Esto no requiere cola bloqueante, se emite inmediatamente.
     */
    async publishOutbound(responseObj) {
        if (!this.isReady) await this.init();
        this.emitter.emit('babylon:outbound', responseObj);
    }

    /**
     * Registra un consumidor para los eventos entrantes (Usado por Agent Core).
     */
    subscribeInbound(handler) {
        this.inboundHandlers.push(handler);
    }

    /**
     * Registra un consumidor para las respuestas salientes (Usado por Gateways: WhatsApp, Discord, etc).
     */
    subscribeOutbound(handler) {
        this.emitter.on('babylon:outbound', handler);
    }
}

export const hermes = new HermesBroker();

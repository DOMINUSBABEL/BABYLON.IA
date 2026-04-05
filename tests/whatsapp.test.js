import { jest } from '@jest/globals';

// Mock dependencies
jest.unstable_mockModule('qrcode-terminal', () => ({
    default: { generate: jest.fn() }
}));

const mockClientInstances = [];

jest.unstable_mockModule('whatsapp-web.js', () => {
    class Client {
        constructor(options) {
            this.options = options;
            this.listeners = {};
            this.initialize = jest.fn().mockResolvedValue();
            this.sendMessage = jest.fn().mockResolvedValue();
            mockClientInstances.push(this);
        }
        on(event, cb) {
            this.listeners[event] = cb;
        }
    }
    class LocalAuth {
        constructor(options) {
            this.options = options;
        }
    }
    class MessageMedia {
        static fromFilePath(path) {
            return { path };
        }
    }
    return {
        default: {
            Client,
            LocalAuth,
            MessageMedia
        }
    };
});

jest.unstable_mockModule('chalk', () => ({
    default: {
        cyan: jest.fn(str => str),
        cyanBright: jest.fn(str => str),
        yellow: jest.fn(str => str),
        red: jest.fn(str => str),
        greenBright: { bold: jest.fn(str => str) },
        gray: jest.fn(str => str),
        magentaBright: jest.fn(str => str),
        magenta: jest.fn(str => str),
        blue: jest.fn(str => str),
        green: jest.fn(str => str)
    }
}));

jest.unstable_mockModule('fs', () => ({
    default: {
        existsSync: jest.fn()
    }
}));

jest.unstable_mockModule('../src/agent_core.js', () => ({
    processTask: jest.fn()
}));

jest.unstable_mockModule('qrcode', () => ({
    toDataURL: jest.fn((qr, cb) => cb(null, 'data:image/png;base64,mock')),
    default: {
        toDataURL: jest.fn((qr, cb) => cb(null, 'data:image/png;base64,mock'))
    }
}));

// Now import the module under test
const { initWhatsAppClient } = await import('../src/whatsapp.js');
const pkg = await import('whatsapp-web.js');
const { Client, LocalAuth, MessageMedia } = pkg.default;
const fs = (await import('fs')).default;
const agentCore = await import('../src/agent_core.js');

describe('initWhatsAppClient', () => {
    let mockAgentEvents;

    beforeEach(() => {
        jest.clearAllMocks();
        mockClientInstances.length = 0; // Clear tracked instances
        mockAgentEvents = {
            emit: jest.fn()
        };
        // Reset process.env for each test
        delete process.env.ENVIRONMENT;
        delete process.env.CHROME_BIN;
        delete process.env.PUPPETEER_EXECUTABLE_PATH;
    });

    it('initializes the WhatsApp client correctly', () => {
        initWhatsAppClient(mockAgentEvents);

        expect(mockClientInstances).toHaveLength(1);
        const client = mockClientInstances[0];

        // Check if initialize was called
        expect(client.initialize).toHaveBeenCalled();

        // Check puppeteer args for standard environment
        expect(client.options.puppeteer.args).toEqual(['--no-sandbox', '--disable-setuid-sandbox']);
    });

    describe('Environment Configuration', () => {
        it('configures Termux arguments when ENVIRONMENT is mobile_terminal', () => {
            process.env.ENVIRONMENT = 'mobile_terminal';
            process.env.CHROME_BIN = '/mock/chrome/path';
            fs.existsSync.mockReturnValueOnce(true); // Pretend chrome exists

            initWhatsAppClient(mockAgentEvents);

            const client = mockClientInstances[0];
            expect(client.options.puppeteer.args).toContain('--single-process');
            expect(client.options.puppeteer.executablePath).toBe('/mock/chrome/path');
        });

        it('warns and leaves executablePath undefined if CHROME_BIN does not exist in termux', () => {
            process.env.ENVIRONMENT = 'mobile_terminal';
            process.env.CHROME_BIN = '/mock/chrome/path';
            fs.existsSync.mockReturnValueOnce(false); // Chrome missing

            initWhatsAppClient(mockAgentEvents);

            const client = mockClientInstances[0];
            expect(client.options.puppeteer.executablePath).toBeUndefined();
        });
    });

    describe('Events', () => {
        it('handles "qr" event and emits to agentEvents', async () => {
            initWhatsAppClient(mockAgentEvents);
            const client = mockClientInstances[0];

            expect(client.listeners['qr']).toBeDefined();

            // Trigger QR event
            client.listeners['qr']('mock-qr-string');

            // Wait a tick for the dynamic import and callback
            await new Promise(resolve => setTimeout(resolve, 0));

            expect(mockAgentEvents.emit).toHaveBeenCalledWith('qr_code', 'data:image/png;base64,mock');
        });

        it('handles "ready" event', () => {
            initWhatsAppClient(mockAgentEvents);
            const client = mockClientInstances[0];

            expect(client.listeners['ready']).toBeDefined();

            client.listeners['ready']();

            expect(mockAgentEvents.emit).toHaveBeenCalledWith('whatsapp_ready');
        });

        describe('message_create event', () => {
            let client;

            beforeEach(() => {
                initWhatsAppClient(mockAgentEvents);
                client = mockClientInstances[0];
            });

            it('ignores empty messages', async () => {
                const msg = { body: '' };
                await client.listeners['message_create'](msg);
            });

            it('ignores messages that do not start with !geist', async () => {
                const msg = { body: 'hello', fromMe: true };
                await client.listeners['message_create'](msg);
            });

            it('does not ignore !geist commands if not fromMe (as per current code logic)', async () => {
                const msg = { body: '!geist status', fromMe: false, reply: jest.fn().mockResolvedValue() };
                await client.listeners['message_create'](msg);

                expect(msg.reply).toHaveBeenCalled();
            });

            it('handles !geist status command', async () => {
                const msg = { body: '!geist status', from: 'test-from', reply: jest.fn().mockResolvedValue() };
                await client.listeners['message_create'](msg);

                expect(msg.reply).toHaveBeenCalledWith(expect.stringContaining('BABYLON.IA Status'));
            });

            it('handles !geist enviar command for existing file', async () => {
                const msg = { body: '!geist enviar test.txt', from: 'test-from', reply: jest.fn().mockResolvedValue() };
                fs.existsSync.mockReturnValueOnce(true);

                await client.listeners['message_create'](msg);

                expect(client.sendMessage).toHaveBeenCalledWith('test-from', { path: 'test.txt' }, expect.any(Object));
            });

            it('handles !geist enviar command for non-existing file', async () => {
                const msg = { body: '!geist enviar test.txt', from: 'test-from', reply: jest.fn().mockResolvedValue() };
                fs.existsSync.mockReturnValueOnce(false);

                await client.listeners['message_create'](msg);

                expect(msg.reply).toHaveBeenCalledWith(expect.stringContaining('Aporía Encontrada'));
            });

            it('handles general !geist directiva command', async () => {
                const replyMsgMock = { reply: jest.fn().mockResolvedValue() };
                const msg = { body: '!geist do something', from: 'test-from', reply: jest.fn().mockResolvedValue(replyMsgMock) };

                agentCore.processTask.mockResolvedValueOnce('synthesis result');

                await client.listeners['message_create'](msg);

                expect(msg.reply).toHaveBeenCalledWith(expect.stringContaining('Iniciando Bucle Dialéctico'));
                expect(agentCore.processTask).toHaveBeenCalledWith('do something', expect.any(Function));
                expect(replyMsgMock.reply).toHaveBeenCalledWith(expect.stringContaining('synthesis result'));
            });

            it('handles general !geist command with empty directiva', async () => {
                const msg = { body: '!geist ', from: 'test-from', reply: jest.fn().mockResolvedValue() };

                await client.listeners['message_create'](msg);

                expect(msg.reply).toHaveBeenCalledWith(expect.stringContaining('Sintaxis Inválida'));
            });
        });
    });
});
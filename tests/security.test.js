import { test } from 'node:test';
import assert from 'node:assert';
import child_process from 'node:child_process';
import open from 'open';
import * as julesBridge from '../src/jules_bridge.js';

import util from 'node:util';

test('Security: jules_bridge uses execFile instead of exec to prevent command injection', async (t) => {
    // Mock util.promisify to return our own async function that tracks calls
    const mockCalls = [];
    const mockPromisify = t.mock.method(util, 'promisify', (fn) => {
        if (fn === child_process.execFile) {
            return async (...args) => {
                mockCalls.push(args);
                return { stdout: 'mocked output' };
            };
        }
        return fn;
    });

    const maliciousInput = 'test"; rm -rf /; echo "hacked';

    await julesBridge.createJulesSession(maliciousInput);

    // Verify execFile was called instead of exec
    assert.strictEqual(mockCalls.length, 1);

    const callArgs = mockCalls[0];


    // Check that the executable is just 'jules'
    assert.strictEqual(callArgs[0], 'jules');

    // Check that arguments are passed as an array, escaping the shell
    const args = callArgs[1];
    assert.ok(Array.isArray(args));
    assert.strictEqual(args[0], 'remote');
    assert.strictEqual(args[1], 'new');
    assert.strictEqual(args[2], '--session');

    // Verify the exact malicious input is passed as a single argument
    // and not interpolated into a command string
    assert.strictEqual(args[3], maliciousInput);
});

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('Security: auth.js getGeminiOAuthToken does not use child_process.exec', async (t) => {
     // Verify that auth module doesn't import or use exec internally.
     // While we can't test `openBrowser` directly as it's not exported,
     // we can ensure the file itself was refactored.
     const authPath = path.resolve(__dirname, '../src/auth.js');
     const authContent = fs.readFileSync(authPath, 'utf8');

     assert.ok(!authContent.includes('import { exec } from \'child_process\''), 'auth.js should not import exec');
     assert.ok(!authContent.includes('exec(command'), 'auth.js should not execute commands directly');
});

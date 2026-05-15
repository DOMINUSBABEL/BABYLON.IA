import { test, mock } from 'node:test';
import assert from 'node:assert';
import util from 'node:util';
import child_process from 'node:child_process';

// Mock util.promisify BEFORE importing the module so that the top-level
// const execFilePromise = util.promisify(execFile);
// gets our mocked function.

const mockExecFilePromise = mock.fn(async () => { return { stdout: 'mock-output' }; });
mock.method(util, 'promisify', () => mockExecFilePromise);

// Now import the module to test
const { createJulesSession, pullJulesSession, listJulesSessions } = await import('../src/jules_bridge.js');

test('createJulesSession calls execFile via promisify with correct arguments', async (t) => {
    mockExecFilePromise.mock.resetCalls();

    await createJulesSession('test prompt');

    assert.strictEqual(mockExecFilePromise.mock.calls.length, 1);
    const args = mockExecFilePromise.mock.calls[0].arguments;
    assert.strictEqual(args[0], 'jules');
    assert.deepStrictEqual(args[1], ['remote', 'new', '--session', 'test prompt']);
});

test('pullJulesSession calls execFile via promisify with correct arguments', async (t) => {
    mockExecFilePromise.mock.resetCalls();

    await pullJulesSession('session-123');

    assert.strictEqual(mockExecFilePromise.mock.calls.length, 1);
    const args = mockExecFilePromise.mock.calls[0].arguments;
    assert.strictEqual(args[0], 'jules');
    assert.deepStrictEqual(args[1], ['remote', 'pull', '--session', 'session-123']);
});

test('listJulesSessions calls execFile via promisify with correct arguments', async (t) => {
    mockExecFilePromise.mock.resetCalls();

    await listJulesSessions();

    assert.strictEqual(mockExecFilePromise.mock.calls.length, 1);
    const args = mockExecFilePromise.mock.calls[0].arguments;
    assert.strictEqual(args[0], 'jules');
    assert.deepStrictEqual(args[1], ['remote', 'list', '--session']);
});

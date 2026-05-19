const assert = require('assert');
const util = require('util');
const child_process = require('child_process');

(async () => {
    // Dynamic import to support ESM

    console.log("Mocking child_process.execFile to test jules_bridge.js without actually executing 'jules'");
    const originalPromisify = util.promisify;
    let execFileArgs = [];

    util.promisify = function(fn) {
        if (fn === child_process.execFile) {
            return async function(file, args) {
                execFileArgs = [file, args];
                return { stdout: "mocked output", stderr: "" };
            };
        }
        return originalPromisify(fn);
    };

    const julesBridge = await import('./src/jules_bridge.js');

    try {
        const result = await julesBridge.createJulesSession('my prompt');
        assert.strictEqual(result, 'mocked output');
        assert.deepStrictEqual(execFileArgs, ['jules', ['remote', 'new', '--session', 'my prompt']]);
        console.log("createJulesSession test passed.");

        const result2 = await julesBridge.pullJulesSession('session123');
        assert.strictEqual(result2, 'mocked output');
        assert.deepStrictEqual(execFileArgs, ['jules', ['remote', 'pull', '--session', 'session123']]);
        console.log("pullJulesSession test passed.");

        const result3 = await julesBridge.listJulesSessions();
        assert.strictEqual(result3, 'mocked output');
        assert.deepStrictEqual(execFileArgs, ['jules', ['remote', 'list', '--session']]);
        console.log("listJulesSessions test passed.");

    } catch (e) {
        console.error("Test failed", e);
        process.exit(1);
    } finally {
        util.promisify = originalPromisify;
    }
})();

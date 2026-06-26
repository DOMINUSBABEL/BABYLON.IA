import { test } from 'node:test';
import assert from 'node:assert';
import path from 'path';
import fs from 'fs';
import { executeTool } from '../src/tools_registry.js';

test('read_local_file prevents path traversal', async (t) => {
    const cwd = process.cwd();
    const result = await executeTool('read_local_file', '../package.json');
    assert.strictEqual(result.startsWith('Error: Acceso denegado a la ruta'), true);
});

test('read_local_file allows reading files within cwd', async (t) => {
    const cwd = process.cwd();
    const testFile = 'package.json';
    const result = await executeTool('read_local_file', testFile);
    assert.strictEqual(result.includes('"name": "babylonia"'), true);
});

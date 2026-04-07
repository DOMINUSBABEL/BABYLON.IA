import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import { getGeminiOAuthToken } from '../src/auth.js';

test('getGeminiOAuthToken returns credentials when file exists', async (t) => {
  const mockHomedir = '/home/user';
  const mockCreds = { access_token: 'abc', refresh_token: 'def' };

  t.mock.method(os, 'homedir', () => mockHomedir);
  t.mock.method(fs, 'existsSync', (path) => {
    if (path.includes('.gemini') && path.includes('oauth_creds.json')) {
      return true;
    }
    return false;
  });
  // Mock fs.promises.readFile since getGeminiOAuthToken uses it
  t.mock.method(fs.promises, 'readFile', async (path, encoding) => {
    if (path.includes('.gemini') && path.includes('oauth_creds.json')) {
      return JSON.stringify(mockCreds);
    }
    throw new Error('File not found');
  });

  const result = await getGeminiOAuthToken();
  assert.deepStrictEqual(result, mockCreds);
});

test('getGeminiOAuthToken throws error when file does not exist', async (t) => {
  t.mock.method(os, 'homedir', () => '/home/user');
  t.mock.method(fs, 'existsSync', () => false);

  await assert.rejects(
    async () => await getGeminiOAuthToken(),
    { message: /No se encontró el archivo de credenciales/ }
  );
});

test('getGeminiOAuthToken throws error when JSON is invalid', async (t) => {
  t.mock.method(os, 'homedir', () => '/home/user');
  t.mock.method(fs, 'existsSync', () => true);

  t.mock.method(fs.promises, 'readFile', async () => 'invalid json');

  await assert.rejects(
    async () => await getGeminiOAuthToken(),
    { message: /Error leyendo o parseando oauth_creds.json/ }
  );
});

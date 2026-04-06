import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import { getGeminiOAuthToken, refreshGeminiToken } from '../src/auth.js';

test('getGeminiOAuthToken returns credentials when file exists', (t) => {
  const mockHomedir = '/home/user';
  const mockCreds = { access_token: 'abc', refresh_token: 'def' };

  t.mock.method(os, 'homedir', () => mockHomedir);
  t.mock.method(fs, 'existsSync', (path) => {
    if (path.includes('.gemini') && path.includes('oauth_creds.json')) {
      return true;
    }
    return false;
  });
  t.mock.method(fs, 'readFileSync', (path, encoding) => {
    if (path.includes('.gemini') && path.includes('oauth_creds.json')) {
      return JSON.stringify(mockCreds);
    }
    throw new Error('File not found');
  });

  const result = getGeminiOAuthToken();
  assert.deepStrictEqual(result, mockCreds);
});

test('getGeminiOAuthToken throws error when file does not exist', (t) => {
  t.mock.method(os, 'homedir', () => '/home/user');
  t.mock.method(fs, 'existsSync', () => false);

  assert.throws(() => getGeminiOAuthToken(), {
    message: /No se encontró el archivo de credenciales/
  });
});

test('getGeminiOAuthToken throws error when JSON is invalid', (t) => {
  t.mock.method(os, 'homedir', () => '/home/user');
  t.mock.method(fs, 'existsSync', () => true);
  t.mock.method(fs, 'readFileSync', () => 'invalid json');

  assert.throws(() => getGeminiOAuthToken(), {
    message: /Error leyendo o parseando oauth_creds.json/
  });
});

test('refreshGeminiToken returns input credentials (mock function)', (t) => {
  const mockCreds = { access_token: 'abc', refresh_token: 'def' };
  const result = refreshGeminiToken(mockCreds);
  assert.deepStrictEqual(result, mockCreds);
});

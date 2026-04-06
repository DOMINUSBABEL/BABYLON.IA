import { test } from 'node:test';
import assert from 'node:assert';
import path from 'path';
import { TEIParser } from '../src/tei_parser.js';
import fs from 'fs';

test('TEIParser correctly parses a mock XML-TEI string', (t) => {
    const parser = new TEIParser();
    const xmlMock = `
    <TEI>
        <teiHeader>
            <fileDesc>
                <titleStmt>
                    <title>Test Inquisición</title>
                    <author>Andrés E.</author>
                </titleStmt>
                <publicationStmt>
                    <publisher>CNRS</publisher>
                    <date>2025</date>
                </publicationStmt>
            </fileDesc>
        </teiHeader>
        <text>
            <body>
                <p>El acusado <persName ref="ID001">Juan de la Cruz</persName> fue llevado a <placeName>Toledo</placeName>.</p>
            </body>
        </text>
    </TEI>
    `;

    const parsed = parser.parseString(xmlMock);
    const metadata = parser.extractMetadata(parsed);
    assert.strictEqual(metadata.title, 'Test Inquisición');
    assert.strictEqual(metadata.author, 'Andrés E.');
    assert.strictEqual(metadata.publisher, 'CNRS');
    assert.strictEqual(metadata.date, 2025);

    const entities = parser.extractEntitiesForNetwork(parsed);
    assert.strictEqual(entities.length, 2);
    assert.strictEqual(entities[0].type, 'persName');
    assert.strictEqual(entities[0].text, 'Juan de la Cruz');
    assert.strictEqual(entities[0].ref, 'ID001');
    assert.strictEqual(entities[1].type, 'placeName');
    assert.strictEqual(entities[1].text, 'Toledo');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDirectMarkers } from '../lib/direct-parser.js';

test('direct parser extracts entity marker and cleans text',()=>{const r=parseDirectMarkers('正文 (((ILBM:[entity:甲] 转移 [entity:短剑] 给 [entity:乙])))',{floor:3,sourceMessageId:'m3'});assert.equal(r.ok,true);assert.equal(r.records.length,1);assert.equal(r.records[0].status,'pending');assert.equal(r.records[0].extractionMode,'direct');assert.equal(r.cleanedText,'正文 ')});
test('direct parser rejects unknown action and missing entity',()=>{const r=parseDirectMarkers('(((ILBM:转移短剑))) (((ILBM:[entity:短剑] 飞行)))');assert.equal(r.ok,false);assert.equal(r.records.length,0);assert.equal(r.errors.length,2)});

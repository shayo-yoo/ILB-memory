import test from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryStorage } from '../lib/memory-storage.js';
import { createEventRecord, isInjectableRecord } from '../lib/event-record.js';

test('memory storage prefers ILB API and falls back to legacy storage', () => { let value; const api={set(k,v){value=v;return{ok:true}},snapshot(){return{vars:{ilbm_memory:value}}},remove(){value=undefined}}; const s=createMemoryStorage({ilbApi:api,legacyStorage:{}}); assert.equal(s.write({entities:[]}).backend,'ilb'); assert.equal(s.read().ok,true); s.remove(); assert.equal(s.read().ok,false); });
test('event record normalizes v2 lifecycle fields', () => { const r=createEventRecord({id:'r1',action:'转移',extractionMode:'direct',status:'pending',stateChanges:[{entityId:'e1',field:'owner',after:'e2'}]}); assert.equal(r.recordId,'r1'); assert.equal(r.status,'pending'); assert.equal(r.extractionMode,'direct'); assert.equal(isInjectableRecord(r),false); });

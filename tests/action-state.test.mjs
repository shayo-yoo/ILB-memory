import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveStateChanges } from '../lib/action-state.js';

test('action state derives transfer and movement changes',()=>{assert.deepEqual(deriveStateChanges('转移',['甲','短剑','乙'])[0],{entityId:'短剑',field:'ownerId',before:null,after:'乙'});assert.deepEqual(deriveStateChanges('移动',['短剑','营地'])[0],{entityId:'短剑',field:'locationId',before:null,after:'营地'})});
test('unknown action produces no state changes',()=>assert.deepEqual(deriveStateChanges('计划',['甲']),[]));

import test from 'node:test';
import assert from 'node:assert/strict';
import { confirmPreviousPending, invalidatePendingBranch } from '../lib/confirmation.js';
import { createMemoryState } from '../lib/memory-model.js';

test('user floor confirms pending records from previous floors',()=>{const s=createMemoryState({records:[{id:'a',text:'a',floor:3,status:'pending',valid:false},{id:'b',text:'b',floor:4,status:'pending',valid:false}]});const n=confirmPreviousPending(s,4);assert.equal(n.records[0].status,'valid');assert.equal(n.records[1].status,'pending')});

test('confirming pending record derives tags immediately',()=>{const s=createMemoryState({entities:[{id:'e1',name:'短剑',type:'other'},{id:'e2',name:'甲',type:'other'}],records:[{id:'r1',text:'甲获得短剑',floor:1,status:'pending',valid:false,action:'获得',entityIds:['e1','e2']}]});const n=confirmPreviousPending(s,2);assert.deepEqual(n.entities.find(e=>e.id==='e1').tags,['person']);assert.deepEqual(n.entities.find(e=>e.id==='e2').tags,['item']);});
test('swipe invalidates pending non-selected branch',()=>{const s=createMemoryState({records:[{id:'a',text:'a',floor:3,status:'pending',valid:false,sourceMessageId:'m',swipeId:0},{id:'b',text:'b',floor:3,status:'pending',valid:false,sourceMessageId:'m',swipeId:1}]});const n=invalidatePendingBranch(s,{sourceMessageId:'m',swipeId:1});assert.equal(n.records[0].status,'invalid');assert.equal(n.records[1].status,'pending')});

import test from 'node:test';
import assert from 'node:assert/strict';
import { createEntityResolver } from '../lib/entity-resolver.js';

test('entity resolver reuses exact names and registers unknown names',()=>{let entities=[{id:'e1',name:'短剑',aliases:[]}];let n=0;const r=createEntityResolver({list:()=>entities,register:({name})=>{const e={id:`e${++n+1}`,name,aliases:[]};entities.push(e);return e}});const out=r.resolve(['短剑','甲']);assert.deepEqual(out.entityIds,['e1','e2']);assert.equal(out.created.length,1)});

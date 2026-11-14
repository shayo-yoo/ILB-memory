import test from 'node:test';
import assert from 'node:assert/strict';
import { mountILBMShell } from '../ui-shell.js';

function doc(){const nodes=new Map();function n(tag){const x={tagName:tag.toUpperCase(),children:[],style:{},hidden:false,open:false,attrs:{},listeners:{},append(...a){this.children.push(...a)},setAttribute(k,v){this.attrs[k]=String(v)},removeAttribute(k){delete this.attrs[k]},getAttribute(k){return this.attrs[k]??null},addEventListener(k,f){this.listeners[k]=f},close(){this.open=false},showModal(){this.open=true},remove(){}};Object.defineProperty(x,'id',{set(v){this._id=v;nodes.set(v,x)},get(){return this._id}});return x}return{body:n('body'),createElement:tag=>n(tag),getElementById:id=>nodes.get(id)??null};}

test('shell opens and closes deterministically on desktop',()=>{const d=doc();const s=mountILBMShell({documentObject:d});assert.equal(s.isOpen(),false);s.open();assert.equal(s.isOpen(),true);s.close();assert.equal(s.isOpen(),false);assert.equal(s.root.style.display,'none')});
test('shell mobile uses dialog top layer and closes',()=>{const d=doc();const s=mountILBMShell({documentObject:d,mobile:true});s.open();assert.equal(s.root.tagName,'DIALOG');assert.equal(s.root.open,true);s.root.listeners.cancel();assert.equal(s.isOpen(),false)});
test('duplicate mount returns same shell object',()=>{const d=doc();const a=mountILBMShell({documentObject:d});const b=mountILBMShell({documentObject:d});assert.equal(a,b)});

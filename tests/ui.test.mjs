import test from 'node:test';
import assert from 'node:assert/strict';
import { mountILBMPanel } from '../ui.js';

function fakeDocument() {
  const nodes = new Map();
  const documentObject = {
    body: node('body'), head: node('head'),
    createElement(tag) { return node(tag); },
    getElementById(id) { return nodes.get(id) ?? null; },
  };
  function node(tag) {
    const value = { tagName: tag.toUpperCase(), children: [], hidden: false, value: '', textContent: '', attributes: {}, listeners: {}, append(...items){this.children.push(...items);}, appendChild(item){this.children.push(item);}, setAttribute(k,v){this.attributes[k]=String(v);}, addEventListener(k,fn){this.listeners[k]=fn;}, remove(){}, click(){this.listeners.click?.({target:this});} };
    Object.defineProperty(value, 'id', { set(v){this._id=v; nodes.set(v,value);}, get(){return this._id;} });
    return value;
  }
  return documentObject;
}

test('debug panel duplicate mount returns an openable existing panel', () => {
  const documentObject = fakeDocument();
  const api = { processMarker: text => ({ triggered: true, text }), status: () => ({}) };
  const first = mountILBMPanel({ api, documentObject });
  const second = mountILBMPanel({ api, documentObject });
  assert.equal(second.duplicate, true); assert.equal(typeof second.open, 'function'); second.open(); assert.equal(first.root.hidden, false); assert.equal(first.root.attributes.hidden, undefined);
});

test('debug panel mounts, opens, tests marker text, and refreshes status', () => {
  const documentObject = fakeDocument();
  const api = { processMarker: text => ({ ok: true, triggered: text.includes('(((ILBM)))'), extractionText: text.replace('(((ILBM)))','') }), status: () => ({ markCount: 1 }) };
  const mounted = mountILBMPanel({ api, documentObject });
  assert.equal(mounted.ok, true);
  assert.equal(documentObject.body.children.length, 1);
  assert.equal(mounted.toggle.hidden, true);
  mounted.toggle.click();
  assert.equal(mounted.root.hidden, false);
  const textarea = mounted.root.children[1].children[0];
  textarea.value = '事件 (((ILBM)))';
  const buttons = mounted.root.children[1].children[1].children;
  buttons[0].click();
  assert.match(mounted.root.children[1].children[3].textContent, /triggered/);
  mounted.close();
  assert.equal(mounted.root.hidden, true);
});

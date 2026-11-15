export function createEntityResolver({ list = () => [], register = () => null } = {}) {
  function resolve(names = []) {
    const entities = Array.isArray(list()) ? list() : [];
    const results = []; const created = [];
    for (const raw of names) {
      const name = String(raw ?? '').trim(); if (!name) continue;
      const exact = entities.find(entity => entity.name === name || (entity.aliases ?? []).includes(name));
      if (exact) { results.push({ name, entityId: exact.id, created: false }); continue; }
      const entity = register({ name, type: 'other' });
      if (entity?.id) { results.push({ name, entityId: entity.id, created: true }); created.push(entity); }
    }
    return { results, created, entityIds: results.map(item => item.entityId) };
  }
  return { resolve };
}

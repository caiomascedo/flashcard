/* Stable JSON comparison survives Postgres JSONB key reordering. */
window.SincronizacaoSegura = (() => {
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const signature = value => JSON.stringify(value, function (key, item) {
    return item && typeof item === 'object' && !Array.isArray(item)
      ? Object.keys(item).sort().reduce((result, name) => { result[name] = item[name]; return result; }, {}) : item;
  });
  const equal = (a, b) => signature(a) === signature(b);
  async function database() {
    return new Promise((resolve, reject) => {
      const r = indexedDB.open('flashcards_sync_base', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('estados');
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  }
  async function load(user) {
    const db = await database();
    try { return await new Promise((resolve, reject) => {
      const r = db.transaction('estados').objectStore('estados').get(user);
      r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error);
    }); } finally { db.close(); }
  }
  async function store(user, state) {
    const db = await database();
    try { await new Promise((resolve, reject) => {
      const tx = db.transaction('estados', 'readwrite');
      tx.objectStore('estados').put(state, user);
      tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error);
    }); } finally { db.close(); }
  }
  function merge(base, local, remote, identity) {
    const conflicts = [];
    function field(b, l, r, path, strict = false) {
      if (equal(l, r) || equal(b, r)) return clone(l);
      if (equal(b, l)) return clone(r);
      if ([b, l, r].every(v => v == null || (typeof v === 'object' && !Array.isArray(v))) && l && r) {
        const result = {};
        for (const k of new Set([...Object.keys(b || {}), ...Object.keys(l), ...Object.keys(r)])) {
          const value = field(b?.[k], l[k], r[k], path + '.' + k, strict);
          if (value !== undefined) result[k] = value;
        }
        return result;
      }
      if (strict) conflicts.push(path);
      return clone(l);
    }
    const keysBySource = [];
    const maps = [base, local, remote].map(s => {
      const counts = new Map(), keys = [];
      keysBySource.push(keys);
      return new Map((s?.flashcards || []).map((c, i) => {
        const key = identity(c), occurrence = counts.get(key) || 0;
        counts.set(key, occurrence + 1);
        const id = key + '|#' + occurrence; keys.push(id);
        return [id, { card:c, i }];
      }));
    });
    const [bm, lm, rm] = maps;
    const order = [...new Set([...lm.keys(), ...rm.keys()])];
    const cards = [], ids = [];
    for (const id of order) {
      const b = bm.get(id)?.card, l = lm.get(id)?.card, r = rm.get(id)?.card;
      if (b && (!l || !r)) {
        const survivor = l || r;
        if (equal(survivor, b)) continue; // An unchanged copy cannot resurrect an intentional deletion.
        conflicts.push('card.' + id);
      }
      const card = !b && (!l || !r) ? clone(l || r) : field(b, l, r, 'card.' + id, true);
      if (card) { cards.push(card); ids.push(id); }
    }
    const result = field(base || {}, local, remote, 'estado');
    result.flashcards = cards;
    const indexed = (source, map, id, name, fallback) => map.has(id) ? source?.[name]?.[map.get(id).i] ?? fallback : fallback;
    result.statusCard = ids.map(id => field(indexed(base,bm,id,'statusCard','nao'), indexed(local,lm,id,'statusCard','nao'), indexed(remote,rm,id,'statusCard','nao'),'status'));
    result.respondido = ids.map((id,i) => result.statusCard[i] !== 'nao' || field(indexed(base,bm,id,'respondido',false),indexed(local,lm,id,'respondido',false),indexed(remote,rm,id,'respondido',false),'respondido'));
    result.acertos = result.statusCard.filter(s => s === 'acertou').length;
    result.erros = result.statusCard.filter(s => s === 'errou').length;
    const newIndex = new Map(ids.map((id,i) => [id,i]));
    const remap = i => newIndex.get(keysBySource[1][i]);
    for (const name of ['indicesFiltrados','revisaoIndices','simuladoIndices']) if (Array.isArray(local[name])) result[name] = local[name].map(remap).filter(i => i !== undefined);
    result.filaErros = ids.map((id,i) => result.statusCard[i] === 'errou' ? i : -1).filter(i => i >= 0);
    result.indiceAtual = remap(local.indiceAtual) ?? 0;
    result.indiceFilaErros = Math.min(local.indiceFilaErros || 0, Math.max(0,result.filaErros.length-1));
    result.indiceRevisao = Math.min(local.indiceRevisao || 0, Math.max(0,(result.revisaoIndices?.length || 0)-1));
    if (!result.filaErros.length) result.modoFilaErros = false;
    return { state: result, conflicts };
  }
  return { clone, signature, equal, load, store, merge };
})();

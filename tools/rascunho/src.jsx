import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Excalidraw, serializeAsJSON } from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';
import './style.css';

// Only this local drawing is stored here; Flashcard answers use their existing storage.
const database = new Promise((resolve, reject) => {
  const request = indexedDB.open('flashcard-rascunho', 1);
  request.onupgradeneeded = () => request.result.createObjectStore('desenhos');
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});
async function readStored(key) {
  const db = await database;
  return new Promise((resolve, reject) => {
    const request = db.transaction('desenhos').objectStore('desenhos').get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function writeStored(key, value) {
  const db = await database;
  await new Promise((resolve, reject) => {
    const transaction = db.transaction('desenhos', 'readwrite');
    transaction.objectStore('desenhos').put(value, key);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}
const status = (text) => {
  if (parent !== window) parent.postMessage({ type: 'rascunho:status', text }, location.origin);
};
let latest, timer, dirty = false, ready = false;
let editorAPI, librarySaving = Promise.resolve();
function saveLibrary(items) {
  if (!ready) return;
  librarySaving = writeStored('biblioteca', items);
  return librarySaving.catch(() => {
    editorAPI?.setToast({ message: 'Não foi possível salvar a biblioteca neste navegador.', duration: 5000 });
  });
}
async function quickLibrarySave() {
  if (!editorAPI || !ready) return;
  const all = editorAPI.getSceneElements();
  const selected = editorAPI.getAppState().selectedElementIds;
  const hasSelection = all.some(element => selected[element.id]);
  const elements = hasSelection ? all.filter(element => selected[element.id] || selected[element.containerId]) : all;
  if (!elements.length) return editorAPI.setToast({ message: 'Desenhe algo antes de salvar na biblioteca.' });
  if (elements.some(element => element.type === 'image')) {
    return editorAPI.setToast({ message: 'Selecione apenas desenhos e textos para a biblioteca. Imagens podem ser guardadas pela exportação do quadro.', duration: 6000 });
  }
  try {
    await editorAPI.updateLibrary({
      libraryItems: [{ id: crypto.randomUUID(), status: 'unpublished', elements, created: Date.now() }],
      merge: true,
      openLibraryMenu: true,
    });
    await librarySaving;
    editorAPI.setToast({ message: hasSelection ? 'Seleção salva na biblioteca!' : 'Desenho salvo na biblioteca!' });
  } catch {
    editorAPI.setToast({ message: 'Não foi possível salvar na biblioteca. Tente novamente.', duration: 5000 });
  }
}
async function save() {
  clearTimeout(timer);
  if (!dirty || !latest) return;
  dirty = false;
  try {
    const snapshot = JSON.parse(serializeAsJSON(...latest, 'local'));
    const db = await database;
    await new Promise((resolve, reject) => {
      const transaction = db.transaction('desenhos', 'readwrite');
      transaction.objectStore('desenhos').put(snapshot, 'principal');
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
    status(dirty ? 'Salvando…' : 'Salvo neste navegador');
  } catch {
    dirty = true;
    status('Não foi possível salvar. Exporte pelo menu do quadro.');
  }
}
const initialData = (async () => {
  let data, libraryItems = [];
  try {
    [data, libraryItems] = await Promise.all([readStored('principal'), readStored('biblioteca')]);
    status('Salvo neste navegador');
  } catch {
    status('Armazenamento indisponível. Exporte pelo menu do quadro.');
  }
  ready = true;
  return {
    ...data,
    libraryItems: libraryItems || [],
    appState: {
      ...data?.appState,
      activeTool: { type: 'freedraw', locked: false },
      viewBackgroundColor: data?.appState?.viewBackgroundColor || '#ffffff',
      currentItemStrokeWidth: data?.appState?.currentItemStrokeWidth || 2,
    },
    scrollToContent: true,
  };
})();
document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
window.addEventListener('pagehide', save);
window.addEventListener('message', (event) => {
  if (event.origin !== location.origin || event.source !== parent) return;
  if (event.data?.type === 'rascunho:salvar') save();
  if (event.data?.type === 'rascunho:biblioteca') quickLibrarySave();
});
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !document.querySelector('.excalidraw [role="dialog"], .excalidraw .popover')) {
    parent.postMessage({ type: 'rascunho:fechar' }, location.origin);
  }
});
function Drawing() {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('flashcard-rascunho-tema') === 'dark' ? 'dark' : 'light'; }
    catch { return 'light'; }
  });
  useEffect(() => {
    const receive = (event) => {
      if (event.origin !== location.origin || event.source !== parent || event.data?.type !== 'rascunho:tema') return;
      if (event.data.theme === 'light' || event.data.theme === 'dark') setTheme(event.data.theme);
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, []);
  return (
  <Excalidraw
    excalidrawAPI={api => { editorAPI = api; }}
    onLibraryChange={saveLibrary}
    theme={theme}
    UIOptions={{ canvasActions: { toggleTheme: false } }}
    langCode="pt-BR"
    name="Rascunho de matemática"
    initialData={initialData}
    autoFocus
    AIEnabled={false}
    onChange={(elements, appState, files) => {
      if (!ready || appState.isLoading) return;
      latest = [elements, appState, files];
      dirty = true;
      status('Salvando…');
      clearTimeout(timer);
      timer = setTimeout(save, 350);
    }}
  />
  );
}
createRoot(document.getElementById('root')).render(<Drawing />);

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
const status = (text) => {
  if (parent !== window) parent.postMessage({ type: 'rascunho:status', text }, location.origin);
};
let latest, timer, dirty = false, ready = false;
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
  let data;
  try {
    const db = await database;
    data = await new Promise((resolve, reject) => {
      const request = db.transaction('desenhos').objectStore('desenhos').get('principal');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    status('Salvo neste navegador');
  } catch {
    status('Armazenamento indisponível. Exporte pelo menu do quadro.');
  }
  ready = true;
  return {
    ...data,
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
  if (event.origin === location.origin && event.source === parent && event.data?.type === 'rascunho:salvar') save();
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

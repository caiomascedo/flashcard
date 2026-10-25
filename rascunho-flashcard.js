(() => {
  const dialog = document.createElement('dialog');
  dialog.id = 'rascunhoFlashcard';
  dialog.setAttribute('aria-labelledby', 'rascunhoTitulo');
  dialog.innerHTML = `<header><strong id="rascunhoTitulo">✏️ Rascunho</strong><span role="status">Carregando quadro…</span><button type="button" aria-label="Voltar aos cards">← Voltar</button></header><iframe title="Quadro de rascunho de matemática" hidden></iframe>`;
  document.body.append(dialog);
  const frame = dialog.querySelector('iframe');
  const save = () => frame.contentWindow?.postMessage({ type: 'rascunho:salvar' }, location.origin);
  const close = () => { save(); dialog.close(); };
  dialog.querySelector('button').onclick = close;
  dialog.addEventListener('cancel', save);
  dialog.addEventListener('close', () => { document.body.classList.remove('rascunho-aberto'); });
  dialog.addEventListener('click', event => { if (event.target === dialog) close(); });
  window.addEventListener('message', event => {
    if (event.origin !== location.origin || event.source !== frame.contentWindow) return;
    if (event.data?.type === 'rascunho:status') dialog.querySelector('[role="status"]').textContent = event.data.text;
    if (event.data?.type === 'rascunho:fechar' && dialog.open) close();
  });
  window.abrirRascunhoFlashcard = () => {
    document.getElementById('menuFlashcard')?.removeAttribute('open');
    if (!frame.getAttribute('src')) {
      frame.src = 'rascunho/index.html?v=1';
      frame.hidden = false;
    }
    if (!dialog.open) dialog.showModal();
    document.body.classList.add('rascunho-aberto');
    frame.focus();
  };
  const button = document.createElement('button');
  button.type = 'button';
  button.id = 'abrirRascunhoFlashcard';
  button.textContent = '✏️ Rascunho';
  button.title = 'Fazer contas no quadro';
  button.onclick = window.abrirRascunhoFlashcard;
  document.querySelector('.header-actions').prepend(button);
})();

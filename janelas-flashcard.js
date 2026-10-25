(() => {
  const expanded = dialog => dialog.matches('.rascunho-expandido, .caderno-maximizado, .caderno-editor-expandido');
  const clamp = (value, min, max) => Math.max(min, Math.min(value, max));
  for (const [selector, headerSelector] of [
    ['#rascunhoFlashcard', 'header'],
    ['#cadernoIntegradoDialog', '.caderno-integrado-barra'],
  ]) {
    const dialog = document.querySelector(selector);
    if (!dialog) continue;
    const header = dialog.querySelector(headerSelector);
    dialog.classList.add('janela-flashcard');
    header.classList.add('janela-barra-mover');
    header.title = 'Arraste para mover a janela';
    const mover = document.createElement('button');
    mover.type = 'button';
    mover.className = 'janela-mover';
    mover.innerHTML = '✥ <span>Mover</span>';
    mover.setAttribute('aria-label', 'Mover janela');
    mover.title = 'Arraste para mover; duplo clique para centralizar. Use também as setas do teclado.';
    header.append(mover);
    const viewport = () => ({ width: window.innerWidth, height: window.innerHeight });
    const apply = rect => {
      if (!dialog.classList.contains('janela-ajustada')) dialog.classList.add('janela-ajustada');
      for (const key of ['left', 'top', 'width', 'height']) dialog.style.setProperty('--janela-' + key, rect[key] + 'px');
    };
    const fit = () => {
      if (!dialog.open || !dialog.classList.contains('janela-ajustada') || expanded(dialog)) return;
      const r = dialog.getBoundingClientRect(), v = viewport();
      const width = Math.min(r.width, v.width), height = Math.min(r.height, v.height);
      apply({ width, height, left: clamp(r.left, 0, v.width - width), top: clamp(r.top, 0, v.height - height) });
    };
    function adjust(rect, dx, dy, direction) {
      const v = viewport();
      if (direction === 'move') return apply({
        width: rect.width, height: rect.height,
        left: clamp(rect.left + dx, 0, v.width - rect.width),
        top: clamp(rect.top + dy, 0, v.height - rect.height),
      });
      const minWidth = Math.min(340, v.width), minHeight = Math.min(240, v.height);
      let { left, top, right, bottom } = rect;
      if (direction.includes('w')) left = clamp(left + dx, 0, right - minWidth);
      if (direction.includes('e')) right = clamp(right + dx, left + minWidth, v.width);
      if (direction.includes('n')) top = clamp(top + dy, 0, bottom - minHeight);
      if (direction.includes('s')) bottom = clamp(bottom + dy, top + minHeight, v.height);
      apply({ left, top, width: right - left, height: bottom - top });
    }
    function start(event, direction, handle) {
      if (event.button !== 0 || expanded(dialog)) return;
      event.preventDefault();
      const rect = dialog.getBoundingClientRect(), x = event.clientX, y = event.clientY;
      handle.setPointerCapture(event.pointerId);
      dialog.classList.add('janela-manipulando');
      const move = e => { if (e.pointerId === event.pointerId) adjust(rect, e.clientX - x, e.clientY - y, direction); };
      const finish = () => {
        dialog.classList.remove('janela-manipulando');
        handle.removeEventListener('pointermove', move);
        handle.removeEventListener('pointerup', finish);
        handle.removeEventListener('pointercancel', finish);
        handle.removeEventListener('lostpointercapture', finish);
        window.removeEventListener('blur', finish);
        dialog.removeEventListener('close', finish);
        if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId);
      };
      handle.addEventListener('pointermove', move);
      handle.addEventListener('pointerup', finish);
      handle.addEventListener('pointercancel', finish);
      handle.addEventListener('lostpointercapture', finish);
      window.addEventListener('blur', finish);
      dialog.addEventListener('close', finish);
    }
    const keyboard = (event, direction) => {
      if (expanded(dialog) || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
      event.preventDefault(); event.stopPropagation();
      const step = event.shiftKey ? 1 : 10;
      adjust(dialog.getBoundingClientRect(), event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0,
        event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0, direction);
    };
    header.addEventListener('pointerdown', event => {
      if (event.target.closest('button, input, select, label, a')) return;
      start(event, 'move', header);
    });
    mover.onpointerdown = event => start(event, 'move', mover);
    mover.onkeydown = event => keyboard(event, 'move');
    mover.ondblclick = () => dialog.classList.remove('janela-ajustada');
    for (const direction of ['n', 'e', 's', 'w', 'ne', 'nw', 'se', 'sw']) {
      const handle = document.createElement('button');
      handle.type = 'button';
      handle.className = 'janela-redimensionar janela-' + direction;
      handle.dataset.direction = direction;
      handle.setAttribute('aria-label', direction === 'se' ? 'Redimensionar janela' : 'Redimensionar janela: ' + direction);
      handle.tabIndex = direction === 'se' ? 0 : -1;
      handle.title = 'Arraste para alterar o tamanho da janela';
      if (direction === 'se') handle.textContent = '⤡';
      handle.onpointerdown = event => start(event, direction, handle);
      handle.onkeydown = event => keyboard(event, direction);
      dialog.append(handle);
    }
    window.addEventListener('resize', fit);
    new MutationObserver(fit).observe(dialog, { attributes: true, attributeFilter: ['open', 'class'] });
  }
})();

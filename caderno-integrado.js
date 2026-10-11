/* Caderno completo do mesmo repositório e da mesma sessão dos Flashcards. */
(() => {
    const dialog = document.getElementById('cadernoIntegradoDialog');
    const frame = document.getElementById('cadernoIntegradoFrame');
    const status = document.getElementById('cadernoIntegradoStatus');
    const retry = document.getElementById('cadernoIntegradoRepetir');
    const expand = document.getElementById('cadernoIntegradoExpandir');
    let pronto = false;
    let carregando = false;
    let enviando = false;
    let timeout;
    const pendentes = [];

    function falha(mensagem) {
        clearTimeout(timeout);
        status.textContent = mensagem;
        retry.hidden = false;
    }
    function carregar() {
        pronto = false;
        carregando = true;
        retry.hidden = true;
        frame.hidden = true;
        status.textContent = 'Carregando anotações e sincronizando sua conta…';
        clearTimeout(timeout);
        timeout = setTimeout(() => falha('O caderno demorou para carregar. Tente novamente.'), 30000);
        frame.src = new URL('caderno.html?embed=flashcard&v=1', location.href).href;
    }
    async function enviarPendentes() {
        if (!pronto || enviando) return;
        enviando = true;
        try {
            while (pendentes.length) {
                await frame.contentWindow.CadernoIntegrado.importar(pendentes[0]);
                pendentes.shift();
            }
            status.textContent = 'Anotações salvas automaticamente. Sua conta também sincroniza o caderno na nuvem.';
        } catch (error) {
            console.error(error);
            falha('Não foi possível anotar o card. Ele está aguardando uma nova tentativa.');
        } finally { enviando = false; }
    }
    window.abrirCadernoIntegrado = function(card) {
        if (!dialog.open) dialog.showModal();
        if (card && !pendentes.some(item => item.idImportacao === card.idImportacao)) pendentes.push(card);
        if (!carregando) carregar();
        else enviarPendentes();
    };
    function salvar() {
        if (pronto) frame.contentWindow.CadernoIntegrado.salvar();
    }
    document.getElementById('cadernoIntegradoFechar').onclick = () => { salvar(); dialog.close(); };
    dialog.addEventListener('cancel', salvar);
    dialog.addEventListener('close', salvar);
    retry.onclick = () => { if (pronto) { retry.hidden = true; enviarPendentes(); } else carregar(); };
    expand.onclick = () => {
        const expanded = dialog.classList.toggle('caderno-maximizado');
        expand.setAttribute('aria-pressed', String(expanded));
        expand.textContent = expanded ? '↙ Restaurar' : '⛶ Maximizar';
    };
    window.addEventListener('message', event => {
        if (event.origin !== location.origin || event.source !== frame.contentWindow) return;
        if (event.data?.tipo === 'caderno:pronto') {
            clearTimeout(timeout);
            pronto = true;
            frame.hidden = false;
            retry.hidden = true;
            enviarPendentes();
        } else if (event.data?.tipo === 'caderno:erro') {
            falha(event.data.mensagem);
        } else if (event.data?.tipo === 'caderno:abrir-original') {
            const index = flashcards.findIndex(card => idImportacaoCaderno(card) === event.data.idImportacao);
            if (index < 0) { status.textContent = 'O card original não está disponível nos Flashcards.'; return; }
            salvar();
            sairDoModoEspecial();
            limparFiltro();
            indiceAtual = index;
            atualizarCard();
            dialog.close();
        }
    });
})();

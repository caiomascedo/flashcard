/* Caderno completo do mesmo repositório e da mesma sessão dos Flashcards. */
(() => {
    const dialog = document.getElementById('cadernoIntegradoDialog');
    const frame = document.getElementById('cadernoIntegradoFrame');
    const status = document.getElementById('cadernoIntegradoStatus');
    const retry = document.getElementById('cadernoIntegradoRepetir');
    const expand = document.getElementById('cadernoIntegradoExpandir');
    let calendarioPendente=false;
    let pronto = false;
    let carregando = false;
    let enviando = false;
    let timeout;
    let cardsTimer;
    let expandidoAntesDoEditor = false;
    let ultimaVersaoCards = '';
    const pendentes = [];
    const parametrosUnificado = new URLSearchParams(location.search);
    const veioDoUnificado = parametrosUnificado.get('view') === 'caderno-erros';
    let assuntoPendente = veioDoUnificado && parametrosUnificado.get('assunto') && parametrosUnificado.get('materia') ? {
        concurso:'PMPI', materia:parametrosUnificado.get('materia'), assunto:parametrosUnificado.get('assunto'), questoes:parametrosUnificado.get('qc')||''
    } : null;
    let abrirRotaPendente = veioDoUnificado;


    // Preserve progress and stable links while notebook authors edit their cards.
    function sincronizarCards() {
        if (!pronto) return;
        const sources = frame.contentWindow.CadernoIntegrado.cards();
        const versao = JSON.stringify(sources);
        if (versao === ultimaVersaoCards) return;
        const porId = new Map(flashcards.filter(card => card.cadernoId).map(card => [card.cadernoId, card]));
        const porOrigem = new Map();
        if (sources.some(card => card.origemImportacao)) {
            flashcards.forEach(card => porOrigem.set(idImportacaoCaderno(card), card));
        }
        let mudou = false;
        for (const source of sources) {
            if (!source.pergunta || !source.resposta) continue;
            let card = porId.get(source.id);
            if (!card && source.origemImportacao) {
                card = porOrigem.get(source.origemImportacao);
            }
            if (!card) {
                card = { tipo: 'flashcard', topico: 'Caderno', nivel: 'medio',loteImportacao:'caderno:'+source.id,importadoEm:Date.parse(source.criadoEm)||Date.now() };
                flashcards.push(card);
                respondido.push(false);
                statusCard.push('nao');
                mudou = true;
            }
            const fields = {
                cadernoId: source.id,
                concurso: source.concurso, materia: source.materia, assunto: source.assunto,
                pergunta: source.pergunta, resposta: source.resposta, dica: source.dica,
                tags: source.tags
            };
            if (source.origemImportacao) fields.cadernoOrigemImportacao = source.origemImportacao;
            for (const [key, value] of Object.entries(fields)) {
                if (JSON.stringify(card[key]) !== JSON.stringify(value)) {
                    card[key] = value;
                    mudou = true;
                }
            }
            porId.set(source.id, card);
        }
        if (!mudou) { ultimaVersaoCards = versao; return; }
        total = flashcards.length;
        if (filtroAtivo) {
            if (filtroAtivo.tipo === 'lista') indicesFiltrados=indicesFiltrados.filter(i=>!!flashcards[i]);
            else if (filtroAtivo.tipo === 'lote') indicesFiltrados = flashcards.map((card, index) => card.loteImportacao === filtroAtivo.loteId && card.tipo !== 'questao' && !(card.alternativas?.length >= 2) && !String(card.pergunta || '').startsWith('📁 Pasta:') ? index : -1).filter(index => index >= 0);
            else if (filtroAtivo.tipo === 'lista') indicesFiltrados = indicesFiltrados.filter(index=>!!flashcards[index]);
            else if (filtroAtivo.path) indicesFiltrados = getIndicesDaPasta(filtroAtivo.path);
            else {
                indicesFiltrados = flashcards.map((card, index) => {
                    const matches = filtroAtivo.tipo === 'busca'
                        ? [card.concurso, card.materia, card.assunto, card.topico, card.pergunta, card.resposta, card.dica]
                            .join(' ').toLocaleLowerCase('pt-BR').includes(filtroAtivo.termo.toLocaleLowerCase('pt-BR'))
                        : card[filtroAtivo.nivel] === filtroAtivo.nome;
                    return matches ? index : -1;
                }).filter(index => index >= 0);
            }
        }
        if (salvarEstado()) ultimaVersaoCards = versao;
        atualizarCard();
        renderizarArvore();
        window.recuperarHistoricoLotes?.();
    }
    function definirExpandido(expanded) {
        dialog.classList.toggle('caderno-maximizado', expanded);
        expand.setAttribute('aria-pressed', String(expanded));
        expand.textContent = expanded ? '↙ Reduzir' : '⛶ Expandir';
    }

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
        frame.src = new URL('caderno.html?embed=flashcard&v=17', location.href).href;
    }
    async function enviarPendentes() {
        if (!pronto || enviando) return;
        enviando = true;
        try {
            while (pendentes.length) {
                await frame.contentWindow.CadernoIntegrado.importar(pendentes[0]);
                pendentes.shift();
            }
            if (assuntoPendente) {
                await frame.contentWindow.CadernoIntegrado.abrirAssunto(assuntoPendente);
                assuntoPendente = null;
            }
            if(calendarioPendente&&frame.contentWindow.abrirCalendarioRevisoes){frame.contentWindow.abrirCalendarioRevisoes();calendarioPendente=false;}
            sincronizarCards();
            status.textContent = '';
        } catch (error) {
            console.error(error);
            falha(assuntoPendente ? 'Não foi possível abrir o assunto no caderno de erros. ' + (error.message || 'Tente novamente.') : 'Não foi possível anotar o card. Ele está aguardando uma nova tentativa.');
        } finally { enviando = false; }
    }
    window.abrirCadernoIntegrado = function(card) {
        if (!dialog.open) dialog.showModal();
        if (card && !pendentes.some(item => item.idImportacao === card.idImportacao)) pendentes.push(card);
        if (!carregando) carregar();
        else enviarPendentes();
    };
    window.abrirCalendarioCaderno=()=>{calendarioPendente=true;window.abrirCadernoIntegrado();};
    window.abrirCadernoPorAssunto = function(assunto) {
        assuntoPendente = assunto;
        window.abrirCadernoIntegrado();
    };
    function prepararCaderno() {
        if (!window.FlashcardCaderno?.pronto) return;
        if (abrirRotaPendente) {
            abrirRotaPendente = false;
            window.abrirCadernoIntegrado();
            return;
        }
        if (carregando) return;
        const preparar = () => { if (!carregando) carregar(); };
        if ('requestIdleCallback' in window) window.requestIdleCallback(preparar, { timeout: 1500 });
        else setTimeout(preparar, 150);
    }
    window.addEventListener('flashcard:pronto', prepararCaderno, { once: true });
    prepararCaderno();
    function salvar() {
        if (pronto) {
            frame.contentWindow.CadernoIntegrado.salvar();
            sincronizarCards();
        }
    }
    document.getElementById('cadernoIntegradoFechar').onclick = () => { salvar(); dialog.close(); };
    dialog.addEventListener('cancel', salvar);
    dialog.addEventListener('close', salvar);
    let iniciouFora=false;
    const fora=event=>{const r=dialog.getBoundingClientRect();return event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom;};
    dialog.addEventListener('pointerdown',event=>{iniciouFora=event.target===dialog && fora(event);});
    dialog.addEventListener('click',event=>{if(iniciouFora && event.target===dialog && fora(event)){salvar();dialog.close();}iniciouFora=false;});
    retry.onclick = () => { if (pronto) { retry.hidden = true; enviarPendentes(); } else carregar(); };
    expand.onclick = () => definirExpandido(!dialog.classList.contains('caderno-maximizado'));
    window.addEventListener('message', event => {
        if (event.origin !== location.origin || event.source !== frame.contentWindow) return;
        if(event.data?.tipo==='caderno:estudar-assunto'){
            sincronizarCards();const ids=new Set(event.data.ids||[]);const indices=flashcards.map((c,i)=>ids.has(String(c.cadernoId))?i:-1).filter(i=>i>=0);
            if(!indices.length){status.textContent='Envie os cards deste assunto ao Flashcard antes de estudar por aqui.';return;}
            filtroAtivo={tipo:'lista',nome:'Cards do caderno por assunto'};filtroNome.textContent=filtroAtivo.nome;filtroInfo.style.display='inline';limparFiltroBtn.style.display='inline-block';indicesFiltrados=indices;modoFilaErros=false;modoRevisao=false;indiceAtual=indices[0];atualizarCard();salvarEstado();dialog.close();return;
        }

        if (event.data?.tipo === 'caderno:pronto') {
            clearTimeout(timeout);
            pronto = true;
            frame.hidden = false;
            retry.hidden = true;
            enviarPendentes();
        } else if (event.data?.tipo === 'caderno:erro') {
            falha(event.data.mensagem);
        } else if (event.data?.tipo === 'caderno:cards-alterados') {
            clearTimeout(cardsTimer);
            cardsTimer = setTimeout(sincronizarCards, 100);
        } else if (event.data?.tipo === 'caderno:editor-expandido') {
            const expanded = !!event.data.expanded;
            if (expanded) expandidoAntesDoEditor = dialog.classList.contains('caderno-maximizado');
            dialog.classList.toggle('caderno-editor-expandido', expanded);
            definirExpandido(expanded || expandidoAntesDoEditor);
        } else if (event.data?.tipo === 'caderno:abrir-original') {
            sincronizarCards();
            const index = flashcards.findIndex(card =>
                (event.data.cadernoId && card.cadernoId === event.data.cadernoId) ||
                (event.data.idImportacao && idImportacaoCaderno(card) === event.data.idImportacao)
            );
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


function ultimoLoteImportado() {
    let newest = null;
    for (const card of flashcards) {
        if (card.tipo === 'questao' || card.alternativas?.length >= 2 || String(card.pergunta || '').startsWith('📁 Pasta:')) continue;
        if (card.loteImportacao && (!newest || card.importadoEm > newest.importadoEm)) newest = card;
    }
    return newest?.loteImportacao || null;
}
function indicesDoLote(loteId) {
    return flashcards.map((card, index) => card.loteImportacao === loteId &&
        card.tipo !== 'questao' && !(card.alternativas?.length >= 2) &&
        !String(card.pergunta || '').startsWith('📁 Pasta:') ? index : -1).filter(index => index >= 0);
}
function atualizarNovosCards() {
    const lote = ultimoLoteImportado();
    const indices = lote ? indicesDoLote(lote) : [];
    document.getElementById('novoLoteBarra').hidden = !indices.length;
    document.getElementById('novoLoteResumo').textContent = `🆕 ${indices.length} novos importados`;
    document.getElementById('flashcard').classList.toggle('card-novo', !!lote && getCardAtual()?.loteImportacao === lote);
}
function iniciarNovosCards(loteId = ultimoLoteImportado()) {
    const indices = loteId ? indicesDoLote(loteId) : [];
    if (!indices.length) return showToast('Nenhum card novo disponível neste lote.');
    salvarNoHistorico();
    filtroAtivo = { tipo: 'lote', loteId, nome: `Novos importados (${indices.length})` };
    indicesFiltrados = indices;
    modoFilaErros = false; modoRevisao = false;
    indiceFilaErros = 0; indiceRevisao = 0; indiceAtual = indices[0];
    filtroNome.textContent = filtroAtivo.nome;
    filtroInfo.style.display = 'inline'; limparFiltroBtn.style.display = 'inline-block';
    atualizarCard(); salvarEstado();
}
async function copiarErradosRapido() {
    const scope = filtroAtivo ? indicesFiltrados : modoRevisao ? revisaoIndices : flashcards.map((_, index) => index);
    const indices = [...new Set(scope)].filter(index => statusCard[index] === 'errou' && flashcards[index] &&
        flashcards[index].tipo !== 'questao' && !(flashcards[index].alternativas?.length >= 2) &&
        !String(flashcards[index].pergunta || '').startsWith('📁 Pasta:'));
    if (!indices.length) return showToast('Nenhum card errado nesta lupa ou revisão.');
    const report = {
        pedido: 'Errei estes flashcards. Revise o conteúdo e explique os pontos que preciso reforçar.',
        selecao: filtroAtivo?.nome || (modoRevisao ? 'Revisão atual' : 'Todos os flashcards'),
        total: indices.length,
        flashcards: indices.map(index => {
            const card = flashcards[index];
            return { numero: index + 1, concurso: card.concurso, materia: card.materia,
                assunto: card.assunto, topico: card.topico, pergunta: card.pergunta,
                respostaCadastrada: card.resposta, dica: card.dica || '', resultado: 'errou' };
        })
    };
    const texto = JSON.stringify(report, null, 2);
    try {
        if (!navigator.clipboard?.writeText) throw Error('Clipboard indisponível');
        await navigator.clipboard.writeText(texto);
        showToast(`📋 ${indices.length} errado(s) copiado(s). Cole no chat.`);
    } catch {
        abrirModal('📋 Copiar cards errados', '<textarea id="copiaRapidaErrados" readonly aria-label="Cards errados para copiar"></textarea>', 'Fechar', () => {});
        const area = document.getElementById('copiaRapidaErrados');
        area.value = texto; area.focus(); area.select();
        try {
            if (document.execCommand('copy')) showToast(`📋 ${indices.length} errado(s) copiado(s).`);
            else showToast('Selecione e copie o texto para colar no chat.');
        } catch { showToast('Selecione e copie o texto para colar no chat.'); }
    }
}
atualizarNovosCards();

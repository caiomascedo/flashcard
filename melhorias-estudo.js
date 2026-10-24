/* Ferramentas de estudo: histórico local e colagem com revisão. */
function separarCola(texto) {
    const partes = String(texto).replace(/\r\n?/g, '\n').trim().split(/\n[\t ]*\n+/);
    return { pergunta: partes.shift()?.trim() || '', resposta: partes.join('\n\n').trim() };
}
function abrirColaInteligente() {
    abrirModal('📋 Cola inteligente', `<p>Cole a pergunta e a resposta separadas por uma linha em branco (Shift+Enter duas vezes).</p><textarea id="colaTexto" rows="7" aria-label="Pergunta e resposta juntas" style="width:100%"></textarea><div id="colaCampos"></div>`, 'Cadastrar flashcard', () => {
        const p=document.getElementById('colaPergunta'), r=document.getElementById('colaResposta');
        if(!p.value.trim() || !r.value.trim()) { showToast('Preencha a pergunta e a resposta.'); return false; }
        const item={pergunta:p.value.trim(),resposta:r.value.trim()};
        for(const key of ['concurso','materia','assunto','topico']) item[key]=document.getElementById('cola_'+key).value.trim() || 'Geral';
        adicionarDados([item]);
    });
    const campos=document.getElementById('colaCampos');
    const atual=getCardAtual() || {};
    for(const key of ['concurso','materia','assunto','topico']) {
        const label=document.createElement('label'); label.textContent=key+': ';
        const input=document.createElement('input'); input.id='cola_'+key; input.value=atual[key]||''; label.append(input); campos.append(label);
    }
    for(const [id,nome] of [['colaPergunta','Frente / pergunta'],['colaResposta','Verso / resposta']]) {
        const label=document.createElement('label');label.textContent=nome;
        const area=document.createElement('textarea');area.id=id;area.rows=3;area.style.width='100%';label.append(area);campos.append(label);
    }
    document.getElementById('colaTexto').addEventListener('input',e=>{
        const c=separarCola(e.target.value);document.getElementById('colaPergunta').value=c.pergunta;document.getElementById('colaResposta').value=c.resposta;
    });
}
(() => {
    const key='estudo_historico_v1';
    let eventos=[];try { eventos=JSON.parse(localStorage.getItem(key)||'[]'); if(!Array.isArray(eventos))eventos=[]; } catch {}
    const painel=document.createElement('details');painel.id='historicoEstudo';painel.innerHTML='<summary>🕘 Últimos cards e lupas</summary><div></div>';
    document.getElementById('novoLoteBarra').after(painel);
    function desenhar() {
        const lista=painel.querySelector('div');lista.replaceChildren();
        if(!eventos.length)lista.textContent='As próximas importações e lupas aparecerão aqui.';
        eventos.slice(0,20).forEach(ev=>{
            const b=document.createElement('button');b.type='button';b.textContent=`${new Date(ev.data).toLocaleString('pt-BR')} · ${ev.nome}`;
            b.onclick=()=>ev.lote?iniciarNovosCards(ev.lote):ev.path?aplicarFiltroPorCaminho(ev.path):aplicarFiltro(ev.nivel,ev.filtro);
            lista.append(b);
        });
    }
    function registrar(ev) {eventos.unshift({...ev,data:Date.now()});eventos=eventos.slice(0,40);try{localStorage.setItem(key,JSON.stringify(eventos));}catch{}desenhar();}
    function recuperarLotesAnteriores() {
        const lotes=new Map();
        flashcards.forEach(card=>{
            if(!card.loteImportacao || !Number(card.importadoEm) || card.tipo==='questao' || card.alternativas?.length>=2 || String(card.pergunta||'').startsWith('📁 Pasta:'))return;
            if(!lotes.has(card.loteImportacao))lotes.set(card.loteImportacao,[]);
            lotes.get(card.loteImportacao).push(card);
        });
        for(const [lote,cards] of lotes) {
            if(eventos.some(ev=>ev.lote===lote))continue;
            const destinos=[...new Set(cards.map(c=>caminhoLivre(c).join(' › ')))];
            eventos.push({lote,data:Number(cards[0].importadoEm),nome:`＋ ${cards.length} cards · ${destinos.join('; ')}`});
        }
        eventos.sort((a,b)=>b.data-a.data);eventos=eventos.slice(0,40);
        try{localStorage.setItem(key,JSON.stringify(eventos));}catch{}
        desenhar();
    }
    window.addEventListener('flashcard:pronto',recuperarLotesAnteriores,{once:true});
    function sinalizarPastas() {
        const lote=ultimoLoteImportado();if(!lote)return;
        document.querySelectorAll('.node-label[data-path]').forEach(el=>{
            const partes=el.dataset.path.split('|');
            const novos=flashcards.filter(c=>c.loteImportacao===lote && partes.every((p,i)=>caminhoLivre(c)[i]===p)).length;
            if(!novos)return;
            const badge=document.createElement('small');badge.className='sinal-novos';badge.textContent=`＋${novos}`;badge.title=`${novos} cards do último lote nesta pasta`;el.querySelector('.name')?.after(badge);
        });
    }
    const arvore=renderizarArvore;renderizarArvore=function(...args){const r=arvore(...args);sinalizarPastas();return r;};
    const adicionar=adicionarDados;
    adicionarDados=function(dados){
        const antes=flashcards.length;adicionar(dados);
        if(flashcards.length===antes)return;
        const novos=flashcards.slice(antes),lote=novos[0].loteImportacao;
        const destinos=[...new Set(novos.map(c=>caminhoLivre(c).join(' › ')))];
        // Abre o caminho inteiro para os cards ficarem visíveis na árvore.
        novos.forEach(c=>{const partes=caminhoLivre(c);partes.forEach((_,i)=>pastasRecolhidas.delete(partes.slice(0,i+1).join('|')));});
        renderizarArvore();
        registrar({nome:`＋ ${novos.length} cards · ${destinos.join('; ')}`,lote});
        iniciarNovosCards(lote);atualizarNovosCards();
        const resumo=document.getElementById('novoLoteResumo');resumo.textContent=`＋ ${novos.length} adicionados · ${destinos.join(' • ')}`;
        resumo.title=destinos.join('\n');
        showToast(`${novos.length} cards adicionados em ${destinos.join('; ')}`);
    };
    for(const nome of ['aplicarFiltro','aplicarFiltroPorCaminho']) {
        const original=window[nome];window[nome]=function(...args){const r=original(...args);if(indicesFiltrados.length)registrar({nome:`🔍 ${filtroAtivo.nome}`,path:filtroAtivo.path,nivel:filtroAtivo.nivel,filtro:filtroAtivo.nome});return r;};
    }
    const barra=document.createElement('div');barra.className='acoes-pergunta';barra.setAttribute('aria-label','Avaliar flashcard');
    document.getElementById('flashcard').after(barra);
    document.querySelectorAll('[onclick="marcarAcertou()"], [onclick="marcarErrou()"], [onclick^="marcarNivel("]').forEach(b=>barra.append(b));
    const dica=document.createElement('small');dica.textContent='←/→ passar · Espaço revelar · A acertou · E errou · 1 fácil · 2 médio · 3 difícil';barra.after(dica);
    const btn=document.createElement('button');btn.textContent='📋 Cola inteligente';btn.onclick=abrirColaInteligente;document.querySelector('.header-actions').append(btn);
    const flut=btn.cloneNode(true);flut.id='colaFlutuante';flut.onclick=abrirColaInteligente;document.body.append(flut);
    document.addEventListener('keydown',e=>{
        if(e.ctrlKey||e.altKey||e.metaKey||e.target.closest('input,textarea,select,[contenteditable="true"]')||document.querySelector('dialog[open]')||modalOverlay.classList.contains('active'))return;
        if(['1','2','3'].includes(e.key)){e.preventDefault();marcarNivel({'1':'facil','2':'medio','3':'dificil'}[e.key]);}
        if(e.target.closest('button,a,summary')) {
            const acao={ArrowRight:proximo,ArrowLeft:anterior,a:marcarAcertou,e:marcarErrou}[e.key];
            if(acao){e.preventDefault();acao();}
        }
    });
    recuperarLotesAnteriores();sinalizarPastas();
})();


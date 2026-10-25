(() => {
    const key='estudo_historico_v1';
    let eventos=[];try { eventos=JSON.parse(localStorage.getItem(key)||'[]'); if(!Array.isArray(eventos))eventos=[]; } catch {}
    window.obterHistoricoEstudo=()=>eventos.map(ev=>({...ev}));
    const painel=document.createElement('details');painel.id='historicoEstudo';painel.innerHTML='<summary>🕘 Últimos cards e lupas</summary><div></div>';
    const atividade=document.createElement('details');atividade.id='atividadeLateral';atividade.innerHTML='<summary>📌 Atividade e novos cards</summary><div></div>';
    atividade.lastElementChild.append(document.getElementById('subtitulo'),document.getElementById('novoLoteBarra'),document.getElementById('filtrosConcluidosPainel'));
    const lado=document.getElementById('explorerPanel');lado.querySelector('.import-buttons').after(atividade,painel);
    const modo=document.getElementById('modoBadge');atividade.lastElementChild.prepend(modo);
    const destaque=document.createElement('label');destaque.className='opcao-destaque';const check=document.createElement('input');check.type='checkbox';
    let semDestaque=true;try{semDestaque=localStorage.getItem('flash_sem_destaque')!=='false';}catch{}
    check.checked=!semDestaque;document.body.classList.toggle('sem-destaque',semDestaque);
    destaque.append(check,document.createTextNode(' Destaque amarelo'));atividade.lastElementChild.append(destaque);
    check.onchange=()=>{document.body.classList.toggle('sem-destaque',!check.checked);try{localStorage.setItem('flash_sem_destaque',String(!check.checked));}catch{}};
    const abrirConcluidos=alternarPainelFiltrosConcluidos;alternarPainelFiltrosConcluidos=function(){atividade.open=true;return abrirConcluidos();};
    function desenhar() {
        const lista=painel.querySelector('div');lista.replaceChildren();
        if(!eventos.length) { lista.textContent='As próximas importações e lupas aparecerão aqui.'; return; }

        const hojeStr = new Date().toDateString();
        const ontem = new Date(); ontem.setDate(ontem.getDate() - 1);
        const ontemStr = ontem.toDateString();

        const gruposTempo = {
            '📅 Hoje': [],
            '📅 Ontem': [],
            '📁 Anteriores': []
        };

        eventos.slice(0,30).forEach(ev => {
            const dt = new Date(ev.data).toDateString();
            if (dt === hojeStr) gruposTempo['📅 Hoje'].push(ev);
            else if (dt === ontemStr) gruposTempo['📅 Ontem'].push(ev);
            else gruposTempo['📁 Anteriores'].push(ev);
        });

        for (const [rotulo, itens] of Object.entries(gruposTempo)) {
            if (!itens.length) continue;
            const containerTempo = document.createElement('details');
            containerTempo.className = 'historico-pasta';
            containerTempo.open = (rotulo === '📅 Hoje');
            const summaryTempo = document.createElement('summary');
            summaryTempo.style.fontWeight = '700';
            summaryTempo.style.color = '#38bdf8';
            summaryTempo.textContent = `${rotulo} (${itens.length})`;
            containerTempo.append(summaryTempo);

            itens.forEach(ev => {
                const grupo=document.createElement('details');grupo.className='historico-pasta';
                const summary=document.createElement('summary');
                const cards=ev.lote?indicesDoLote(ev.lote).map(i=>flashcards[i]):[];
                const nome=ev.lote?`${cards.length} ${cards.length===1?'card importado':'cards importados'}`:String(ev.filtro||ev.nome).replace(/^🔍\s*/,'');
                summary.textContent=`📁 ${nome}`;summary.title=new Date(ev.data).toLocaleString('pt-BR');grupo.append(summary);
                const meta=document.createElement('small');meta.textContent=new Date(ev.data).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'});grupo.append(meta);
                const b=document.createElement('button');b.type='button';b.textContent=ev.lote?'▶ Estudar este lote':'🔍 Abrir esta seleção';
                b.onclick=()=>ev.lote?iniciarNovosCards(ev.lote):ev.path?aplicarFiltroPorCaminho(ev.path):aplicarFiltro(ev.nivel,ev.filtro);grupo.append(b);
                if(ev.lote){
                    const raiz={filhos:new Map(),path:[]};
                    cards.forEach(c=>{let no=raiz;caminhoLivre(c).forEach(parte=>{if(!no.filhos.has(parte))no.filhos.set(parte,{filhos:new Map(),path:[...no.path,parte]});no=no.filhos.get(parte);});});
                    const mostrar=(no,container)=>no.filhos.forEach((filho,nome)=>{
                        const pasta=document.createElement('details');pasta.className='historico-pasta';const titulo=document.createElement('summary');titulo.textContent=`📂 ${nome}`;pasta.append(titulo);
                        const abrir=document.createElement('button');abrir.type='button';abrir.textContent='🔍 Estudar pasta';abrir.onclick=()=>aplicarFiltroPorCaminho(filho.path.join('|'));pasta.append(abrir);mostrar(filho,pasta);container.append(pasta);
                    });mostrar(raiz,grupo);
                }
                containerTempo.append(grupo);
            });
            lista.append(containerTempo);
        }
    }
    function registrar(ev) {
        const identidade=e=>e.lote?'lote:'+e.lote:e.path?'pasta:'+e.path:'filtro:'+e.nivel+':'+e.filtro;
        eventos=eventos.filter(e=>identidade(e)!==identidade(ev));
        eventos.unshift({...ev,data:Date.now()});eventos=eventos.slice(0,40);
        try{localStorage.setItem(key,JSON.stringify(eventos));}catch{}desenhar();
    }
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
    const flut=document.createElement('button');flut.id='cadernoFlutuante';flut.type='button';flut.textContent='📕 Caderno de erros';flut.onclick=()=>abrirCadernoIntegrado();document.body.append(flut);
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

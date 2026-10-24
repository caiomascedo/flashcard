/* Indicadores abrem uma prévia; a sessão só começa após a escolha do usuário. */
(() => {
    function unicos(indices){return [...new Set(indices)].filter(i=>flashcards[i] && flashcards[i].tipo!=='questao' && !(flashcards[i].alternativas?.length>=2) && !String(flashcards[i].pergunta||'').startsWith('📁 Pasta:'));}
    function selecaoAtual(){return unicos(modoFilaErros?filaErros:modoRevisao?revisaoIndices:filtroAtivo?indicesFiltrados:flashcards.map((_,i)=>i));}
    function iniciar(indices,nome){indices=unicos(indices);if(!indices.length)return;salvarNoHistorico();modoFilaErros=false;modoRevisao=false;filtroAtivo={tipo:'lista',nome};indicesFiltrados=indices;indiceAtual=indices[0];filtroNome.textContent=nome;filtroInfo.style.display='inline';limparFiltroBtn.style.display='inline-block';atualizarCard();salvarEstado();}
    function mostrar(titulo,indices,acao,botao='Estudar esta seleção'){
        indices=unicos(indices);
        abrirModal(titulo,'<p id="resumoIndicador"></p><div id="listaIndicador"></div>',indices.length?botao:'Fechar',()=>{if(indices.length){if(acao===irParaFilaErros){iniciar(indices,titulo);irParaFilaErros();}else acao?acao():iniciar(indices,titulo);}});
        document.getElementById('resumoIndicador').textContent=`${indices.length} cards. Abra uma pasta para conferir as perguntas e os registros do histórico antes de estudar.`;
        const historico=window.obterHistoricoEstudo?.()||[],pastas=new Map();
        indices.forEach(i=>{const path=caminhoLivre(flashcards[i]).join(' › ');if(!pastas.has(path))pastas.set(path,[]);pastas.get(path).push(i);});
        const lista=document.getElementById('listaIndicador');
        for(const [path,ids] of pastas){
            const grupo=document.createElement('details'),cab=document.createElement('summary');cab.textContent=`📂 ${path} · ${ids.length} cards`;grupo.append(cab);
            ids.forEach(i=>{const card=flashcards[i],item=document.createElement('article'),q=document.createElement('p');q.textContent=card.pergunta;item.append(q);
                const registros=historico.filter(ev=>ev.lote?ev.lote===card.loteImportacao:ev.path?ev.path.split('|').every((parte,n)=>caminhoLivre(card)[n]===parte):ev.nivel&&card[ev.nivel]===ev.filtro);
                const origem=document.createElement('small');origem.textContent=registros.length?'🕘 '+registros.map(ev=>`${ev.lote?'Lote importado':ev.filtro||ev.nome} · ${new Date(ev.data).toLocaleDateString('pt-BR')}`).join(' | '):'Sem registro correspondente no histórico.';item.append(origem);
                const b=document.createElement('button');b.type='button';b.textContent='Abrir este card';b.onclick=()=>{iniciar([i],path);fecharModal();};item.append(b);grupo.append(item);
            });lista.append(grupo);
        }
    }
    const definicoes=[
        ['Cards da seleção','📌',['cardAtual','totalCards'],()=>mostrar('Cards da seleção atual',selecaoAtual())],
        ['Acertos','✅',['acertos'],()=>mostrar('Cards marcados como acerto',flashcards.map((_,i)=>statusCard[i]==='acertou'?i:-1))],
        ['Erros','❌',['erros'],()=>mostrar('Cards marcados como erro',flashcards.map((_,i)=>statusCard[i]==='errou'?i:-1),irParaFilaErros,'Começar reforço de erros')],
        ['Estatísticas','📊',['percentual'],()=>{mostrar('Estatísticas e histórico da seleção',selecaoAtual());document.getElementById('resumoIndicador').textContent=`${acertos} acertos registrados · ${erros} erros registrados · ${unicos(filaErros).length} cards na fila de reforço · ${selecaoAtual().length} cards na seleção atual.`;}],
        ['Fila de erros','🔄',['filaErrosCount'],()=>mostrar('Histórico dos cards na fila de erros',filaErros,irParaFilaErros,'Começar reforço de erros')],
        ['Revisão','🔁',['revisaoCount'],()=>{if(revisaoIndices.length)mostrar('Cards da revisão',revisaoIndices);else abrirModal('Revisão','<p>Nenhuma revisão em andamento. Deseja iniciar uma revisão aleatória?</p>','Iniciar revisão',iniciarRevisaoAleatoria);}]
    ];
    const barra=document.querySelector('.main-content > .stats'),botoes=[];
    for(const [nome,emoji,ids,acao] of definicoes){const b=document.createElement('button');b.type='button';b.setAttribute('aria-label',nome);b.title=`Ver ${nome.toLowerCase()}`;b.append(document.createTextNode(emoji+' '));ids.forEach((id,n)=>{if(n)b.append(document.createTextNode(' / '));b.append(document.getElementById(id));});b.onclick=acao;botoes.push(b);}
    barra.replaceChildren(...botoes);
    const reforco=document.getElementById('filaErrosInfo');reforco.setAttribute('role','button');reforco.tabIndex=0;reforco.title='Conferir cards e histórico antes de começar';reforco.onclick=()=>mostrar('Histórico dos cards na fila de erros',filaErros,irParaFilaErros,'Começar reforço de erros');reforco.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();reforco.click();}});
    const css=document.createElement('style');css.textContent='.main-content>.stats{display:flex;justify-content:center;flex-wrap:wrap;gap:3px}.main-content>.stats button{border:0;background:transparent;color:#e1e9fa;padding:5px 8px;font:inherit;font-size:12px;cursor:pointer;border-radius:5px}.main-content>.stats button:hover{background:#ffffff12}#filaErrosInfo{cursor:pointer}#filaErrosInfo:focus-visible,.main-content>.stats button:focus-visible{outline:2px solid #98bad4;outline-offset:2px}#listaIndicador{max-height:55vh;overflow:auto;color:#e5edf8}#listaIndicador details{padding:7px;border:1px solid #58617b;border-radius:7px;margin:6px 0}#listaIndicador summary{cursor:pointer;overflow-wrap:anywhere}#listaIndicador article{padding:8px;border-top:1px solid #59637b;margin-top:6px}#listaIndicador p{margin:4px 0}#listaIndicador small{display:block;color:#c0d2e8}#listaIndicador button{margin-top:6px;padding:5px 8px;color:#e8f2ff;background:#2a3c55;border:1px solid #69819b;border-radius:5px}';document.head.append(css);
})();

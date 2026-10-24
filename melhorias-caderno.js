(() => {
    const $=id=>document.getElementById(id);
    const style=document.createElement('style');style.textContent=`
    #atalhosAssunto,#btnExportar,#btnImportar{display:none!important}
    body.ferramentas-recolhidas #sectionEstatisticas,body.ferramentas-recolhidas #sectionPendencias{display:none!important}
    #acoesAssuntoCompactas{display:flex;flex-wrap:wrap;gap:5px;align-items:center}
    #acoesAssuntoCompactas button{font-size:11px;padding:5px 8px;border:1px solid #cbd5e1;border-radius:7px}
    #historicoCaderno{font-size:12px;border:1px solid #cbd5e1;border-radius:8px;padding:8px}
    #historicoCadernoLista{max-height:280px;overflow:auto}#historicoCadernoLista strong{display:block;margin:8px 0}
    #historicoCadernoLista button{display:block;width:100%;text-align:left;padding:6px;overflow-wrap:anywhere;border-bottom:1px solid #cbd5e144}
    .flashcard-item{display:flex;align-items:center;justify-content:space-between;gap:6px}.flashcard-item .flashcard-header{min-width:0;flex:1;display:block}.flashcard-item .flashcard-header .truncate{white-space:normal}.flashcard-item>div:last-child{flex-shrink:0}
    #colaCadernoFlutuante{position:fixed;right:16px;bottom:20px;z-index:25;background:#234d39;color:white;padding:8px 10px;border-radius:9px;font-size:12px}
    #colaCadernoDialog{width:min(92vw,520px);border:1px solid #94a3b8;border-radius:12px;padding:18px}#colaCadernoDialog::backdrop{background:#0007}#colaCadernoDialog textarea{width:100%;border:1px solid #94a3b8;padding:8px;margin:10px 0}
    `;document.head.append(style);
    const a=document.createElement('div');a.id='acoesAssuntoCompactas';$('btnRecolherFerramentas').after(a);
    a.append($('btnPaginaHoje'),$('btnFlashcardErro'));
    const hist=document.createElement('details');hist.id='historicoCaderno';hist.innerHTML='<summary>🕘 Histórico de cadernos e cards</summary><div id="historicoCadernoLista"></div>';$('sectionFlashcards').parentElement.after(hist);
    hist.addEventListener('toggle',()=>window.atualizarHistoricoCaderno?.());
    const lateral=$('painelPastas').parentElement;lateral.id='cadernoLateral';
    const shell=lateral.parentElement;shell.id='cadernoLayout';
    const abrirPainel=document.createElement('button');abrirPainel.id='abrirPainelCaderno';abrirPainel.type='button';abrirPainel.textContent='📂 Painéis';abrirPainel.setAttribute('aria-controls','cadernoLateral');abrirPainel.setAttribute('aria-expanded','true');$('btnRecolherFerramentas').after(abrirPainel);
    function exibirPainel(aberto){lateral.hidden=!aberto;shell.classList.toggle('lateral-oculta',!aberto);abrirPainel.setAttribute('aria-expanded',String(aberto));}
    abrirPainel.onclick=()=>{const abrir=lateral.hidden;if(abrir && document.body.classList.contains('ferramentas-recolhidas'))$('btnRecolherFerramentas').click();exibirPainel(abrir);};
    const fechar=document.createElement('button');fechar.type='button';fechar.className='fechar-paineis';fechar.textContent='Recolher painéis →';fechar.onclick=()=>exibirPainel(false);lateral.prepend(fechar);
    $('btnRecolherFerramentas').addEventListener('click',()=>exibirPainel(!document.body.classList.contains('ferramentas-recolhidas') && window.innerWidth>=768));
    const recolherPastas=document.createElement('button');recolherPastas.type='button';recolherPastas.className='recolher-pastas';recolherPastas.textContent='−';recolherPastas.setAttribute('aria-label','Recolher pastas');recolherPastas.setAttribute('aria-expanded','true');$('navTitulo').after(recolherPastas);
    recolherPastas.onclick=()=>{const lista=$('navLista');lista.hidden=!lista.hidden;recolherPastas.textContent=lista.hidden?'+':'−';recolherPastas.setAttribute('aria-expanded',String(!lista.hidden));recolherPastas.setAttribute('aria-label',lista.hidden?'Abrir pastas':'Recolher pastas');};
    function decorarPastas(){
        const lista=$('navLista');const paginas=!!lista.querySelector('[onclick^="abrirPagina"]');lista.classList.toggle('pastas-quadradas',!paginas);
        if(paginas)return;
        for(const linha of lista.children){
            const nome=linha.querySelector('span[onclick]');if(!nome || linha.dataset.pastaDecorada)continue;
            linha.dataset.pastaDecorada='true';linha.classList.add('pasta-quadrada');
            const botao=document.createElement('button');botao.type='button';botao.className='pasta-abrir';
            const imagem=document.createElement('img');imagem.src='pasta-estudo.svg';imagem.alt='';imagem.width=76;imagem.height=60;
            const texto=document.createElement('span');texto.textContent=nome.textContent.replace(/^[🏛️📚📌\s]+/u,'').trim();botao.title=texto.textContent;botao.setAttribute('aria-label','Abrir pasta '+texto.textContent);botao.append(imagem,texto);botao.onclick=()=>nome.click();nome.replaceWith(botao);
        }
    }
    new MutationObserver(decorarPastas).observe($('navLista'),{childList:true,subtree:true});decorarPastas();
    const layoutStyle=document.createElement('style');layoutStyle.textContent=`
    #cadernoLayout{display:grid;grid-template-columns:minmax(0,1fr) 350px;align-items:start}
    #cadernoLayout.lateral-oculta{grid-template-columns:minmax(0,1fr)}
    #cadernoLateral{min-width:0;position:sticky;top:68px;max-height:calc(100dvh - 82px);overflow-y:auto;width:100%;color:#263b36;background:#fff}
    #cadernoLateral[hidden],#navLista[hidden]{display:none!important}
    #abrirPainelCaderno,.fechar-paineis,.recolher-pastas{font-size:12px;padding:5px 8px;border:1px solid #aabdb5;border-radius:7px;background:#f0f6f3;color:#234d39;cursor:pointer}
    .fechar-paineis{align-self:flex-end;position:sticky;top:0;z-index:2;flex-shrink:0}#navLista.pastas-quadradas{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;max-height:440px;padding:3px}
    #navLista.pastas-quadradas>div{margin:0}
    #navLista .pasta-quadrada{display:flex;flex-direction:column;justify-content:space-between;align-items:stretch;min-height:142px;border:1px solid #d4ddd7;border-radius:10px;background:#f6f8f2;padding:8px}
    #navLista .pasta-abrir{display:flex;flex:1;flex-direction:column;align-items:center;justify-content:center;gap:5px;width:100%;background:transparent;border:0;color:#263d32;cursor:pointer;font-size:12px;font-weight:600;text-align:center}
    #navLista .pasta-abrir span{overflow-wrap:anywhere;line-height:1.35}#navLista .pasta-abrir img{width:70px;height:56px;object-fit:contain}
    #navLista .pasta-quadrada>div{display:flex;justify-content:flex-end;gap:10px;margin-top:6px}
    #cadernoLateral button:focus-visible{outline:2px solid #168057;outline-offset:2px}
    body.dark-mode #cadernoLateral{background:#172a25;color:#e1ede7}body.dark-mode #navLista .pasta-quadrada{background:#213a31;border-color:#526e60}body.dark-mode #navLista .pasta-abrir{color:#ecf5ef}
    body.dark-mode #historicoCadernoLista button,body.dark-mode #historicoCaderno{color:#e1ede7}
    @media(max-width:767px){#cadernoLayout{display:block}#cadernoLateral{position:fixed;right:8px;top:78px;bottom:12px;z-index:30;width:min(92vw,350px);max-height:none;border:1px solid #9bb3a5;box-shadow:0 4px 20px #172a2533}#cadernoLayout.lateral-oculta #cadernoLateral{display:none!important}}
    `;document.head.append(layoutStyle);
    if(window.innerWidth<768)exibirPainel(false);
    // Seções iniciam compactas, mas continuam expansíveis individualmente.
    for(const name of ['Estatisticas','Pendencias']){
        $('section'+name).classList.add('minimized');
        document.querySelector(`[data-section="${name.toLowerCase()}"] .toggle-btn`).textContent='+';
    }
    $('btnRecolherFerramentas').addEventListener('click',()=>{
        if(!document.body.classList.contains('ferramentas-recolhidas'))return;
        for(const name of ['Estatisticas','Pendencias']){
            $('section'+name).classList.add('minimized');document.querySelector(`[data-section="${name.toLowerCase()}"] .toggle-btn`).textContent='+';
        }
    });
    const dialog=document.createElement('dialog');dialog.id='colaCadernoDialog';dialog.innerHTML='<h3>📋 Cola inteligente</h3><p>Cole pergunta e resposta separadas por uma linha em branco (Shift+Enter duas vezes). Revise antes de salvar.</p><textarea rows="8" aria-label="Pergunta e resposta juntas"></textarea><button type="button" id="revisarColaCaderno">Revisar flashcard</button> <button type="button" id="fecharColaCaderno">Cancelar</button>';document.body.append(dialog);
    const b=document.createElement('button');b.id='colaCadernoFlutuante';b.textContent='📋 Cola inteligente';b.onclick=()=>dialog.showModal();document.body.append(b);
    $('fecharColaCaderno').onclick=()=>dialog.close();$('revisarColaCaderno').onclick=()=>{if(window.prepararColaCaderno?.(dialog.querySelector('textarea').value))dialog.close();};
    // Colagem direta no campo da pergunta também separa frente e verso.
    $('inputPergunta').addEventListener('paste',e=>{const t=e.clipboardData.getData('text/plain');if(!/\n[\t ]*\r?\n/.test(t))return;e.preventDefault();const p=t.replace(/\r/g,'').trim().split(/\n[\t ]*\n+/);$('inputPergunta').value=p.shift();$('inputResposta').value=p.join('\n\n');});
})();

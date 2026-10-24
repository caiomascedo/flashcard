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

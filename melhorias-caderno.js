(() => {
    const $=id=>document.getElementById(id);
    const style=document.createElement('style');style.textContent=`
    #atalhosAssunto,#btnExportar,#btnImportar{display:none!important}
    #acoesAssuntoCompactas{position:relative;font-size:12px}#acoesAssuntoCompactas summary{cursor:pointer;list-style:none;padding:5px 8px;border:1px solid #cbd5e1;border-radius:7px}#acoesAssuntoCompactas>div{display:flex;gap:5px;flex-wrap:wrap;margin-top:5px}
    #acoesAssuntoCompactas:not([open])>div{display:none}
    #acoesAssuntoCompactas button{font-size:11px;padding:5px 8px;border:1px solid #cbd5e1;border-radius:7px}
    #ocultarTodasPendencias,#mostrarPendenciasOcultas{font:12px system-ui;padding:5px 7px;border:1px solid #bc9c57;border-radius:6px;background:#fff9e5;color:#6c4a0b;cursor:pointer}#mostrarPendenciasOcultas[hidden]{display:none!important}.pendencia-item{display:flex;align-items:center;gap:6px;flex-wrap:wrap}.pendencia-item>span:first-child{flex:1;min-width:100px}.pendencia-acoes{display:flex;gap:5px;flex-wrap:wrap}.pendencia-acoes button{font:11px system-ui;padding:5px 7px;border:1px solid #c7ad76;border-radius:5px;cursor:pointer}.toggle-btn{min-width:32px;min-height:32px;background:transparent;border:0;cursor:pointer;touch-action:manipulation}
    #historicoCaderno{font-size:12px;border:1px solid #cbd5e1;border-radius:8px;padding:8px}
    #historicoCadernoLista{max-height:280px;overflow:auto}#historicoCadernoLista strong{display:block;margin:8px 0}
    #historicoCadernoLista button{display:block;width:100%;text-align:left;padding:6px;overflow-wrap:anywhere;border-bottom:1px solid #cbd5e144}
    .flashcard-item{display:flex;align-items:center;justify-content:space-between;gap:6px}.flashcard-item .flashcard-header{min-width:0;flex:1;display:block}.flashcard-item .flashcard-header .truncate{white-space:normal}.flashcard-item>div:last-child{flex-shrink:0}
    #colaCadernoFlutuante{position:fixed;right:16px;bottom:20px;z-index:25;background:#234d39;color:white;padding:8px 10px;border-radius:9px;font-size:12px}
    #colaCadernoDialog{width:min(92vw,520px);border:1px solid #94a3b8;border-radius:12px;padding:18px}#colaCadernoDialog::backdrop{background:#0007}#colaCadernoDialog textarea{width:100%;border:1px solid #94a3b8;padding:8px;margin:10px 0}
    `;document.head.append(style);
    const a=document.createElement('details');a.id='acoesAssuntoCompactas';a.innerHTML='<summary>📅 Ações do assunto</summary><div></div>';$('btnRecolherFerramentas').after(a);
    a.lastElementChild.append($('btnPaginaHoje'),$('btnFlashcardErro'));
    const hist=document.createElement('details');hist.id='historicoCaderno';hist.innerHTML='<summary>🕘 Histórico de cadernos e cards</summary><div id="historicoCadernoLista"></div>';$('sectionEstatisticas').parentElement.after(hist);
    hist.addEventListener('toggle',()=>window.atualizarHistoricoCaderno?.());
    const lateral=$('painelPastas').parentElement;lateral.id='cadernoLateral';
    const shell=lateral.parentElement;shell.id='cadernoLayout';
    const abrirPainel=document.createElement('button');abrirPainel.id='abrirPainelCaderno';abrirPainel.type='button';abrirPainel.textContent='📂 Painéis';abrirPainel.setAttribute('aria-controls','cadernoLateral');abrirPainel.setAttribute('aria-expanded','true');$('btnRecolherFerramentas').after(abrirPainel);
    function exibirPainel(aberto){lateral.hidden=!aberto;shell.classList.toggle('lateral-oculta',!aberto);abrirPainel.setAttribute('aria-expanded',String(aberto));}
    abrirPainel.onclick=()=>exibirPainel(lateral.hidden);
    const fechar=document.createElement('button');fechar.type='button';fechar.className='fechar-paineis';fechar.textContent='Recolher painéis →';fechar.onclick=()=>exibirPainel(false);lateral.prepend(fechar);
    $('btnRecolherFerramentas').addEventListener('click',()=>exibirPainel(!document.body.classList.contains('ferramentas-recolhidas') && window.innerWidth>=768));
    const recolherPastas=document.createElement('button');recolherPastas.type='button';recolherPastas.className='recolher-pastas';recolherPastas.textContent='−';recolherPastas.setAttribute('aria-label','Recolher pastas');recolherPastas.setAttribute('aria-expanded','true');recolherPastas.setAttribute('aria-controls','navLista');$('navTitulo').after(recolherPastas);
    recolherPastas.onclick=()=>{const lista=$('navLista');lista.hidden=!lista.hidden;recolherPastas.textContent=lista.hidden?'+':'−';recolherPastas.setAttribute('aria-expanded',String(!lista.hidden));recolherPastas.setAttribute('aria-label',lista.hidden?'Abrir pastas':'Recolher pastas');};
    function decorarPastas(){
        const lista=$('navLista');const paginas=!!lista.querySelector('[onclick^="abrirPagina"]');lista.classList.toggle('pastas-quadradas',!paginas);
        if(paginas)return;
        for(const linha of lista.children){
            const nome=linha.querySelector('span[onclick]');if(!nome || linha.dataset.pastaDecorada)continue;
            linha.dataset.pastaDecorada='true';linha.classList.add('pasta-quadrada');
            const botao=document.createElement('button');botao.type='button';botao.className='pasta-abrir';
            const imagem=document.createElement('img');imagem.src='pasta-estudo.svg';imagem.alt='';imagem.width=76;imagem.height=60;
            const texto=document.createElement('span');texto.textContent=nome.textContent.replace(/^[🏛️📚📌\s]+/u,'').trim();botao.title=texto.textContent;botao.setAttribute('aria-label','Abrir pasta '+texto.textContent);botao.append(imagem,texto);const acao=nome.getAttribute('onclick').match(/^(abrirConcurso|abrirMateria|abrirAssunto)\((\d+)\)$/);botao.onclick=()=>{if(acao)window[acao[1]](Number(acao[2]));};nome.replaceWith(botao);
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
        document.querySelector(`[data-section="${name.toLowerCase()}"] .toggle-btn`).textContent='+';document.querySelector(`[data-section="${name.toLowerCase()}"] .toggle-btn`).setAttribute('aria-expanded','false');
    }
    $('btnRecolherFerramentas').addEventListener('click',()=>{
        if(!document.body.classList.contains('ferramentas-recolhidas'))return;
        for(const name of ['Estatisticas','Pendencias']){
            $('section'+name).classList.add('minimized');document.querySelector(`[data-section="${name.toLowerCase()}"] .toggle-btn`).textContent='+';document.querySelector(`[data-section="${name.toLowerCase()}"] .toggle-btn`).setAttribute('aria-expanded','false');
        }
    });
    const dialog=document.createElement('dialog');dialog.id='colaCadernoDialog';dialog.innerHTML='<h3>📋 Cola inteligente</h3><p>Cole pergunta e resposta separadas por uma linha em branco (Shift+Enter duas vezes). Revise antes de salvar.</p><textarea rows="8" aria-label="Pergunta e resposta juntas"></textarea><button type="button" id="revisarColaCaderno">Revisar flashcard</button> <button type="button" id="fecharColaCaderno">Cancelar</button>';document.body.append(dialog);
    function fecharAoClicarFora(modal){let inicioFora=false;const fora=e=>{const r=modal.getBoundingClientRect();return e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom;};modal.addEventListener('pointerdown',e=>{inicioFora=e.target===modal&&fora(e);});modal.addEventListener('click',e=>{if(inicioFora&&e.target===modal&&fora(e))modal.close();inicioFora=false;});}
    fecharAoClicarFora(dialog);
    const aviso=document.createElement('section');aviso.id='avisoEditorCaderno';aviso.hidden=true;aviso.innerHTML='<p role="status"></p><button type="button" id="criarFaltanteCaderno">Cadastrar automaticamente</button> <button type="button" id="editarDestinoCaderno">Editar / escolher assunto</button>';$('editor').before(aviso);
    const cadastro=document.createElement('dialog');cadastro.id='cadastroCadernoDialog';cadastro.innerHTML='<form><h3>Preparar espaço para escrever</h3><p>Revise o destino. Pastas existentes serão reutilizadas.</p><label>Concurso<input name="concurso" required></label><label>Matéria<input name="materia" required></label><label>Assunto<input name="assunto" required></label><p role="status" id="erroCadastroCaderno"></p><button type="submit">Cadastrar o que falta e escrever</button> <button type="button" id="cancelarCadastroCaderno">Cancelar</button></form>';document.body.append(cadastro);fecharAoClicarFora(cadastro);
    function estadoEditor(){return window.estadoEditorCaderno?.();}
    function atualizarAviso(){const s=estadoEditor();if(!s)return;aviso.hidden=s.editavel;aviso.querySelector('p').textContent=s.sincronizado?`Para escrever, falta ${s.faltando.join(', ')}. Você pode cadastrar o que falta ou escolher outro destino.`:'Aguarde a sincronização do caderno para escrever.';$('criarFaltanteCaderno').disabled=!s.sincronizado;$('editarDestinoCaderno').disabled=!s.sincronizado;}
    function abrirCadastro(){const s=estadoEditor();if(!s?.sincronizado)return;for(const key of ['concurso','materia','assunto'])cadastro.querySelector(`[name="${key}"]`).value=s[key]||'';$('erroCadastroCaderno').textContent='';cadastro.showModal();}
    $('criarFaltanteCaderno').onclick=()=>{const s=estadoEditor();if(s?.concurso&&s.materia&&s.assunto){window.prepararEscritaCaderno(s);atualizarAviso();}else abrirCadastro();};
    $('editarDestinoCaderno').onclick=abrirCadastro;$('cancelarCadastroCaderno').onclick=()=>cadastro.close();
    cadastro.querySelector('form').onsubmit=e=>{e.preventDefault();try{const destino={};for(const key of ['concurso','materia','assunto'])destino[key]=cadastro.querySelector(`[name="${key}"]`).value.trim();window.prepararEscritaCaderno(destino);cadastro.close();atualizarAviso();}catch(err){$('erroCadastroCaderno').textContent=err.message;}};
    $('editor').addEventListener('click',()=>{if(estadoEditor()?.editavel)return;atualizarAviso();aviso.scrollIntoView({block:'nearest'});});
    new MutationObserver(atualizarAviso).observe($('editor'),{attributes:true,attributeFilter:['contenteditable']});window.addEventListener('caderno:pronto-local',atualizarAviso);atualizarAviso();
    const ajudaStyle=document.createElement('style');ajudaStyle.textContent='#avisoEditorCaderno{padding:12px;margin:8px 0;border:1px solid #a5bcae;border-radius:9px;background:#edf6ee;color:#214333;font-size:13px}#avisoEditorCaderno[hidden]{display:none}#avisoEditorCaderno button,#cadastroCadernoDialog button{padding:7px 10px;margin:5px 0;border:1px solid #829c8c;border-radius:7px;background:#fff;color:#214333;cursor:pointer}#cadastroCadernoDialog{width:min(92vw,460px);border:1px solid #94a3b8;border-radius:12px;padding:18px}#cadastroCadernoDialog::backdrop{background:#0007}#cadastroCadernoDialog label{display:block;margin:10px 0}#cadastroCadernoDialog input{display:block;width:100%;border:1px solid #94a3b8;border-radius:5px;padding:7px}#erroCadastroCaderno{color:#a71d31}';document.head.append(ajudaStyle);
    const b=document.createElement('button');b.id='colaCadernoFlutuante';b.textContent='📋 Cola inteligente';b.onclick=()=>dialog.showModal();document.body.append(b);
    $('fecharColaCaderno').onclick=()=>dialog.close();$('revisarColaCaderno').onclick=()=>{if(window.prepararColaCaderno?.(dialog.querySelector('textarea').value))dialog.close();};
    // Colagem direta no campo da pergunta também separa frente e verso.
    $('inputPergunta').addEventListener('paste',e=>{const t=e.clipboardData.getData('text/plain');if(!/\n[\t ]*\r?\n/.test(t))return;e.preventDefault();const p=t.replace(/\r/g,'').trim().split(/\n[\t ]*\n+/);$('inputPergunta').value=p.shift();$('inputResposta').value=p.join('\n\n');});
})();

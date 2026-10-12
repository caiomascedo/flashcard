import json
from playwright.sync_api import sync_playwright
from test_caderno_integrado import MOCK, server


def test_latest_import_and_copy_errors(server):
 with sync_playwright() as pw:
  browser=pw.chromium.launch()
  page=browser.new_page()
  errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.route('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@*/dist/umd/supabase.min.js',lambda route:route.fulfill(content_type='application/javascript',body=MOCK))
  page.route('https://i.postimg.cc/**',lambda route:route.abort())
  page.add_init_script("Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>{window.__copiado=text}}})")
  page.goto(server)
  page.wait_for_function('typeof adicionarDados==="function" && !!getCardAtual()')
  def import_batch(prefix,count):
   cards=[{'concurso':'PMPI','materia':'Teste','assunto':prefix,'pergunta':f'{prefix} pergunta {i}','resposta':f'Resposta {i}'} for i in range(count)]
   page.locator('#jsonInput').set_input_files({'name':f'{prefix}.json','mimeType':'application/json','buffer':json.dumps(cards).encode()})
   page.wait_for_function(f"indicesDoLote(ultimoLoteImportado()).length==={count} && flashcards.at(-1).assunto==='{prefix}'")
  import_batch('Antigo',20)
  old_lote=page.evaluate('ultimoLoteImportado()')
  import_batch('Novo',50)
  assert page.evaluate('ultimoLoteImportado()')!=old_lote
  assert page.locator('#novoLoteResumo').inner_text()=='🆕 50 novos importados'
  page.get_by_role('button',name='▶ Iniciar novos',exact=True).click()
  assert page.evaluate('indicesFiltrados.length')==50
  assert page.locator('#flashcard').evaluate("el=>el.classList.contains('card-novo')")
  assert page.locator('#pergunta').inner_text()=='Novo pergunta 0'
  page.evaluate("statusCard[indicesFiltrados[0]]='errou';statusCard[indicesFiltrados[3]]='errou';statusCard[flashcards.findIndex(c=>c.assunto==='Antigo')]='errou';salvarEstado()")
  page.evaluate('alternarModoFoco()')
  page.get_by_role('button',name='📋 Copiar errados',exact=True).click()
  page.wait_for_function('!!window.__copiado')
  report=json.loads(page.evaluate('__copiado'))
  assert report['total']==2
  assert {c['pergunta'] for c in report['flashcards']}=={'Novo pergunta 0','Novo pergunta 3'}
  assert all(c['respostaCadastrada'] and c['resultado']=='errou' for c in report['flashcards'])
  page.evaluate('alternarModoFoco()')
  # A narrower search must copy only its mistakes, never the old batch's errors.
  page.locator('#searchInput').fill('Novo pergunta 3')
  page.locator('#searchInput').press('Enter')
  page.get_by_role('button',name='📋 Copiar errados',exact=True).click()
  page.wait_for_function('JSON.parse(window.__copiado).total===1')
  assert json.loads(page.evaluate('__copiado'))['flashcards'][0]['pergunta']=='Novo pergunta 3'
  page.reload()
  page.wait_for_function('indicesDoLote(ultimoLoteImportado()).length===50')
  page.get_by_role('button',name='▶ Iniciar novos',exact=True).click()
  assert page.evaluate('indicesFiltrados.length')==50
  assert page.evaluate("statusCard[indicesFiltrados[0]]==='errou'")
  # Duplicate-only uploads must keep the last successful batch.
  same_lote=page.evaluate('ultimoLoteImportado()')
  import_batch('Novo',50)
  assert page.evaluate('ultimoLoteImportado()')==same_lote
  # Safari can deny clipboard access; leave a selectable copy instead.
  page.evaluate("navigator.clipboard.writeText=async()=>{throw Error('bloqueado')};document.execCommand=()=>false")
  page.get_by_role('button',name='📋 Copiar errados',exact=True).click()
  page.locator('#copiaRapidaErrados').wait_for()
  assert json.loads(page.locator('#copiaRapidaErrados').input_value())['total']==2
  page.evaluate('fecharModal()')
  # Complete and reopen the batch from the existing completed magnifier list.
  page.evaluate("indicesFiltrados.forEach(i=>statusCard[i]='acertou');verificarConclusaoFiltro();salvarEstado()")
  page.evaluate('limparFiltro()')
  page.evaluate("abrirFiltroConcluido('lote:'+ultimoLoteImportado())")
  assert page.evaluate('indicesFiltrados.length')==50
  assert not errors,errors
  browser.close()

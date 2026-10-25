import json
import pytest
from playwright.sync_api import sync_playwright,expect
from test_menu_paineis import NOTEBOOK
from test_caderno_integrado import MOCK,server

@pytest.mark.parametrize('engine',['chromium','webkit'])
def test_calendar_and_paste(server,engine):
 with sync_playwright() as p:
  browser=getattr(p,engine).launch();page=browser.new_page(timezone_id="America/Fortaleza",viewport={"width":390,"height":844});page.set_default_timeout(8000)
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.route('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@*/dist/umd/supabase.min.js',lambda r:r.fulfill(body=MOCK,content_type='application/javascript'))
  page.route('https://i.postimg.cc/**',lambda r:r.abort())
  page.add_init_script('window.__notebook='+json.dumps(NOTEBOOK)+";const yesterday=new Date();yesterday.setDate(yesterday.getDate()-1);window.__notebook.dados.flashcards[0].ultima_revisao=yesterday.toISOString();");page.goto(server)
  page.get_by_role('button',name='📅 Calendário',exact=True).click()
  expect(page.locator('#calendarioRevisoes')).to_be_visible()
  expect(page.locator('[data-tasks]')).to_contain_text('Responder cards')
  before=page.evaluate('explorerOpen')
  page.keyboard.press('Escape')
  expect(page.locator('#calendarioRevisoes')).to_be_hidden()
  assert page.evaluate('explorerOpen')==before
  page.get_by_role('button',name='📓 Caderno completo',exact=True).click()
  frame=page.frame_locator('#cadernoIntegradoFrame');frame.locator('#editor').fill('Anotação editada hoje')
  page.wait_for_function('!!JSON.parse(localStorage.dados_concursos).cadernosTrabalhadosDia')
  frame.locator('#btnCronograma').click()
  expect(frame.locator('#calendarioRevisoes')).to_be_visible()
  expect(frame.locator('[data-tasks]')).to_contain_text('Português')
  frame.locator('#calendarioRevisoes [data-tasks] input[type=checkbox]').first.check()
  assert page.evaluate('Object.keys(JSON.parse(localStorage.dados_concursos).calendarioMarcacoes).length')==1
  frame.locator('#calendarioRevisoes [data-close]').click()
  frame.locator('#responderCardsCaderno').click()
  expect(page.locator('#cadernoIntegradoDialog')).not_to_have_attribute('open','')
  expect(page.locator('#limparFiltroBtn')).to_be_visible()
  assert page.evaluate('indicesFiltrados.length')==1
  page.get_by_role('button',name='📓 Caderno completo',exact=True).click()
  frame.locator('#colaCadernoFlutuante').click()
  frame.locator('#colaCadernoDialog textarea').fill('Q4221348 Portugués > Interpretacao de Textos , Nocdes Gerais de Compreensao e Interpretagao de Texto\nQual a ideia central?\n\nA ideia principal.')
  frame.locator('#revisarColaCaderno').click()
  expect(frame.locator('#inputPergunta')).to_have_value('Qual a ideia central?')
  expect(frame.locator('#inputResposta')).to_have_value('A ideia principal.')
  page.once('dialog',lambda d:d.dismiss());frame.locator('#modalSalvar').click()
  data=page.evaluate('JSON.parse(localStorage.dados_concursos)')
  card=next(c for c in data['flashcards'] if c['pergunta']=='Qual a ideia central?')
  assert card['enviarFlashcard'] is False
  assert frame.locator('#historicoHoje').count()==1
  assert frame.locator('#historicoOntem').count()==1
  assert 'Qual a ideia central?' in frame.locator('#historicoHoje').text_content()
  subject=next(a for c in data['concursos'] for m in c['materias'] for a in m['assuntos'] if a['id']==card['assuntoId'])
  assert 'Interpretação' in subject['nome'] and len(subject['paginas'])==1
  # Opted-out drafts never leak into the main Flashcard list.
  assert not page.evaluate("flashcards.some(c=>c.pergunta==='Qual a ideia central?')")
  frame.locator('#colaCadernoFlutuante').click()
  frame.locator('#colaCadernoDialog textarea').fill('Q4221348 Português > Outro assunto\nPergunta enviada\n\nResposta enviada')
  frame.locator('#revisarColaCaderno').click()
  page.once('dialog',lambda d:d.accept());frame.locator('#modalSalvar').click()
  page.wait_for_function("flashcards.some(c=>c.pergunta==='Pergunta enviada')")
  assert page.evaluate("obterHistoricoEstudo().some(e=>e.lote===flashcards.find(c=>c.pergunta==='Pergunta enviada').loteImportacao)")
  page.locator('#cadernoIntegradoFechar').click()
  page.evaluate("const i=flashcards.findIndex(c=>c.cadernoId==='101');filtroAtivo={tipo:'lista',nome:'Teste'};indicesFiltrados=[i];indiceAtual=i;modoRevisao=false;modoFilaErros=false;atualizarCard()")
  page.get_by_role('button',name='✅ Acertou',exact=True).click()
  assert page.evaluate("JSON.parse(localStorage.dados_concursos).flashcards.find(c=>c.id===101).ultima_revisao")
  assert page.evaluate("Object.keys(JSON.parse(localStorage.dados_concursos).revisoesCalendario).filter(k=>k.endsWith('|101')).length")>=2
  assert page.evaluate("Object.keys(JSON.parse(localStorage.flashcards_estado).revisoesCalendario).length")>=1
  page.once('dialog',lambda d:d.accept());page.evaluate('limparMarcacoesSelecao()')
  assert page.evaluate('statusCard[indicesFiltrados[0]]')=='nao'
  page.get_by_role('button',name='📅 Calendário',exact=True).click()
  expect(page.locator('#calendarioRevisoes .today.pending')).to_be_visible()
  text=page.locator('#calendarioRevisoes [data-all]').inner_text()
  import re
  expected=int(re.search(r'\((\d+)\)',text).group(1))
  page.locator('#calendarioRevisoes [data-today]').click()
  expect(page.locator('#calendarioRevisoes')).to_be_hidden()
  assert page.evaluate('indicesFiltrados.length')==expected
  page.evaluate('for(const i of [...indicesFiltrados]){indiceAtual=i;modoRevisao=false;modoFilaErros=false;marcarAcertou()}')
  page.get_by_role('button',name='📅 Calendário',exact=True).click()
  expect(page.locator('#calendarioRevisoes .today.finished')).to_be_visible()
  assert not errors,errors
  browser.close()

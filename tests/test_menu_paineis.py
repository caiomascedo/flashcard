"""Menu e painéis: Chromium e WebKit, com dados isolados e nuvem simulada."""
import json
import pytest
from playwright.sync_api import sync_playwright, expect
from test_caderno_integrado import MOCK, server

NOTEBOOK = {'dados': {'concursos': [{'id':1,'nome':'PMPI','materiaAtualId':11,'materias':[
 {'id':11,'nome':'Português','assuntoAtualId':111,'assuntos':[{'id':111,'nome':'Concordância','paginaAtualId':1111,'paginas':[{'id':1111,'titulo':'Notas','data':'2026-10-24T10:00:00Z','cadernoHTML':'<p>Anotação preservada.</p>'}]}]},
 {'id':12,'nome':'Legislação','assuntoAtualId':121,'assuntos':[{'id':121,'nome':'Lei','paginaAtualId':1211,'paginas':[{'id':1211,'titulo':'Outra nota','data':'2026-10-24T10:00:00Z','cadernoHTML':'<p>Outra anotação.</p>'}]}]}
]}], 'flashcards': [
 {'id':101,'concursoId':1,'materiaId':11,'assuntoId':111,'pergunta':'Primeira pergunta','resposta':'Resposta um','tags':[],'intervalo':0,'repeticoes':0,'facilidade':2.5,'proxima_revisao':'2000-01-01T00:00:00Z'},
 {'id':102,'concursoId':1,'materiaId':12,'assuntoId':121,'pergunta':'Segunda pergunta','resposta':'Resposta dois','tags':[],'intervalo':0,'repeticoes':0,'facilidade':2.5,'proxima_revisao':'2000-01-01T00:00:00Z'}
]},'cronograma':[],'updated_at':'2026-10-24T12:00:00Z'}

@pytest.mark.parametrize('engine,width',[('chromium',390),('webkit',390),('chromium',1280),('webkit',1280)])
def test_menu_and_notebook_panels(server,engine,width):
 with sync_playwright() as p:
  browser=getattr(p,engine).launch()
  page=browser.new_page(viewport={'width':width,'height':844},is_mobile=width<768,has_touch=width<768)
  page.set_default_timeout(8000)
  errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.route('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@*/dist/umd/supabase.min.js',lambda r:r.fulfill(content_type='application/javascript',body=MOCK))
  page.route('https://i.postimg.cc/**',lambda r:r.abort())
  page.add_init_script('window.__notebook='+json.dumps(NOTEBOOK))
  page.goto(server)
  page.wait_for_function('!!window.FlashcardCaderno?.pronto')
  # Existing handlers and IDs stay intact when placed in the top menu.
  menu=page.locator('#menuFlashcard')
  assert not menu.evaluate('(el)=>el.open')
  menu.locator('summary').click()
  for name in ['↩️ Desfazer','📌 Modelos','📝 Questões','🛟 Backups','📤 Exportar JSON','🗑️ Apagar tudo','Sair']:
   expect(menu.get_by_role('button',name=name,exact=True)).to_be_visible()
  expect(menu.locator('#filtrosConcluidosBtn')).to_be_visible()
  assert menu.locator('#logoutButton').evaluate("el=>getComputedStyle(el).position")=='static'
  menu.get_by_role('button',name='📌 Modelos',exact=True).click()
  assert not menu.evaluate('(el)=>el.open')
  expect(page.locator('#modalOverlay')).to_have_class('modal-overlay active')
  page.evaluate('fecharModal()')
  menu.locator('summary').click()
  page.keyboard.press('Escape')
  assert not menu.evaluate('(el)=>el.open')
  # Folder expand/collapse is a native button, including on touch WebKit.
  page.evaluate('if(innerWidth<=900)toggleExplorer()')
  toggle=page.locator('#treeContainer .toggle-icon').first
  if width<768: toggle.tap()
  else: toggle.click()
  expect(toggle).to_have_attribute('aria-expanded','false')
  if width<768: toggle.tap()
  else: toggle.click()
  expect(toggle).to_have_attribute('aria-expanded','true')
  page.evaluate("document.getElementById('explorerPanel').classList.remove('open');document.getElementById('explorerOverlay').classList.remove('active')")
  page.get_by_role('button',name='📓 Caderno completo',exact=True).click()
  frame=page.frame_locator('#cadernoIntegradoFrame')
  frame.locator('#acoesAssuntoCompactas').wait_for()
  assert not frame.locator('#acoesAssuntoCompactas').evaluate('(el)=>el.open')
  expect(frame.locator('#btnPaginaHoje')).to_be_hidden()
  expect(frame.get_by_text('📸 Toque na imagem',exact=False)).to_have_count(0)
  frame.locator('#acoesAssuntoCompactas>summary').click()
  expect(frame.locator('#btnPaginaHoje')).to_be_visible()
  frame.locator('#acoesAssuntoCompactas>summary').click()
  assert frame.locator('#historicoCaderno').evaluate("el=>document.getElementById('sectionEstatisticas').parentElement.nextElementSibling===el")
  # Global tool minimization must not lock individual section controls.
  frame.locator('#btnRecolherFerramentas').click()
  frame.locator('#abrirPainelCaderno').click()
  assert frame.locator('body').evaluate("el=>el.classList.contains('ferramentas-recolhidas')")
  stat=frame.locator('.toggle-btn[data-section="estatisticas"]')
  stat.tap() if width<768 else stat.click()
  expect(frame.locator('#sectionEstatisticas')).to_be_visible()
  expect(stat).to_have_attribute('aria-expanded','true')
  stat.tap() if width<768 else stat.click()
  expect(frame.locator('#sectionEstatisticas')).to_be_hidden()
  frame.locator('.toggle-btn[data-section="pendencias"]').click()
  expect(frame.locator('#sectionPendencias')).to_be_visible()
  expect(frame.locator('.pendencia-item')).to_have_count(2)
  page.once('dialog',lambda dialog:dialog.dismiss())
  frame.get_by_role('button',name='Ocultar',exact=True).first.click()
  expect(frame.locator('.pendencia-item')).to_have_count(2)
  page.once('dialog',lambda dialog:dialog.accept())
  frame.get_by_role('button',name='Ocultar',exact=True).first.click()
  expect(frame.locator('.pendencia-item')).to_have_count(1)
  assert page.evaluate('JSON.parse(localStorage.dados_concursos).flashcards.length')==2
  frame.locator('#mostrarPendenciasOcultas').click()
  expect(frame.locator('.pendencia-item')).to_have_count(2)
  page.once('dialog',lambda dialog:dialog.accept())
  frame.locator('#ocultarTodasPendencias').click()
  expect(frame.locator('#pendenciasContainer')).to_be_hidden()
  expect(frame.locator('#mostrarPendenciasOcultas')).to_be_visible()
  # Preferences survive reload, while cards and notes remain untouched.
  page.reload()
  page.get_by_role('button',name='📓 Caderno completo',exact=True).click()
  frame.locator('#acoesAssuntoCompactas').wait_for()
  if not frame.locator('#cadernoLateral').is_visible(): frame.locator('#abrirPainelCaderno').click()
  expect(frame.locator('#pendenciasContainer')).to_be_hidden()
  frame.locator('#mostrarPendenciasOcultas').click()
  frame.locator('.toggle-btn[data-section="pendencias"]').click()
  expect(frame.locator('.pendencia-item')).to_have_count(2)
  folders=frame.locator('.recolher-pastas')
  (folders.tap() if width<768 else folders.click()); expect(frame.locator('#navLista')).to_be_hidden()
  (folders.tap() if width<768 else folders.click()); expect(frame.locator('#navLista')).to_be_visible()
  frame.locator('.pasta-abrir').first.click()
  expect(frame.locator('#navTitulo')).to_have_text('📚 Matérias')
  frame.locator('.pasta-abrir').first.click()
  expect(frame.locator('#navTitulo')).to_have_text('📌 Assuntos')
  frame.locator('.pasta-abrir').first.click()
  expect(frame.locator('#navTitulo')).to_have_text('📅 Páginas de Estudo')
  frame.get_by_role('button',name='📖 Estudar',exact=True).first.click()
  assert page.evaluate('JSON.parse(localStorage.dados_concursos).concursos[0].materiaAtualId')==11
  saved=page.evaluate('JSON.parse(localStorage.dados_concursos)')
  assert saved['concursos'][0]['materias'][0]['assuntos'][0]['paginas'][0]['cadernoHTML']=='<p>Anotação preservada.</p>'
  assert len(saved['flashcards'])==2
  # Dismiss the mobile drawer by tapping elsewhere, then study by subject.
  if width<768:
   frame.locator('h1').tap()
   expect(frame.locator('#cadernoLateral')).to_be_hidden()
   frame.locator('#abrirPainelCaderno').click()
  frame.locator('#btnCronograma').click()
  frame.get_by_role('checkbox',name='Responder os cards pelo Flashcard',exact=True).uncheck()
  frame.locator('#calendarioRevisoes [data-close]').click()
  if not frame.locator('#cadernoLateral').is_visible(): frame.locator('#abrirPainelCaderno').click()
  frame.locator('#historicoCaderno>summary').click()
  frame.locator('#historicoCadernoLista>details>summary').first.click()
  frame.locator('#historicoCadernoLista>details>details>summary').first.click()
  frame.get_by_text('🎴 Ver perguntas',exact=True).first.click()
  frame.get_by_text('📅 Anteriores',exact=True).first.click()
  frame.get_by_role('button',name='Primeira pergunta',exact=True).click()
  expect(frame.locator('#estudoConteudo')).to_contain_text('Primeira pergunta')
  frame.locator('#fecharEstudo').click()
  frame.locator('#abrirPainelCaderno').click()
  frame.get_by_role('button',name='▶ Responder cards deste assunto',exact=True).first.click()
  expect(frame.locator('#cadernoLateral')).to_be_hidden()
  expect(frame.locator('#modalEstudo')).to_be_visible()
  expect(frame.locator('#estudoConteudo')).to_contain_text('Primeira pergunta')
  expect(frame.locator('#estudoConteudo')).not_to_contain_text('Segunda pergunta')
  frame.locator('#estudoInner').click()
  frame.get_by_role('button',name='🟠 Médio',exact=True).click()
  page.wait_for_function("JSON.parse(localStorage.dados_concursos).flashcards[0].ultima_revisao")
  assert not page.evaluate('JSON.parse(localStorage.dados_concursos).flashcards[1].ultima_revisao || null')
  assert not errors,errors
  browser.close()

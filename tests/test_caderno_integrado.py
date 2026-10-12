"""Browser regression checks. Run with pytest; requires Playwright Chromium.
Supabase is simulated: these checks never read or change an actual user's data.
"""
import functools
import http.server
import threading
from pathlib import Path
import pytest
from playwright.sync_api import sync_playwright

MOCK = r'''
window.__cloudWrites = [];
window.supabase = {createClient() {
 const user = {id:'test-user',email:'teste@example.com'};
 return {
  auth: {
   async getSession() {return {data:{session:{user}}};},
   async getUser() {return {data:{user}};},
   onAuthStateChange(callback) {setTimeout(()=>callback('INITIAL_SESSION',{user}),0);return {data:{subscription:{unsubscribe(){}}}};}
  },
  from(table) {
   const result={data:table==='cadernos'?window.__notebook:null,error:null};
   const chain=new Proxy({}, {get(target,key) {
    if(key==='then') return Promise.resolve(result).then.bind(Promise.resolve(result));
    return (...args)=>{if(key==='upsert') window.__cloudWrites.push({table,value:args[0]}); return chain;};
   }});
   return chain;
  },
  channel() {const c={on(){return c;},subscribe(){return c;}};return c;},
  async rpc(){return {data:null,error:null};}
 };
}};
'''

@pytest.fixture(scope='module')
def server():
 handler=functools.partial(http.server.SimpleHTTPRequestHandler,directory=str(Path(__file__).resolve().parents[1]))
 server=http.server.ThreadingHTTPServer(('127.0.0.1',0),handler)
 threading.Thread(target=server.serve_forever,daemon=True).start()
 yield f'http://127.0.0.1:{server.server_port}'
 server.shutdown()

@pytest.mark.parametrize('width',[1280,390])
def test_notebook_in_flashcards(server,width):
 with sync_playwright() as pw:
  browser=pw.chromium.launch()
  page=browser.new_page(viewport={'width':width,'height':844})
  errors=[]
  page.on('pageerror',lambda error:errors.append(str(error)))
  page.route('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@*/dist/umd/supabase.min.js',lambda route:route.fulfill(body=MOCK,content_type='application/javascript'))
  page.route('https://cdn.tailwindcss.com/**',lambda route:route.fulfill(body='',content_type='application/javascript'))
  page.route('https://cdnjs.cloudflare.com/**',lambda route:route.fulfill(body='',content_type='application/javascript'))
  page.route('https://i.postimg.cc/**',lambda route:route.abort())
  # Cloud hydration must precede an imported card, preserving older notes.
  page.add_init_script('''window.__notebook={dados:{concursos:[{id:9,nome:'Anterior',materias:[{id:91,nome:'Matéria',assuntos:[{id:911,nome:'Assunto',paginas:[{id:9111,titulo:'Notas',cadernoHTML:'<p>Nota anterior da nuvem</p>'}]}]}]}],flashcards:[]},cronograma:[],updated_at:'2026-10-11T00:00:00Z'}''')
  notebook_requests=[]
  heavy_requests=[]
  page.on('request',lambda request:notebook_requests.append(request.url) if '/caderno.html?' in request.url else None)
  page.on('request',lambda request:heavy_requests.append(request.url) if 'html2pdf' in request.url or 'cropperjs' in request.url or 'cdn.tailwindcss' in request.url else None)
  page.goto(server)
  page.wait_for_function('typeof getCardAtual === "function" && !!getCardAtual()')
  # It must be ready before the first click, without fetching export/crop libraries.
  page.wait_for_function("document.getElementById('cadernoIntegradoFrame').src.includes('caderno.html') && !document.getElementById('cadernoIntegradoFrame').hidden")
  assert not page.locator('#cadernoIntegradoDialog').evaluate('(dialog)=>dialog.open')
  assert len(notebook_requests)==1
  assert not heavy_requests
  page.get_by_role('button',name='📓 Anotar no Caderno (C)',exact=True).click()
  frame=page.frame_locator('#cadernoIntegradoFrame')
  frame.locator('.flashcard-importado').wait_for()
  assert len(page.context.pages)==1
  assert frame.locator('.flashcard-importado').count()==1
  assert page.evaluate("JSON.parse(localStorage.dados_concursos).concursos.some(c=>c.nome==='Anterior')")
  frame.locator('#editor').evaluate("editor=>{editor.innerHTML+='<p>Minha anotação persistente</p>';editor.dispatchEvent(new Event('input',{bubbles:true}));}")
  page.get_by_role('button',name='← Flashcards').click()
  page.get_by_role('button',name='📓 Anotar no Caderno (C)',exact=True).click()
  frame.locator('.flashcard-importado').wait_for()
  assert frame.locator('.flashcard-importado').count()==1
  assert 'Minha anotação persistente' in frame.locator('#editor').inner_text()
  page.wait_for_function("__cloudWrites.some(w=>w.table==='cadernos' && JSON.stringify(w.value).includes('Minha anotação persistente'))")
  # Original navigation returns inside the same application.
  frame.get_by_role('button',name='🧠 Flashcard',exact=True).first.click()
  page.wait_for_function("!document.getElementById('cadernoIntegradoDialog').open")
  assert len(page.context.pages)==1
  page.get_by_role('button',name='📓 Caderno completo',exact=True).click()
  assert 'Minha anotação persistente' in frame.locator('#editor').inner_text()
  assert page.locator('#cadernoIntegradoDialog').evaluate('el=>el.getBoundingClientRect().width')<=width
  # Compact controls and both expansion buttons must use the actual viewport.
  assert page.locator('.caderno-integrado-barra').evaluate('el=>el.getBoundingClientRect().height') < 60
  assert page.locator('#cadernoIntegradoDialog').bounding_box()['height'] < 844
  page.locator('#cadernoIntegradoExpandir').click()
  page.wait_for_function("document.getElementById('cadernoIntegradoDialog').classList.contains('caderno-maximizado')")
  bounds=page.locator('#cadernoIntegradoDialog').bounding_box()
  assert bounds == {'x':0,'y':0,'width':width,'height':844}, bounds
  page.locator('#cadernoIntegradoExpandir').click()
  frame.locator('#btnExpandir').click()
  page.wait_for_function("document.getElementById('cadernoIntegradoDialog').classList.contains('caderno-editor-expandido')")
  assert page.locator('#cadernoIntegradoFrame').bounding_box() == {'x':0,'y':0,'width':width,'height':844}
  frame.locator('.close-expand').click()
  page.wait_for_function("!document.getElementById('cadernoIntegradoDialog').classList.contains('caderno-editor-expandido')")
  # Author a new card through the notebook form and study it in the main app.
  before=page.evaluate('flashcards.length')
  frame.locator('#btnCriarFlashcard').click()
  frame.locator('#inputPergunta').fill('Pergunta criada no caderno')
  frame.locator('#inputResposta').fill('Resposta criada no caderno')
  frame.locator('#modalSalvar').click()
  page.wait_for_function("flashcards.some(card=>card.pergunta==='Pergunta criada no caderno')")
  assert page.evaluate('flashcards.length') == before+1
  source_id=page.evaluate("flashcards.find(card=>card.pergunta==='Pergunta criada no caderno').cadernoId")
  frame.locator('#previewFlashcard .flashcard-item').filter(has_text='Pergunta criada no caderno').get_by_role('button',name='🧠 Flashcard',exact=True).click()
  page.wait_for_function("!document.getElementById('cadernoIntegradoDialog').open")
  assert page.locator('#pergunta').inner_text() == 'Pergunta criada no caderno'
  page.evaluate("respondido[indiceAtual]=true;statusCard[indiceAtual]='acertou';salvarEstado()")
  page.get_by_role('button',name='📓 Caderno completo',exact=True).click()
  iframe=page.locator('#cadernoIntegradoFrame').element_handle().content_frame()
  iframe.evaluate('(id)=>editarFlashcard(Number(id))',source_id)
  frame.locator('#inputPergunta').fill('Pergunta editada no caderno')
  frame.locator('#inputResposta').fill('Resposta editada')
  frame.locator('#modalSalvar').click()
  page.wait_for_function("getCardAtual().pergunta==='Pergunta editada no caderno'")
  assert page.evaluate('flashcards.length') == before+1
  assert page.evaluate('respondido[indiceAtual] && statusCard[indiceAtual]==="acertou"')
  assert page.evaluate("JSON.parse(localStorage.flashcards_estado).flashcards.some(card=>card.pergunta==='Pergunta editada no caderno')")
  # Sending that same notebook card back to annotate must not duplicate it.
  notebook_count=iframe.evaluate('CadernoIntegrado.cards().length')
  page.locator('#cadernoIntegradoFechar').click()
  page.get_by_role('button',name='📓 Anotar no Caderno (C)',exact=True).click()
  page.wait_for_timeout(250)
  assert iframe.evaluate('CadernoIntegrado.cards().length') == notebook_count
  assert len(notebook_requests)==1, notebook_requests
  assert not heavy_requests, heavy_requests
  assert not errors, errors
  browser.close()


def test_optional_tools_load_only_when_used(server):
 with sync_playwright() as pw:
  browser=pw.chromium.launch()
  page=browser.new_page()
  errors=[]
  page.on('pageerror',lambda error:errors.append(str(error)))
  page.route('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@*/dist/umd/supabase.min.js',lambda route:route.fulfill(body=MOCK,content_type='application/javascript'))
  page.route('https://i.postimg.cc/**',lambda route:route.abort())
  pdf_requests=[]
  crop_requests=[]
  def pdf(route):
   pdf_requests.append(route.request.url)
   route.fulfill(content_type='application/javascript',body="window.html2pdf=()=>({set(){return this},from(){return this},async save(){window.__pdfExports=(window.__pdfExports||0)+1}})")
  def crop(route):
   crop_requests.append(route.request.url)
   route.fulfill(content_type='application/javascript',body="window.Cropper=class{constructor(){window.__cropperCreates=(window.__cropperCreates||0)+1}destroy(){}}")
  page.route('https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/**',pdf)
  page.route('https://cdnjs.cloudflare.com/ajax/libs/cropperjs/**/cropper.min.js',crop)
  page.route('https://cdnjs.cloudflare.com/ajax/libs/cropperjs/**/cropper.min.css',lambda route:route.fulfill(content_type='text/css',body=''))
  page.goto(server)
  page.wait_for_function("!document.getElementById('cadernoIntegradoFrame').hidden")
  assert not pdf_requests and not crop_requests
  page.get_by_role('button',name='📓 Caderno completo',exact=True).click()
  frame=page.frame_locator('#cadernoIntegradoFrame')
  iframe=page.locator('#cadernoIntegradoFrame').element_handle().content_frame()
  frame.locator('#btnGerarPDF').click()
  iframe.wait_for_function('window.__pdfExports===1')
  frame.locator('#btnGerarPDF').click()
  iframe.wait_for_function('window.__pdfExports===2')
  assert len(pdf_requests)==1
  assert not crop_requests
  iframe.evaluate("""() => {
   const image=document.createElement('img');
   image.src='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jGzQAAAAASUVORK5CYII=';
   document.getElementById('editor').appendChild(image);
   image.click();
  }""")
  frame.locator('#imgRecortar').click()
  iframe.wait_for_function('window.__cropperCreates===1')
  frame.locator('#cropCancel').click()
  assert len(crop_requests)==1
  assert not errors, errors
  browser.close()


@pytest.mark.parametrize('width',[390,589,1280])
def test_selection_toolbar_stays_near_text(server,width):
 with sync_playwright() as pw:
  browser=pw.chromium.launch()
  page=browser.new_page(viewport={'width':width,'height':844})
  page.route('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@*/dist/umd/supabase.min.js',lambda route:route.fulfill(body=MOCK,content_type='application/javascript'))
  page.route('https://i.postimg.cc/**',lambda route:route.abort())
  page.goto(server)
  page.wait_for_function("!document.getElementById('cadernoIntegradoFrame').hidden")
  page.get_by_role('button',name='📓 Caderno completo',exact=True).click()
  frame=page.frame_locator('#cadernoIntegradoFrame')
  iframe=page.locator('#cadernoIntegradoFrame').element_handle().content_frame()
  iframe.evaluate("""() => {
   const editor=document.getElementById('editor');
   editor.innerHTML='<p style="margin-top:160px"><span id="selectedText">Trecho selecionado</span> para estudar.</p><p style="height:400px">Mais anotações</p>';
   document.getElementById('selectedText').scrollIntoView({block:'center'});
  }""")
  def select_text():
   iframe.evaluate("""() => {
    const range=document.createRange();range.selectNodeContents(document.getElementById('selectedText'));
    const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);
    document.getElementById('editor').dispatchEvent(new MouseEvent('mouseup',{bubbles:true}));
   }""")
   frame.locator('.text-toolbar').wait_for()
  select_text()
  geometry=iframe.evaluate("""() => {
   const toolbar=document.querySelector('.text-toolbar').getBoundingClientRect();
   const text=window.getSelection().getRangeAt(0).getBoundingClientRect();
   return {left:toolbar.left,right:toolbar.right,top:toolbar.top,bottom:toolbar.bottom,height:toolbar.height,
    gap:Math.min(Math.abs(text.top-toolbar.bottom),Math.abs(toolbar.top-text.bottom)),width:innerWidth,viewportHeight:innerHeight};
  }""")
  assert geometry['gap']<=16,geometry
  assert geometry['left']>=7 and geometry['right']<=geometry['width']-7,geometry
  assert geometry['height']<=55,geometry
  assert geometry['bottom']<geometry['viewportHeight']-40,geometry
  # Horizontal overflow must not lose the selection when choosing a color.
  frame.locator('#tbAmarelo').click()
  assert frame.locator('#editor .mark-yellow').inner_text()=='Trecho selecionado'
  select_text()
  frame.locator('#tbFlashcard').click()
  assert frame.locator('#inputPergunta').input_value()=='Trecho selecionado'
  browser.close()

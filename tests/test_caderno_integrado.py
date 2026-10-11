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
  page.goto(server)
  page.wait_for_function('typeof getCardAtual === "function" && !!getCardAtual()')
  # Cloud hydration must precede an imported card, preserving older notes.
  page.evaluate('''window.__notebook={dados:{concursos:[{id:9,nome:'Anterior',materias:[{id:91,nome:'Matéria',assuntos:[{id:911,nome:'Assunto',paginas:[{id:9111,titulo:'Notas',cadernoHTML:'<p>Nota anterior da nuvem</p>'}]}]}]}],flashcards:[]},cronograma:[],updated_at:'2026-10-11T00:00:00Z'}''')
  page.get_by_role('button',name='📓 Anotar no Caderno (C)',exact=True).click()
  frame=page.frame_locator('#cadernoIntegradoFrame')
  frame.locator('.flashcard-importado').wait_for()
  assert len(page.context.pages)==1
  assert frame.locator('.flashcard-importado').count()==1
  assert page.evaluate("JSON.parse(localStorage.dados_concursos).concursos.some(c=>c.nome==='Anterior')")
  frame.locator('#editor').evaluate("editor=>{editor.innerHTML+='<p>Minha anotação persistente</p>';editor.dispatchEvent(new Event('input',{bubbles:true}));}")
  page.get_by_role('button',name='← Voltar aos flashcards').click()
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
  assert not errors, errors
  browser.close()

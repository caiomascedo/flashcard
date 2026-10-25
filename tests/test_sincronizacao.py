"""Versioned cloud simulation: exercise the actual save queue and Realtime callback."""
import json
import pytest
from playwright.sync_api import sync_playwright, expect
from test_caderno_integrado import server

CLOUD = r'''
const copy = v => v == null ? v : JSON.parse(JSON.stringify(v));
window.__writes=[];window.__events=[];
window.__emit = row => {localStorage.__test_cloud=JSON.stringify(row);for(const fn of __events)fn({new:copy(row)});};
window.supabase={createClient(){return {
 auth:{async getSession(){return {data:{session:{user:{id:'sync-test'}}}}},async getUser(){return {data:{user:{id:'sync-test'}}}},onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}}}},
 from(table){let op='read',value,conditions={};
  const run=async()=>{
   if(table!=='flashcards_estado')return {data:table==='cadernos'?null:[],error:null};
   if(localStorage.__test_offline==='true')return {data:null,error:{message:'offline'}};
   let row=JSON.parse(localStorage.__test_cloud||'null');
   if(op==='read')return {data:copy(row),error:null};
   const snapshot=copy(value);
   if(window.__delayNext){window.__delayNext=false;await new Promise(resolve=>window.__release=resolve);row=JSON.parse(localStorage.__test_cloud||'null');}
   if(op==='update'&&conditions.versao!==row?.versao)return {data:null,error:null};
   if(op==='insert'&&row)return {data:null,error:{code:'23505',message:'duplicate'}};
   row={...snapshot,versao:(row?.versao||0)+1};
   __writes.push(copy(row));__emit(row);
   return {data:{versao:row.versao},error:null};
  };
  const chain=new Proxy({}, {get(target,key){if(key==='then')return (resolve,reject)=>run().then(resolve,reject);return (...args)=>{if(key==='update'||key==='insert'){op=key;value=args[0]}if(key==='eq')conditions[args[0]]=args[1];return chain};}});return chain;
 },channel(){const c={on(event,opts,callback){__events.push(callback);return c},subscribe(){return c}};return c},removeChannel(){}
}}};
'''

@pytest.fixture(params=['chromium','webkit'])
def app(server,request):
 with sync_playwright() as p:
  browser=getattr(p,request.param).launch();page=browser.new_page()
  page.set_default_timeout(10000)
  errors=[]
  page.on('pageerror',lambda error:errors.append(str(error)))
  page.route('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@*/dist/umd/supabase.min.js',lambda r:r.fulfill(body=CLOUD,content_type='application/javascript'))
  page.route('https://i.postimg.cc/**',lambda r:r.abort())
  page.goto(server)
  page.wait_for_function('!!window.FlashcardCaderno?.pronto && !!document.getElementById("cadernoIntegradoFrame")?.contentWindow?.CadernoIntegrado')
  page.wait_for_timeout(300)
  page.evaluate('async()=>{salvarEstado();await sincronizarAgora()}')
  page.wait_for_function('!sincronizacaoEmAndamento && !sincronizacaoPendente')
  yield page
  assert not errors,errors
  browser.close()

def test_unchanged_echo_and_immutable_queue(app):
 page=app
 count=page.evaluate('__writes.length')
 page.evaluate('async()=>{for(let i=0;i<8;i++)salvarEstado();await sincronizarAgora()}')
 assert page.evaluate('__writes.length')==count
 # JSONB reorders keys and an old tab can report the exact same snapshot.
 page.evaluate("statusCard[3]='errou';salvarEstado();const row=JSON.parse(localStorage.__test_cloud);row.estado=Object.fromEntries(Object.entries(row.estado).reverse());row.versao++;row.device_id='old-tab';__emit(row)")
 page.wait_for_timeout(100)
 assert page.locator('#conflitoSalvamento').count()==0
 assert 'Outro aparelho' not in page.locator('#toast').inner_text()
 assert page.evaluate('statusCard[3]')=='errou'
 page.evaluate("flashcards[0].dica='primeira';salvarEstado();flashcards[0].dica='segunda'")
 assert page.evaluate('sincronizacaoPendente.estado.flashcards[0].dica')=='primeira'
 page.evaluate('salvarEstado()')
 page.evaluate('async()=>await sincronizarAgora()')
 assert page.evaluate('JSON.parse(localStorage.__test_cloud).estado.flashcards[0].dica')=='segunda'

def test_offline_reload_retries_same_count(app):
 page=app
 page.evaluate("localStorage.__test_offline='true';statusCard[0]='acertou';respondido[0]=true;acertos=1;salvarEstado()")
 page.evaluate('async()=>await sincronizarAgora()')
 assert page.evaluate('!!sincronizacaoPendente')
 page.reload();page.wait_for_function('!!window.FlashcardCaderno?.pronto')
 assert page.evaluate('statusCard[0]')=='acertou'
 assert page.evaluate('JSON.parse(localStorage.flashcards_sync_sync_test||localStorage.getItem("flashcards_sync_sync-test")).pendente')
 page.evaluate("localStorage.__test_offline='false';window.dispatchEvent(new Event('online'))")
 page.wait_for_function('!sincronizacaoEmAndamento && !sincronizacaoPendente')
 assert page.evaluate('JSON.parse(localStorage.__test_cloud).estado.statusCard[0]')=='acertou'
 assert page.locator('#conflitoSalvamento').count()==0

def test_independent_reviews_merge_and_stale_event(app):
 page=app
 page.evaluate("statusCard[0]='acertou';respondido[0]=true;salvarEstado();const row=JSON.parse(localStorage.__test_cloud);row.versao++;row.device_id='phone';row.estado.statusCard[1]='errou';row.estado.respondido[1]=true;__emit(row)")
 page.wait_for_function("statusCard[0]==='acertou' && statusCard[1]==='errou'")
 page.evaluate('async()=>await sincronizarAgora()')
 assert page.locator('#conflitoSalvamento').count()==0
 assert page.evaluate('JSON.parse(localStorage.__test_cloud).estado.statusCard.slice(0,2)')==['acertou','errou']
 page.evaluate("const row=JSON.parse(localStorage.__test_cloud);row.versao--;row.estado.statusCard[0]='nao';receberAtualizacaoRemota(row)")
 assert page.evaluate('statusCard[0]')=='acertou'

def test_real_conflict_preserves_both_copies(app):
 page=app
 page.evaluate("flashcards[0].resposta='Resposta local';salvarEstado();const row=JSON.parse(localStorage.__test_cloud);row.versao++;row.device_id='phone';row.estado.flashcards[0].resposta='Resposta remota';__emit(row)")
 expect(page.locator('#conflitoSalvamento')).to_be_visible()
 assert page.evaluate('flashcards[0].resposta')=='Resposta local'
 backups=page.evaluate('async()=>await obterBackupsLocais()')
 local=next(b for b in backups if b['origem']=='conflito-local')
 remote=next(b for b in backups if b['origem']=='conflito-nuvem')
 assert local['id']!=remote['id']
 assert local['estado']['flashcards'][0]['resposta']=='Resposta local'
 assert remote['estado']['flashcards'][0]['resposta']=='Resposta remota'
 page.locator('#conflitoSalvamento [data-backups]').click()
 expect(page.locator('#modalOverlay')).to_contain_text('conflito-local')
 expect(page.locator('#modalOverlay')).to_contain_text('conflito-nuvem')
 page.evaluate('fecharModal()')
 page.locator('#conflitoSalvamento [data-local]').click()
 page.wait_for_function('!conflitoPendente && !sincronizacaoPendente && !sincronizacaoEmAndamento')
 assert page.evaluate('JSON.parse(localStorage.__test_cloud).estado.flashcards[0].resposta')=='Resposta local'

def test_remote_during_inflight_write(app):
 page=app
 page.evaluate("window.__delayNext=true;statusCard[0]='acertou';salvarEstado();window.__saving=sincronizarAgora();void 0")
 page.wait_for_function('!!window.__release')
 page.evaluate("statusCard[2]='errou';salvarEstado();const row=JSON.parse(localStorage.__test_cloud);row.versao++;row.device_id='tablet';row.estado.statusCard[1]='acertou';__emit(row);__release()")
 page.wait_for_function("!sincronizacaoEmAndamento && !sincronizacaoPendente")
 assert page.evaluate('statusCard.slice(0,3)')==['acertou','acertou','errou']
 assert page.evaluate('JSON.parse(localStorage.__test_cloud).estado.statusCard.slice(0,3)')==['acertou','acertou','errou']
 assert page.locator('#conflitoSalvamento').count()==0

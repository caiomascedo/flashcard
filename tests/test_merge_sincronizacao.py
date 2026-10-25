"""Pure merge invariants: no duplicate-card loss or index/status cross-contamination."""
import json
import subprocess
from pathlib import Path


def test_merge_cards_and_indices():
    script = Path(__file__).resolve().parents[1] / 'sincronizacao-segura.js'
    result = subprocess.run(['node','-e',r'''
      global.window={};require(process.argv[1]);
      const {merge,clone}=window.SincronizacaoSegura;
      const state=cards=>({flashcards:cards,statusCard:cards.map(()=>'nao'),respondido:cards.map(()=>false),indiceAtual:0,indicesFiltrados:[0,1],revisaoIndices:[],filaErros:[]});
      const base=state([{id:'a',pergunta:'A'},{id:'b',pergunta:'B'}]);
      const local=clone(base),remote=clone(base);
      local.flashcards.push({id:'c',pergunta:'C'});local.statusCard.push('acertou');local.respondido.push(true);
      remote.flashcards.push({id:'d',pergunta:'D'});remote.statusCard.push('errou');remote.respondido.push(true);
      const additions=merge(base,local,remote,c=>c.id);
      const dup=state([{id:'a',pergunta:'A'},{id:'a',pergunta:'A'}]);
      const duplicates=merge(dup,clone(dup),clone(dup),c=>c.id);
      const deleted=clone(base);deleted.flashcards.shift();deleted.statusCard.shift();deleted.respondido.shift();deleted.indiceAtual=0;deleted.indicesFiltrados=[0];
      const removal=merge(base,deleted,base,c=>c.id);
      const changed=clone(base);changed.flashcards[0].pergunta='editada';
      const deleteEdit=merge(base,deleted,changed,c=>c.id);
      console.log(JSON.stringify({additions,duplicates,removal,deleteEdit}));
    ''',str(script)],check=True,capture_output=True,text=True)
    data=json.loads(result.stdout)
    assert not data['additions']['conflicts']
    assert [c['id'] for c in data['additions']['state']['flashcards']]==['a','b','c','d']
    assert data['additions']['state']['statusCard']==['nao','nao','acertou','errou']
    assert data['additions']['state']['filaErros']==[3]
    assert len(data['duplicates']['state']['flashcards'])==2
    assert [c['id'] for c in data['removal']['state']['flashcards']]==['b']
    assert data['removal']['state']['indicesFiltrados']==[0]
    assert data['deleteEdit']['conflicts']

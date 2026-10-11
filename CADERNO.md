# Caderno integrado

O botão **Caderno completo** abre todas as funções do caderno dentro dos Flashcards.
**Anotar no Caderno (C)** abre o caderno e inclui o card atual na pasta correspondente.
Cards criados ou editados no caderno aparecem automaticamente no estudo principal,
com vínculos estáveis para evitar duplicação e preservar o progresso de resposta.
A barra é compacta; **Expandir** ocupa toda a tela. Expandir o editor também
ocupa a tela inteira, escondendo a barra até sair do editor expandido.
O botão **Flashcard**, dentro do caderno, volta ao original na mesma tela.

`caderno.html` incorpora o caderno completo de `caiomascedo/caderno`, versão
`caf72d9e890d513482bdc7f4acfcd36f002ba782`, como um módulo interno de mesma origem.
`caderno-integrado.js` controla abertura, fila de importação, confirmação de
carregamento e navegação de volta. O módulo reutiliza o cliente Supabase da página
principal e mantém os dados e a tabela `cadernos` já utilizados pelo caderno.
A sincronização inicial termina antes de permitir edição ou importação de cards.

Não é necessário migrar o banco. Na hospedagem GitHub Pages, ambos os caminhos
compartilham o armazenamento local da mesma origem. As anotações existentes na
nuvem são carregadas pela mesma conta. Exportar/importar JSON e PDF continuam
disponíveis no próprio caderno.

## Verificação

```sh
python -m pip install -r tests/requirements.txt
python -m playwright install chromium
python -m pytest -q tests/test_caderno_integrado.py
```

Os testes usam Supabase simulado e verificam abertura interna, preservação da
cópia da nuvem, ausência de duplicação, persistência das anotações, envio da cópia
editada à nuvem simulada e retorno ao card original em computador e celular.

# Caderno integrado

O botão **Caderno completo** abre todas as funções do caderno dentro dos Flashcards.
Depois do início da sessão, o caderno é preparado em segundo plano e permanece
carregado entre aberturas. Os estilos são locais (`caderno-base.css`); as bibliotecas
de exportação PDF e recorte de imagens são baixadas apenas ao usar essas funções.
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

Os estilos utilitários foram gerados com Tailwind CSS 3.4.17. Para regenerá-los
após adicionar novas classes ao HTML, use um arquivo de entrada com
`@tailwind base; @tailwind components; @tailwind utilities;` e execute:

```sh
npx --yes tailwindcss@3.4.17 -i /caminho/entrada.css -o caderno-base.css --content caderno.html --minify
```

## Menu e painéis compactos

As ações do Flashcard, incluindo Sair, ficam em **Menu** no topo. No caderno,
**Ações do assunto** começa fechado e o histórico fica abaixo de Estatísticas.
Os controles de expansão são botões nativos para toque e teclado.

Pendências podem ser ocultadas por matéria ou pelo painel inteiro após confirmação.
**Mostrar ocultas** restaura a lista; a preferência é salva neste navegador e
não exclui cards ou anotações.

Os fluxos de menu, confirmação, restauração e expansão são verificados em
Chromium e WebKit, com telas de celular e computador:

```sh
python -m playwright install chromium webkit
python -m pytest -q tests/test_menu_paineis.py
```

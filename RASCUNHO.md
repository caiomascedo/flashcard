# Rascunho de matemática

O botão **✏️ Rascunho**, disponível também no modo foco, abre o Excalidraw
0.18.1 em português dentro do Flashcard. O quadro começa com o lápis selecionado;
as ferramentas nativas incluem borracha, desfazer, texto e exportação.

O aplicativo é hospedado neste repositório, sem abrir outro site. Seu JavaScript,
estilos e fontes só são carregados ao abrir o quadro pela primeira vez. Fechar
mantém o iframe para que a próxima abertura seja imediata.

O desenho, incluindo imagens, é salvo automaticamente no IndexedDB deste
navegador, após 350 ms sem alterações e ao voltar aos cards. Esse rascunho é local:
não integra os backups na nuvem dos cards. O cabeçalho informa o estado do
salvamento e indica a exportação manual se o navegador negar armazenamento.
Os dados de estudo e as marcações dos cards permanecem no fluxo existente.

Fontes do aplicativo: `tools/rascunho/`. Publicação estática: `rascunho/`.
Integração: `rascunho-flashcard.js` e `rascunho-flashcard.css`.

Para reconstruir os arquivos publicados:

```sh
cd tools/rascunho
npm ci
npm run build
```

Excalidraw: https://github.com/excalidraw/excalidraw (licença MIT).
As licenças distribuídas estão em `rascunho/licencas/` e junto das fontes.

Verificação com nuvem simulada, desenho real e recuperação após recarregar:

```sh
python -m pytest -q tests/test_rascunho.py
```

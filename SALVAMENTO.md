# Salvamento e sincronização

O estado é salvo primeiro neste navegador. A fila da nuvem recebe uma cópia
independente, evitando que edições posteriores modifiquem um envio já iniciado.
Estados iguais são comparados com as chaves ordenadas, inclusive quando o
Postgres devolve o JSON em outra ordem. Salvamentos periódicos sem alterações
não geram novas gravações na nuvem.

Falhas mantêm a fila pendente, com novas tentativas de 2 a 30 segundos. Voltar à
conexão antecipa a tentativa. A marca de pendência e a última base confirmada
(IndexedDB, separada por usuário) preservam edições offline ao recarregar, mesmo
quando a cópia local e a nuvem têm o mesmo número de cards.

As gravações continuam condicionadas à versão lida do servidor. O Realtime
ignora eventos antigos e reconhece o próprio envio antes da confirmação HTTP.
Eventos concorrentes aguardam o envio em curso; alterações compatíveis são
combinadas com a última base confirmada. Cards, respostas e índices são tratados
em conjunto. Exclusões intencionais e cards repetidos são preservados.

Quando o mesmo conteúdo tem edições incompatíveis, o envio é pausado para
evitar sobrescrever a outra versão. O usuário continua com a cópia local e pode
consultar ambas em Backups ou escolher enviar suas alterações. As cópias de
conflito têm registros separados, inclusive com a mesma quantidade de cards.
A central agora mostra também os backups locais, com restauração e download do
estado completo, mesmo se a consulta à nuvem falhar. Não houve alteração no
esquema, nas credenciais ou nas políticas do Supabase.

Verificação com nuvem simulada, incluindo comparações de versão e eventos
Realtime, sem acessar dados reais:

```sh
python -m pytest -q tests/test_sincronizacao.py tests/test_merge_sincronizacao.py
```

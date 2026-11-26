# Luli & Chris — Operação Fundação — Etapa 01

Base: `AgoraeuSaquei/LulieChris`, commit `95b0487589cc8f14ed2ba4363ed509e6fa9ccd96`.

## Instalação

O pacote contém somente arquivos novos de desenvolvimento. Extraia o conteúdo desta pasta na raiz de uma cópia local do jogo (onde estão `levels.js` e `assets/`). Não substitua os arquivos do jogo. Python 3.9+; sem dependências externas. No Windows, se `python` não estiver no PATH, use `py -3`.

```powershell
python tools/validate.py
python tools/validate.py --json relatorio-validacao.json
python tools/validate.py --map "C:\caminho\mapas.json"
python -m unittest discover -s tests -v
```

Também é possível validar sem copiar os arquivos, indicando a raiz do jogo:

```powershell
python tools/validate.py --root "C:\jogos\LulieChris"
```

O script não altera mapas, sprites ou saves. Apenas grava um relatório se `--json` for usado. O validador não é carregado pelo HTML do jogo.

## Resultados

- `ERROR`: configuração ou recurso inválido segundo o contrato atual. Código de saída 1.
- `WARN`: requer análise, mas não necessariamente impede o jogo. Código de saída 0 na ausência de erros; `--strict` também retorna 1 para avisos.
- `--json`: relatório com ocorrências, fase, contagens, transparência e limites dos quadros.

Os quadros esperados seguem `sprites.js`: heróis 4/6/4/2/4, inimigos 4/4/3/2/3 e NPCs 4/4/3/2/1. Quadros adicionais são avisos, não erros. O leitor offline exige PNG RGBA de 8 bits não entrelaçado (formato dos sprites oficiais inspecionados); outras codificações PNG devem ser exportadas nesse formato para validação. Pixels semitransparentes e âncoras aproximadas são sinalizados para inspeção humana; a orientação e a qualidade visual não são certificadas automaticamente. A validação de geometria é estática, não prova que um portal é alcançável nem que um puzzle é solucionável. A sobreposição de caixas considera retângulos exportados e precisa de verificação em jogo. IDs são verificados por fase. O script lê os spritesheets oficiais e os incorporados ao JSON; retratos e outros PNGs não estão sujeitos à grade oficial. O arquivo de narrativa externo `story.js` não é validado nesta versão, apenas os diálogos das entidades/eventos do mapa.

## Testes

16 testes automatizados em fixtures sintéticas, incluindo uma campanha completa de oito fases e 14 PNGs gerados para teste. Resultado registrado em `TESTES.txt`. O pacote não inclui os recursos do jogo nem uma cópia do repositório. Não houve execução do validador sobre a cópia integral real nesta sessão; houve inspeção separada dos mapas reais via integração de leitura, registrada em `DIAGNOSTICO-BASE.md`.

## GitHub (somente se houver autorização e permissão de escrita)

A criação de `development/fundacao` pela integração foi recusada (HTTP 403). A main foi reconfirmada no commit de origem. Para publicar somente a branch experimental em uma cópia local autenticada e limpa, após conferir o commit base:

```bash
git switch main
git pull --ff-only
git switch -c development/fundacao
# Extraia os arquivos do pacote nesta cópia e confira os resultados.
python tools/validate.py
python -m unittest discover -s tests -v
git add tools/validate.py tests/test_validate.py README-ETAPA01.md TESTES.txt DIAGNOSTICO-BASE.md
git diff --cached --stat
git commit -m "test: add campaign and spritesheet validators"
git push -u origin development/fundacao
```

Se a branch já existir, não recrie nem sobrescreva: use-a apenas após conferir seu histórico. Não faça merge na main nem altere a configuração do GitHub Pages. Nenhuma etapa posterior foi implementada neste pacote.

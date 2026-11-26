# Diagnóstico da base — leitura direta do GitHub

Commit: `95b0487589cc8f14ed2ba4363ed509e6fa9ccd96`.

Esta inspeção foi executada separadamente do novo validador Python, por leitura do JSON real via integração GitHub. Não é a saída do novo programa.

| Fase | Entidades | Spawn | Portal | Checkpoints |
|---|---:|---:|---:|---:|
| 1 | 13 | 1 | 1 | 0 |
| 2 | 76 | 1 | 1 | 0 |
| 3 | 15 | 1 | 1 | 0 |
| 4 | 33 | 1 | 1 | 0 |
| 5 | 17 | 1 | 1 | 0 |
| 6 | 55 | 1 | 1 | 0 |
| 7 | 67 | 1 | 1 | 0 |
| 8 | 79 | 1 | 1 | 0 |

355 entidades. Não foram encontradas origens fora do mapa, IDs duplicados por fase, portas sem placa do mesmo canal ou vida de inimigo não inteira/positiva nas verificações realizadas. Os oito mapas não têm checkpoint. Na fase 7, a caixa `e-b53341ae-5347-4d01-96b5-600ad71dc491` (x=928, y=416, 96×91) sobrepõe a porta `e-5e78e71f-5d54-4937-bb80-31b824180965` (x=928, y=0, 32×700). A sobreposição existe nos dados; o efeito na partida ainda não foi testado. Não modificar coordenadas antes de validar o puzzle.

A auditoria anterior dos 14 PNGs verificou as dimensões de 384×320 e canal alfa RGBA8; limão e curandeira apresentam pixels nas bordas de células; vários inimigos apresentam alta proporção de alfa parcial. Os resultados precisam ser reconfirmados com a execução do novo validador sobre a cópia real.

Nenhum arquivo remoto foi modificado.

# Operação Fundação — Etapa 02

Ajustes experimentais no motor; nenhum mapa, sprite, diálogo ou save foi alterado.

- `enemies.js`: movimentação isolada por categoria, utilizando `LuliPuzzles.sweep` e `moveY`. Os inimigos respeitam paredes, portas fechadas, caixas, limites horizontais, alcance configurado e plataformas. Patrulhas terrestres evitam sair do apoio; saltos usam gravidade e altura aproximada de 54 unidades. Morcegos mantêm movimento oscilatório, com colisão também nas plataformas. Inimigos imóveis mantêm a posição horizontal e assentam no apoio.
- `game.js`: inicialização dos inimigos com `maxHp`, chamada do módulo e barra do chefe normalizada entre 0 e 100%. Vida, dano, velocidade e coordenadas de origem dos mapas preservados. Perseguições agora respeitam o alcance do editor, inclusive o chefe. O motor pode ajustar minimamente a posição inicial para não sobrepor obstáculos e recolocar um inimigo caído sem recuperar sua vida.
- `index.html`: novo script carregado depois de puzzles.js e antes do motor.
- `tests/test_enemy_physics.cjs`: testes de regressão sem dependências externas, incluindo execução do código real com APIs de navegador simuladas.

## Testes
```
node tests/test_enemy_physics.cjs
python -m unittest discover -s tests -v
python tools/validate.py
```

O teste de JavaScript não substitui a homologação completa em navegador e dispositivos reais. O ajuste de alcance e a física de aterrissagem podem alterar a dificuldade percebida. Verificar especialmente fases 2, 5, 6, 7 e 8 e a conclusão do chefe. A sobreposição caixa/porta da fase 7 permanece inalterada até a etapa de validação dos puzzles. Não houve mudança nas regras de resgate, checkpoints ou portais nesta etapa.

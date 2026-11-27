# Passe visual dos mapas — V1

Base: V8 Fundação, campanha revisada (d2ef401).
Apenas renderização de cenário em game.js; levels.js, puzzles.js, enemies.js, sprites, história, HUD e save permanecem inalterados.

- Oito paletas próprias, com progressão da iluminação diurna para o castelo noturno.
- Cenário procedural em camadas com paralaxe, árvores, ruínas, cascatas e lanternas.
- Alvenaria e vegetação pixeladas, plataformas com borda nítida, portas horizontais/verticais, caixas e placas visualmente diferenciadas.
- Portal de pedra com núcleo animado, respeitando os estados do portal existentes.
- Desenho de terreno/puzzles limitado à região visível; sem novas dependências ou imagens externas.

Testes: 55 verificações executadas com APIs de navegador simuladas no runtime JavaScript, incluindo 30.000 passos de física dos 25 inimigos, 48 combinações de fase/câmera/largura, determinismo do desenho, invariância da geometria de colisão e estados visuais de placas e portas.

Limites: conceitos de arte são referências de direção visual, não imagens reproduzidas 1:1. Sem captura real do Canvas, medição de FPS em aparelhos ou teste manual da campanha. O editor permanece inalterado; o JSON continua compatível. Não inclui correções de level design nem publica na main.

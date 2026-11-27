# V9.1 — Acabamento interativo

Seis recursos SVG originais em estilo pixel art: caixa de madeira, segmento de portão, placa inativa/ativa e bandeira inativa/ativa. O portão fechado repete módulos nos eixos horizontal e vertical; aberto deixa apenas linhas nas bordas. O canal continua visível. O checkpoint permanece ancorado à coordenada original. Nenhuma alteração na física, colisões, campanha ou salvamento. Fallback visual V9 quando o recurso não está disponível.

Testes: 55 regressões em runtime simulado e 56 verificações de objetos com Canvas e imagens simulados. Ainda requer avaliação visual em navegador e dispositivos reais. Execute `node tests/test_fantasy_objects.cjs`.

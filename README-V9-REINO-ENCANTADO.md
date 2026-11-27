# V9 Visual — Reino Encantado (consolidada)

Integração dos Fantasy Art Pack 02 e Fantasy Tileset 02, a partir dos arquivos do instalador completo aprovado pelo usuário. Os 20 arquivos distribuídos foram conferidos byte a byte por identidade de blob Git. Não há necessidade de executar instalador nem de usar Python para jogar.

- Oito fundos temáticos, quatro decorações PNG e cinco atlas de terreno.
- Scripts fantasy-art.js e fantasy-tiles.js com fallback procedural quando os recursos ainda não carregaram.
- Preserva níveis, sprites, história, controles, física e formato de salvamento da V8 Fundação.
- Testes: 55 regressões em ambiente JavaScript simulado; 144 combinações de câmera para fundos e decorações; 4.464 chamadas de teste ao renderizador de tiles com verificação de limites.
- Imagens reais e seus hashes conferidos; testes de renderização usam APIs e imagens simuladas, não são medição de FPS ou homologação em dispositivos.

Para jogar: abrir index.html ou servir a raiz do repositório via HTTP. Não é necessário instalar os pacotes separadamente. Para testar os módulos: node tests/test_fantasy_assets.cjs.

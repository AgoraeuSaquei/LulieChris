# Operação Fundação — Etapa 05

HUD compacto com protagonista e estado da dupla sempre visíveis, objetivo contextual, vida do chefe em proporção correta e informações anteriores preservadas. Layout portrait usa espaço restante do viewport dinâmico; landscape mantém controles sobrepostos com safe areas. Controles por ponteiro e fontes independentes de teclado, cancelamento em blur, rotação, pausa, diálogo e perda de captura. Indicador de 600 ms no botão Dupla; ação somente na soltura, como antes. Nenhum mapa, sprite, física ou save alterado. Barra de progresso horizontal continua aproximada; não mede conclusão de fases verticais. Testes em JS com DOM simulado; validar layout e gestos em Safari/iPhone, Android e desktop reais.

`node tests/test_hud.cjs` e suítes anteriores.

# Referências do projeto

Revisão visual em /catalog, acessível por “Ver catálogo de referências” na seleção de instâncias.

Fontes atuais: ITENS DE MOODBOARD.pdf, cinco capturas enviadas e quatro conceitos fictícios originais. Os moodboards antigos não fornecem referências às novas criações.

Consulte [CAPTURAS-E-CRIACOES.md](CAPTURAS-E-CRIACOES.md) para a identificação, distribuição e imagens. [VINCULOS-MOODBOARD.md](VINCULOS-MOODBOARD.md) registra os vínculos salvos.

Consulta local: /api/moodboard-catalog?moodboard=1, com filtro opcional roomId. Inclui instâncias e áreas atuais, plantas baixa/teto/medidas e origem das imagens.

O catálogo local combina src/config/moodboard-pdf.json e src/config/capture-products.json. O envio externo foi autorizado e ativado em src/config/astra-catalog.json. O renderizador usa os vínculos atuais por instância, com imagens e revisões registradas.

Atualizar relatório: node node_modules/tsx/dist/cli.mjs scripts/inspect-pdf-bindings.mts. Não reimportar a planilha antiga para ativar este catálogo.

Na janela inicial, um envio registra a direção visual e gera a imagem pela API. A direção orienta as criações seguintes; respostas na mesma conversa editam a imagem sem substituir automaticamente a direção global.

Auditoria reproduzível sem envio externo: node node_modules/tsx/dist/cli.mjs scripts/audit-render-inputs.mts. O relatório verifica os arquivos efetivamente anexados ao pedido. Os testes não comprovam acesso ao modelo, saldo da conta ou fidelidade geométrica da imagem final.

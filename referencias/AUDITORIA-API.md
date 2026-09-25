# Auditoria da integração autorizada

Data: 2026-09-24T19:50:30.749Z

**Conexão das referências ao pedido da API: verificada. Fidelidade arquitetônica exata: não validada.**

- Catálogo ativo: 47 produtos, envio authorized.
- Instâncias no pedido: 115; sem vínculo: 0.
- Imagens obrigatórias das plantas e medidas: 7/7.
- Imagens de produtos compatíveis no pedido: 31. Produtos de outros ambientes não são incluídos quando há ambiente selecionado.
- O envio inicial registra a direção visual e gera a imagem na mesma requisição.
- Partes de sofá/bancada, contornos, rotações, acabamentos e origem acompanham os vínculos.
- Cadastros manuais prevalecem. Referências incompatíveis ou instâncias sem vínculo interrompem a geração.
- Referências e geometria desatualizadas invalidam o reaproveitamento automático de renders antigos.
- Cada render registra as revisões e os hashes das imagens anexadas.

## Limites da verificação

Pedido capturado em transporte simulado. Nenhuma chamada externa nem cobrança. Acesso aos modelos, saldo e qualidade de imagem real não foram testados.
Portas, janelas e entradas continuam como informação das imagens, sem cadastro geométrico validado por abertura. As regras de prompt não constituem uma garantia de posição exata. Não existe validação geométrica automática do render final.

- Room IDs are provisional spatial matches only. Source Copa overlaps the current executive office, and Depósito overlaps the current phone booth. Preserve registered functions and furniture; do not rename or repurpose rooms based on these labels.
- Outer labels 24m x 14m yield 336m², differing from the declared 243.76m². Do not force a globally consistent metric model or silently correct either annotation.
- Reunião 01 labels 3.20m x 2.90m yield 9.28m², differing from its listed 9.24m². Preserve both as source annotations.
- Raft details refer to drawings 361–367; M&E specifications are not supplied.

A documentação oficial reconhece limites de posicionamento preciso: [OpenAI — Image generation](https://developers.openai.com/api/docs/guides/image-generation#limitations).
Detalhes reproduzíveis em [AUDITORIA-API.json](AUDITORIA-API.json).

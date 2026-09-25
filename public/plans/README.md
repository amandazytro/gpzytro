# Referências atuais das plantas

- Planta baixa: `src/PLANTAS/PLANTA BAIXA.svg`, preservada em `public/plans/floorplan-source.svg`.
- Exibição: `floorplan-aligned.svg`, rotação de 90 graus e transformação visual para o sistema de coordenadas 882 × 580 usado pelos cadastros. Não representa calibração métrica. IDs de móveis e cadastros são preservados.
- API: `floorplan-reference.png`, rasterização de alta resolução do mesmo SVG alinhado.
- Teto: PDF original preservado em `ceiling-source.pdf`; página renderizada em `ceiling-page-1.png`.
- Dados: `src/data/ceiling-reference.json`, cotas explícitas da legenda, revisão B de 06/07/2016, hash do PDF e anotações com coordenadas PDF originais. Essas coordenadas não equivalem às coordenadas dos móveis.
- A integração injeta as duas imagens com detail high e os dados de teto no servidor para todas as gerações. O hash e a revisão são gravados na proveniência de cada render. Nenhuma geração paga é feita durante os testes.
- As cores do PDF identificam alturas, não acabamentos. Detalhes 361–367 e especificações M&E não foram fornecidos. Não inferir dimensões por escala gráfica.

Para reconstruir os arquivos após trocar as fontes, executar `node scripts/inspect-new-plans.mjs` e `node scripts/prepare-current-plans.mjs`. Conferir novamente o alinhamento e as cotas: a transformação e a transcrição verificada correspondem aos arquivos atuais.

Medidas: MEDIDAS.png é preservada integralmente em dimensions-original.png. A API recebe a imagem, quatro recortes legíveis e dimension-reference.json com cotas transcritas, unidades, correspondências espaciais provisórias e divergências documentadas. Os dados são impostos pelo servidor em criação, edição e variação; cada render registra o hash da referência. Cotas externas e área total divergentes não são reconciliadas automaticamente.

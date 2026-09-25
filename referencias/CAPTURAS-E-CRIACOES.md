# Capturas e móveis fictícios — revisão local

Foram lidas as cinco capturas enviadas em 24/09/2026. O catálogo local reúne o PDF atual, as capturas e as criações originais. Nenhum móvel fictício reaproveita imagens dos moodboards antigos.

| Referência | Aplicação |
| --- | --- |
| Armário com portas de correr e jardineiras | Dois armários existentes: estações e mesa colaborativa |
| Cadeira giratória com tecido Gabriel Tonal | Reunião rápida, sala de reunião e assentos do escritório privativo |
| Poltrona cinza Camira Synergy LDS08 | Espera e quatro assentos junto aos apoios da convivência |
| Mesa preta Ø600 × A450 mm | Duas mesas de centro maiores da convivência |
| Mesa de pedestal creme | Dois apoios circulares menores: espera e convivência |
| Sofá Elo — fictício | Um conjunto modular em L, duas partes de contorno |
| Bancada Dobra — fictícia | Uma bancada em L na copa, com contornos repetidos consolidados |
| Balcão Trama — fictício | Três apoios: dois no conselho e um na reunião |
| Poltrona Nexo — fictícia | Alternativa disponível, sem acrescentar assentos à planta |

As quantidades do documento são dados de origem, não uma ordem de adicionar móveis. A altura de 450 mm da mesa preta corresponde a uma mesa de centro; as mesas de reunião mantêm sua função. Nos acabamentos, o texto e as amostras das capturas prevalecem sobre as fotografias. Fabricantes e medidas não legíveis não foram inventados.

O sofá azul da captura não foi usado: a orientação final pede um sofá modular fictício. O Elo foi criado do zero em cinza-pedra, com módulos retos, canto e retorno. O catálogo identifica explicitamente as referências fictícias e suas adaptações.

## Arquivos originais gerados

Ferramenta: image_gen integrada, sem imagens de referência. Prompts completos em [PROMPTS-MOVEIS-FICTICIOS.json](PROMPTS-MOVEIS-FICTICIOS.json).

- [Sofá Elo](../public/catalog/original-designs/elo.png)
- [Bancada Dobra](../public/catalog/original-designs/dobra.png)
- [Balcão Trama](../public/catalog/original-designs/trama.png)
- [Poltrona Nexo](../public/catalog/original-designs/nexo.png)

## Aplicação

As instâncias foram salvas com controle de revisão e cópias anteriores em placement-backups. IDs de instâncias mantidas, posições e ajustes individuais foram preservados. O sofá e a bancada passaram a usar partes de um mesmo conjunto, reduzindo 118 contornos para 115 instâncias sem retirar móveis da composição. Os limites dos ambientes e os quatro cadeados não foram alterados.

A revisão visual está em /catalog e no painel de cada móvel em /instances. A API local /api/moodboard-catalog devolve os vínculos atuais, origem, contornos e partes dos conjuntos. A integração desse material com a API da OpenAI foi autorizada e ativada. Consulte AUDITORIA-API.md para a verificação do pedido e as limitações de precisão.

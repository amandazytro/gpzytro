# Arquitetura do fluxo visual — Astra Configurator

> **Atualização:** a experiência do cliente foi reconstruída em torno da planta (`/` e `/demo`). O painel administrativo antigo está em `/internal`. Veja o [README](../README.md) para rotas, bloqueio da arquitetura, fluxo de renders e integração do Astra. As seções abaixo descrevem o modelo de dados e continuam válidas; a seção "Limite desta entrega" está desatualizada.

## Fluxo previsto

Projeto → prédio/fachada → andar → unidade → layout/planta → cômodo → itens selecionados → geração pela IA Astra → revisão das renders → PDF.

A navegação usa imagens 2D e regiões clicáveis sobre elas. Não depende de modelos ou motor 3D.

## O que a base já representa

| Entidade           | Vínculo e responsabilidade                                                                                                         |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| Building           | Projeto e imagem da fachada.                                                                                                       |
| Floor              | Prédio, número do andar, planta do andar e região clicável sobre a fachada.                                                        |
| Unit               | Prédio e andar; contém os layouts disponíveis.                                                                                     |
| Layout             | Unidade e imagem da planta correspondente.                                                                                         |
| Room               | Layout e polígono clicável sobre essa planta.                                                                                      |
| Moodboard          | Referência visual por tipo de cômodo, com PDF de origem.                                                                           |
| Asset              | ID único, categoria, tipo de item, moodboard/PDF/página, linha da tabela, imagens de referência, aprovação e permissão de mistura. |
| Assignment         | Asset selecionado para um cômodo e layout específicos.                                                                             |
| Render / RenderJob | Contratos para entrada da IA, vista, revisão da imagem e cópia dos assets utilizados.                                              |
| RenderPdfExport    | Contrato para exportar uma lista ordenada de revisões de renders.                                                                  |

Regiões clicáveis usam pontos normalizados de 0 a 1 sobre a imagem original. Isso permite redimensionar a planta ou fachada na interface sem mudar a identificação dos cômodos/andares. As regiões estão vazias até recebermos os desenhos reais.

O mock usa Example Residence, andar 12 (simulado), unidade 1204, layouts A/B/C e cinco cômodos por layout. As três referências de Living Room contêm 18 assets aprovados/misturáveis para demonstração. PDF, fachada, plantas e imagens dos produtos ainda não foram fornecidos; URLs e referências à tabela permanecem vazias.

## Como os arquivos reais entrarão

1. Cadastrar fachada e plantas, associando cada arquivo ao prédio, andar e layout corretos.
2. Mapear os andares na fachada e os cômodos na planta. A imagem de uma planta, sozinha, não fornece esse mapeamento sem preparação e conferência.
3. Importar a tabela mantendo seus IDs/códigos. Cada linha deve identificar o item, tipo, PDF/página e imagens de referência disponíveis. Conservar a ligação entre linha original e Asset ID.
4. Validar os vínculos, aprovação, compatibilidade por cômodo e regras de mistura antes de disponibilizar o catálogo.
5. Definir vistas de cada cômodo, referências visuais e informações dimensionais disponíveis. A planta orienta a organização espacial; as referências dos itens orientam sua aparência.

Quando os arquivos chegarem, adaptaremos o importador ao formato real da tabela. Não há importador automático nesta fase e não é necessário alterar os nomes dos arquivos agora.

## Integração futura com a IA Astra

A integração deve ocorrer no servidor, por um adaptador do provedor Astra. A API, credenciais e recursos específicos ainda precisam ser definidos; nenhuma integração foi executada nesta fase.

Para cada solicitação:

- Validar projeto/layout/cômodo e permissões do usuário.
- Resolver a planta e sua região de cômodo.
- Buscar exclusivamente os assets aprovados escolhidos pelo usuário e suas imagens/documentos de referência.
- Capturar uma cópia da seleção para aquela solicitação.
- Enviar planta, referências, vista e seleção estruturada à IA.
- Acompanhar a tarefa e salvar cada imagem resultante como uma nova revisão, vinculada à seleção enviada.
- Revisar a saída antes de disponibilizá-la como render aprovada.

Restringir o catálogo impede que a aplicação ofereça produtos inventados. A fidelidade visual exata da render ao produto e à planta depende das capacidades do gerador e de validação da saída; os tipos de dados ou um prompt, isoladamente, não garantem isso.

Se uma seleção mudar enquanto a IA trabalha, o resultado pertence à seleção anterior. Não deve substituir silenciosamente a imagem da configuração atual.

## Exportação futura

A exportação reunirá as revisões aprovadas selecionadas para os cômodos/vistas em um PDF. Deve manter os IDs das renders utilizadas para que alterações posteriores não mudem a composição daquele documento. A criação do PDF depende das imagens produzidas e aprovadas; não está implementada nesta fase.

## Limite desta entrega

Funcionam o catálogo demonstrativo, a navegação por seletores, os vínculos de dados, os filtros e a edição de seleções. Fachada/planta interativas, importação real, banco de dados no servidor, autenticação, geração por IA e exportação das renders em PDF são próximas etapas. Os contratos de geração e exportação são definições TypeScript; ainda não executam tarefas.

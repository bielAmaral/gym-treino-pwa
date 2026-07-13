/**
 * Cardápio fixo — jul/2026.
 * @typedef {{ label: string, lines: string[], choice?: boolean }} DietBlock
 */

/** @type {{ id: string, label: string, meals: object[] }} */
export const DIET_PLAN = {
  id: "jul-2026",
  label: "Plano jul/2026",
  meals: [
    {
      id: "cafe",
      time: "08:30",
      label: "Café da manhã",
      context: "Em casa",
      intro: "Base sólida de proteínas e gorduras para saciedade durante o trabalho.",
      checkable: true,
      blocks: [
        { label: "Carboidrato", lines: ["1 pão sírio OU 1 disco de Rap10"] },
        { label: "Proteína", lines: ["3 ovos inteiros mexidos (feitos na hora)"] },
        { label: "Complemento", lines: ["30 g de requeijão light"] },
      ],
    },
    {
      id: "almoco",
      time: "12:00",
      label: "Almoço",
      context: "No trabalho",
      intro: "Praticidade no presencial — sem arroz requentado; proteína fria ou sanduíche.",
      tip: "Leve a proteína em pote separado para o micro-ondas ou monte sanduíche/wrap frio com folhas.",
      checkable: true,
      blocks: [
        {
          label: "Carboidrato fresco (escolha 1)",
          choice: true,
          lines: ["1 baguete média", "Fatias de pão sourdough", "2 discos de Rap10"],
        },
        {
          label: "Proteína",
          lines: ["200 g de filé de frango desfiado, patinho moído ou pernil picado"],
        },
      ],
    },
    {
      id: "lanche",
      time: "15:30",
      label: "Lanche da tarde",
      context: "No trabalho",
      intro: "Leve no meio do expediente — proteína limpa para o déficit.",
      checkable: true,
      blocks: [
        { label: "Carboidrato", lines: ["3 fatias de pão de forma"] },
        { label: "Proteína", lines: ["60 g de peito de peru + queijo cottage"] },
        { label: "Suplementação", lines: ["1 scoop (25 g) de Whey batido só com água"] },
      ],
    },
    {
      id: "pre-treino",
      time: "19:30",
      label: "Pré-treino",
      context: "Em casa",
      intro: "Combustível antes do treino de braços às 21h — feito na hora.",
      checkable: true,
      blocks: [
        {
          label: "Carboidrato fresco (escolha 1)",
          choice: true,
          lines: [
            "220 g de batata inglesa ou mandioca (cozidas na hora ou micro-ondas)",
            "2 discos de Rap10 grelhados na frigideira",
          ],
        },
        { label: "Proteína", lines: ["200 g de frango ou carne moída feitos na hora"] },
      ],
    },
    {
      id: "treino-slot",
      time: "21:00",
      label: "Treino",
      context: "Academia",
      checkable: false,
      blocks: [
        {
          label: "Horário",
          lines: [
            "21:00 às 22:00 — séries válidas até a falha; finalize com caminhada na esteira inclinada.",
          ],
        },
      ],
    },
    {
      id: "pos-treino",
      time: "22:15",
      label: "Pós-treino",
      context: "Em casa",
      intro: "Reposição rápida de glicogênio e proteína antes de dormir.",
      checkable: true,
      blocks: [
        { label: "Carboidrato rápido", lines: ["3 torradas integrais + 1 colher de sopa de geleia"] },
        { label: "Proteína rápida", lines: ["1 scoop (25 g) de Whey batido com água"] },
      ],
    },
    {
      id: "ceia",
      time: "23:00",
      label: "Ceia",
      context: "Em casa",
      intro: "Ambiente anabólico na madrugada sem pesar no estômago.",
      checkable: true,
      blocks: [{ label: "Item único", lines: ["200 ml de iogurte zero"] }],
    },
  ],
};

export function getCheckableMealIds() {
  return DIET_PLAN.meals.filter((m) => m.checkable !== false).map((m) => m.id);
}

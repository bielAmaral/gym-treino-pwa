/**
 * Cardapio fixo - jul/2026 (UTF-8).
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
      label: "Caf\u00e9 da manh\u00e3",
      context: "Em casa",
      intro:
        "Base s\u00f3lida de prote\u00ednas e gorduras para saciedade durante o trabalho.",
      checkable: true,
      blocks: [
        { label: "Carboidrato", lines: ["1 p\u00e3o s\u00edrio OU 1 disco de Rap10"] },
        { label: "Prote\u00edna", lines: ["3 ovos inteiros mexidos (feitos na hora)"] },
        { label: "Complemento", lines: ["30 g de requeij\u00e3o light"] },
      ],
    },
    {
      id: "almoco",
      time: "12:00",
      label: "Almo\u00e7o",
      context: "No trabalho",
      intro:
        "Praticidade no presencial \u2014 sem arroz requentado; prote\u00edna fria ou sandu\u00edche.",
      tip: "Leve a prote\u00edna em pote separado para o micro-ondas ou monte sandu\u00edche/wrap frio com folhas.",
      checkable: true,
      blocks: [
        {
          label: "Carboidrato fresco (escolha 1)",
          choice: true,
          lines: ["1 baguete m\u00e9dia", "Fatias de p\u00e3o sourdough", "2 discos de Rap10"],
        },
        {
          label: "Prote\u00edna",
          lines: ["200 g de fil\u00e9 de frango desfiado, patinho mo\u00eddo ou pernil picado"],
        },
      ],
    },
    {
      id: "lanche",
      time: "15:30",
      label: "Lanche da tarde",
      context: "No trabalho",
      intro: "Leve no meio do expediente \u2014 prote\u00edna limpa para o d\u00e9ficit.",
      checkable: true,
      blocks: [
        { label: "Carboidrato", lines: ["3 fatias de p\u00e3o de forma"] },
        { label: "Prote\u00edna", lines: ["60 g de peito de peru + queijo cottage"] },
        { label: "Suplementa\u00e7\u00e3o", lines: ["1 scoop (25 g) de Whey batido s\u00f3 com \u00e1gua"] },
      ],
    },
    {
      id: "pre-treino",
      time: "19:30",
      label: "Pr\u00e9-treino",
      context: "Em casa",
      intro: "Combust\u00edvel antes do treino de bra\u00e7os \u00e0s 21h \u2014 feito na hora.",
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
        { label: "Prote\u00edna", lines: ["200 g de frango ou carne mo\u00edda feitos na hora"] },
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
          label: "Hor\u00e1rio",
          lines: [
            "21:00 \u00e0s 22:00 \u2014 s\u00e9ries v\u00e1lidas at\u00e9 a falha; finalize com caminhada na esteira inclinada.",
          ],
        },
      ],
    },
    {
      id: "pos-treino",
      time: "22:15",
      label: "P\u00f3s-treino",
      context: "Em casa",
      intro: "Reposi\u00e7\u00e3o r\u00e1pida de glicog\u00eanio e prote\u00edna antes de dormir.",
      checkable: true,
      blocks: [
        { label: "Carboidrato r\u00e1pido", lines: ["3 torradas integrais + 1 colher de sopa de geleia"] },
        { label: "Prote\u00edna r\u00e1pida", lines: ["1 scoop (25 g) de Whey batido com \u00e1gua"] },
      ],
    },
    {
      id: "ceia",
      time: "23:00",
      label: "Ceia",
      context: "Em casa",
      intro: "Ambiente anab\u00f3lico na madrugada sem pesar no est\u00f4mago.",
      checkable: true,
      blocks: [{ label: "Item \u00fanico", lines: ["200 ml de iogurte zero"] }],
    },
  ],
};

export function getCheckableMealIds() {
  return DIET_PLAN.meals.filter((m) => m.checkable !== false).map((m) => m.id);
}

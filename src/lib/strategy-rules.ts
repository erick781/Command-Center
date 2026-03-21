type BuildMissingQuestionsInput = {
  industry?: string | null;
  objective: string;
  strategyType: string;
};

export function buildMissingQuestions({
  industry,
  objective,
  strategyType,
}: BuildMissingQuestionsInput) {
  const normalizedIndustry = (industry || "").toLowerCase();

  if (strategyType === "ecommerce" || normalizedIndustry.includes("ecom")) {
    return [
      "What is the current AOV and margin range?",
      "Which products or collections matter most right now?",
      "Are inventory or promo calendar constraints affecting recommendations?",
      "What email / SMS retention flows are active today?",
    ];
  }

  if (
    strategyType === "leadgen" ||
    normalizedIndustry.includes("coaching") ||
    normalizedIndustry.includes("construction") ||
    objective === "recover"
  ) {
    return [
      "What happens after the lead comes in?",
      "What are the current booking, show-up, and close rates?",
      "Has the sales or follow-up process changed recently?",
      "What capacity limits could distort scale recommendations?",
    ];
  }

  return [
    "What KPI matters most for this strategy right now?",
    "What changed recently in offer, creative, targeting, or funnel?",
    "What has already been tested and ruled out?",
    "What operational constraints could block execution?",
  ];
}

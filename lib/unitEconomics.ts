export interface UsageAssumptions {
  questionsPerMonth: number
  modelCallsPerQuestion: number
  averageInputTokensPerCall: number
  averageOutputTokensPerCall: number
  inputPricePerMillionTokens: number
  outputPricePerMillionTokens: number
  externalSearchCostPerQuestion: number
  monthlyFixedHostingCost: number
  monthlyOtherFixedCost: number
  pricePerQuestion: number
}

/** Hypothetical unit economics only. Rates and volumes MUST be supplied by the operator. */
export function estimateUnitEconomics(input: UsageAssumptions) {
  for (const [key, value] of Object.entries(input)) {
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) throw new Error(`Invalid assumption: ${key}`)
  }
  if (!Number.isInteger(input.questionsPerMonth) || input.questionsPerMonth < 1) throw new Error("questionsPerMonth must be a positive integer")
  const variableModelCostPerQuestion = input.modelCallsPerQuestion * (
    input.averageInputTokensPerCall * input.inputPricePerMillionTokens / 1_000_000 +
    input.averageOutputTokensPerCall * input.outputPricePerMillionTokens / 1_000_000
  )
  const variableCostPerQuestion = variableModelCostPerQuestion + input.externalSearchCostPerQuestion
  const monthlyFixedCost = input.monthlyFixedHostingCost + input.monthlyOtherFixedCost
  const totalMonthlyCost = monthlyFixedCost + input.questionsPerMonth * variableCostPerQuestion
  const totalMonthlyRevenue = input.questionsPerMonth * input.pricePerQuestion
  const marginPerQuestionAfterFixed = input.pricePerQuestion - totalMonthlyCost / input.questionsPerMonth
  return {
    variableModelCostPerQuestion,
    variableCostPerQuestion,
    monthlyFixedCost,
    totalMonthlyCost,
    totalMonthlyRevenue,
    marginPerQuestionAfterFixed,
    breakEvenQuestions: input.pricePerQuestion > variableCostPerQuestion
      ? Math.ceil(monthlyFixedCost / (input.pricePerQuestion - variableCostPerQuestion))
      : null,
  }
}

import assert from "node:assert/strict"
import test from "node:test"
import { estimateUnitEconomics, type UsageAssumptions } from "../lib/unitEconomics"

const assumptions: UsageAssumptions = {
  questionsPerMonth: 1000,
  modelCallsPerQuestion: 1.2,
  averageInputTokensPerCall: 1000,
  averageOutputTokensPerCall: 500,
  inputPricePerMillionTokens: 2,
  outputPricePerMillionTokens: 4,
  externalSearchCostPerQuestion: 0.001,
  monthlyFixedHostingCost: 20,
  monthlyOtherFixedCost: 30,
  pricePerQuestion: 0.1,
}

test("cost model counts model tokens, searches and fixed monthly costs separately", () => {
  const result = estimateUnitEconomics(assumptions)
  assert.ok(Math.abs(result.variableModelCostPerQuestion - 0.0048) < 1e-10)
  assert.ok(Math.abs(result.totalMonthlyCost - 55.8) < 1e-9)
  assert.equal(result.totalMonthlyRevenue, 100)
  assert.equal(result.breakEvenQuestions, Math.ceil(50 / (0.1 - 0.0058)))
})

test("cost model refuses unknown or impossible assumptions instead of inventing prices", () => {
  assert.throws(() => estimateUnitEconomics({ ...assumptions, questionsPerMonth: 0 }), /questionsPerMonth/)
  assert.throws(() => estimateUnitEconomics({ ...assumptions, inputPricePerMillionTokens: Number.NaN }), /Invalid assumption/)
  assert.throws(() => estimateUnitEconomics({ ...assumptions, monthlyFixedHostingCost: -1 }), /Invalid assumption/)
  assert.equal(estimateUnitEconomics({ ...assumptions, pricePerQuestion: 0 }).breakEvenQuestions, null)
})

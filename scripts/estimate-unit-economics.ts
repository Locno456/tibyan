import { estimateUnitEconomics, type UsageAssumptions } from "../lib/unitEconomics"

// No bundled price list. Provide measured/quoted prices and volumes yourself.
const keys: Array<keyof UsageAssumptions> = [
  "questionsPerMonth", "modelCallsPerQuestion", "averageInputTokensPerCall", "averageOutputTokensPerCall",
  "inputPricePerMillionTokens", "outputPricePerMillionTokens", "externalSearchCostPerQuestion",
  "monthlyFixedHostingCost", "monthlyOtherFixedCost", "pricePerQuestion",
]
const args = process.argv.slice(2)
const values: Record<string, number> = {}
for (let index = 0; index < args.length; index += 2) {
  const key = args[index]?.replace(/^--/, "")
  if (!key || !keys.includes(key as keyof UsageAssumptions) || !args[index]?.startsWith("--") || !args[index + 1]) {
    console.error(`Required numeric flags: ${keys.map((item) => `--${item}`).join(" ")}`)
    process.exit(2)
  }
  values[key] = Number(args[index + 1])
}
if (keys.some((key) => !(key in values))) {
  console.error(`Missing flags: ${keys.filter((key) => !(key in values)).map((key) => `--${key}`).join(" ")}`)
  process.exit(2)
}
try {
  const estimate = estimateUnitEconomics(values as unknown as UsageAssumptions)
  console.log(JSON.stringify({ note: "افتراضات أدخلها المستخدم، لا أسعار رسمية أو توقع ربح", assumptions: values, estimate }, null, 2))
} catch (error) {
  console.error(String((error as Error).message || error))
  process.exit(2)
}

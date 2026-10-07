import test from "node:test"
import assert from "node:assert/strict"
import { detectIntent } from "../lib/levelRouter"
import { buildGeneralRulingQueries, extractRulingTopic, isRulingEvidenceRelevant } from "../lib/questionPlanning"
import { compareQuoteToText, findVerifiedTextMatches } from "../lib/rag"
import { findMcpQuoteMatches, parseVerificationRequest } from "../lib/textVerification"

test("classifies general rulings while preserving personal-fatwa referral", () => {
  assert.deepEqual(detectIntent("ما حكم التدخين؟"), {
    intent: "general_ruling",
    level: "B",
    keywords: ["حكم عام"],
  })
  assert.equal(detectIntent("ما أقوال العلماء في زكاة الأسهم؟").intent, "general_ruling")
  assert.equal(detectIntent("ما أقوال العلماء في زكاة الأسهم؟").level, "C")
  assert.equal(detectIntent("حكم الموسيقى؟").intent, "general_ruling")
  assert.equal(detectIntent("هل التدخين حرام؟").intent, "general_ruling")
  assert.equal(detectIntent("ما رأي العلماء في بيع العملات الرقمية؟").level, "C")
  assert.equal(detectIntent("هل يجوز لي جمع الصلاة بسبب دوامي؟").level, "D")
  assert.equal(detectIntent("ما حكم صلاتي بعد النوم؟").level, "D")
})

test("builds topic-preserving evidence queries for a general ruling", () => {
  const question = "ما حكم التداول بالرافعة المالية شرعاً؟"
  assert.equal(extractRulingTopic(question), "التداول بالرافعة المالية")
  assert.deepEqual(buildGeneralRulingQueries(question), [
    "التداول بالرافعة المالية",
    "التداول بالرافعة المالية دليل القرآن والسنة",
    "التداول بالرافعة المالية أقوال العلماء والفقهاء",
  ])
  assert.deepEqual(buildGeneralRulingQueries("ما الحكم؟"), [])
  assert.equal(extractRulingTopic("هل التدخين حرام؟"), "التدخين")
  assert.equal(extractRulingTopic("ما رأي العلماء في بيع العملات الرقمية؟"), "بيع العملات الرقمية")
})

test("filters topic-mismatched evidence and disambiguates homographs", () => {
  assert.equal(isRulingEvidenceRelevant("الربا", "قل أغير الله أبغي رباً وهو رب كل شيء"), false)
  assert.equal(isRulingEvidenceRelevant("الربا", "وأحل الله البيع وحرم الربا وأكل أموال الناس بالباطل"), true)
  assert.equal(isRulingEvidenceRelevant("الربا", "يا أيها الذين آمنوا اتقوا الله وذروا ما بقي من الربوا"), true)
  assert.equal(isRulingEvidenceRelevant("الربا", "وما آتيتم من ربا ليربوا في أموال الناس فلا يربوا عند الله"), true)
  assert.equal(isRulingEvidenceRelevant("التدخين", "آية قرآنية عامة عن التقوى والعبادة"), false)
})

test("requires the full submitted quote for an exact local quotation match", () => {
  const source = "إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ، وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى"
  const formattedQuote = "إنما الأعمال بالنيات! وإنما لكل امرئ ما نوى."
  assert.deepEqual(compareQuoteToText(formattedQuote, source), { kind: "exact", similarity: 1 })

  const extendedQuote = `${formattedQuote} وهذا تتمة أضيفت ولا تظهر في نص المصدر`
  assert.notEqual(compareQuoteToText(extendedQuote, source)?.kind, "exact")
  assert.ok(findVerifiedTextMatches(formattedQuote).some((match) => match.kind === "exact"))
})

test("keeps close Quran or hadith wording as a near match, not a confirmation", () => {
  const source = "إنما الأعمال بالنيات وإنما لكل امرئ ما نوى فمن كانت هجرته إلى دنيا يصيبها أو إلى امرأة ينكحها فهجرته إلى ما هاجر إليه"
  const closeWording = "إنما الأعمال بالنيات وإنما لكل امرئ ما نوى فمن كانت هجرته إلى دنيا يصيبها أو إلى امرأة ينكحها فهجرته إلى ما هاجر عنها"
  assert.equal(compareQuoteToText(closeWording, source)?.kind, "near")
})

test("distinguishes a near MCP quotation from an exact source match", () => {
  const quote = "إنما الأعمال بالنيات وإنما لكل امرئ ما نوى فمن كانت هجرته إلى دنيا يصيبها أو إلى امرأة ينكحها فهجرته إلى ما هاجر إليه"
  const call = {
    alias: "ic_search",
    toolName: "search_hadith",
    providerId: "islamic_content",
    providerLabel: "Islamic Content",
    endpoint: "https://mcp.example.test/mcp",
    args: {},
    result: {
      content: [{ type: "text", text: `نص الحديث: ${quote.replace("إليه", "عنها")}` }],
    },
  }
  const matches = findMcpQuoteMatches(quote, [call])
  assert.equal(matches[0]?.kind, "near")
  assert.equal(findMcpQuoteMatches(quote, [{ ...call, result: { content: [{ type: "text", text: `نص الحديث: ${quote}` }] } }])[0]?.kind, "exact")
})

test("parses quotation verification requests without inventing a quote", () => {
  assert.deepEqual(parseVerificationRequest("ما صحة الحديث: إنما الأعمال بالنيات وإنما لكل امرئ ما نوى"), {
    requested: true,
    quote: "إنما الأعمال بالنيات وإنما لكل امرئ ما نوى",
  })
  assert.deepEqual(parseVerificationRequest("هل هذا الحديث صحيح؟"), { requested: true })
})

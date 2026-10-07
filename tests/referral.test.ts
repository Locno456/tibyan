import test from "node:test"
import assert from "node:assert/strict"
import { referralFallback, explicitSpecialistRequest, parseReferralClassification, referralExplanation } from "../lib/referral"

test("specialist fallback identifies personal estate and conversion intent for target audiences", () => {
  assert.equal(referralFallback("توفي أبي كيف أقسم الميراث بيننا؟", "non_muslim", false), "inheritance")
  assert.equal(referralFallback("أريد أن أدخل الإسلام ولا أعرف كيف", "non_muslim", false), "conversion")
  assert.equal(referralFallback("ما هي آيات الميراث؟", "non_muslim", false), null)
  assert.equal(referralFallback("أنا في حالة طلاق", "new_muslim", true), "personal_fatwa")
  assert.equal(referralFallback("أريد أن أدخل الإسلام", "researcher", false), null)
})
test("explicit specialist requests bypass unrelated evidence retrieval for any audience", () => {
  assert.equal(explicitSpecialistRequest("هل يمكنك إحالتي إلى مختص؟"), true)
  assert.equal(explicitSpecialistRequest("أريد التحدث مع شيخ"), true)
  assert.equal(explicitSpecialistRequest("ما هي أدلة التوحيد؟"), false)
  assert.equal(explicitSpecialistRequest("ما حكم الاستعانة بمختص؟"), false)
  assert.match(referralExplanation("specialist_request", true), /طلبت التحدث/)
})

test("untrusted classifier output must be a constrained JSON decision", () => {
  assert.equal(parseReferralClassification('{"reason":"conversion"}'), "conversion")
  assert.equal(parseReferralClassification('{"reason":"none"}'), null)
  assert.equal(parseReferralClassification('Sure: {"reason":"conversion"}'), null)
  assert.match(referralExplanation("conversion", true), /دون انتظار أي مختص/)
  assert.doesNotMatch(referralExplanation("inheritance", true), /هاتف/)
})

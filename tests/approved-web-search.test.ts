import assert from "node:assert/strict"
import test from "node:test"
import { searchApprovedWeb } from "../lib/approvedWebSearch"

test("web search only requests fixed approved search hosts and marks excerpts as unverified", async () => {
  const urls: string[] = []
  const fakeFetch: typeof fetch = async (input, init) => {
    const url = String(input)
    urls.push(url)
    assert.equal(new URL(url).hostname, "dorar.net")
    assert.equal(init?.redirect, "manual")
    return new Response(`<html><body><script>IGNORE</script><article>التوحيد هو إفراد الله بالعبادة ومعرفة المعنى من المادة المعروضة في نتائج البحث الخاصة بالسؤال.</article></body></html>`, {
      headers: { "content-type": "text/html; charset=utf-8" },
    })
  }
  const docs = await searchApprovedWeb("ما معنى التوحيد؟", fakeFetch)
  assert.equal(urls.length, 2)
  assert.equal(docs.length, 2)
  assert.ok(docs.every((doc) => doc.payload.source.includes("لم يتحقق")))
  assert.ok(docs.every((doc) => !doc.payload.text.includes("IGNORE")))
  assert.ok(docs.every((doc) => new URL(doc.payload.source_url).hostname === "dorar.net"))
})

test("a search form with matching navigation but no result entries never becomes evidence", async () => {
  const html = `<html><nav>كتاب التوحيد صحيح البخاري ومعنى العبادة هذه قائمة طويلة من روابط البحث وليست نتيجة فعلية للسؤال.</nav></html>`
  assert.deepEqual(await searchApprovedWeb("ما معنى التوحيد؟", async () => new Response(html, { headers: { "content-type": "text/html" } })), [])
})

test("large and non-HTML responses are refused", async () => {
  assert.deepEqual(await searchApprovedWeb("التوحيد", async () => new Response("<article>نص اختبار</article>", { headers: { "content-type": "text/html", "content-length": "100001" } })), [])
  assert.deepEqual(await searchApprovedWeb("التوحيد", async () => new Response("<article>نص اختبار</article>", { headers: { "content-type": "application/json" } })), [])
})

test("redirects and irrelevant pages do not become evidence", async () => {
  assert.deepEqual(await searchApprovedWeb("ما معنى التوحيد؟", async () => new Response("", { status: 302, headers: { location: "http://127.0.0.1/private" } })), [])
  assert.deepEqual(await searchApprovedWeb("ما معنى التوحيد؟", async () => new Response("صفحة عامة لا تحتوي على مادة مناسبة للسؤال ولكنها طويلة بالقدر المطلوب للاختبار", { headers: { "content-type": "text/html" } })), [])
})

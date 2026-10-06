// توليد data/hadith_sahihayn.json — الصحيحان (البخاري + مسلم) كاملاً.
//
// المصدر: حزمة npm «hadith» (قاعدة SQLite تضم مجموعات سنّة معتبرة بترقيمها وأحكامها).
// التطبيق لا يستورد الحزمة وقت التشغيل؛ البيانات مستخرَجة مسبقاً في data/hadith_sahihayn.json.
// لإعادة التوليد:
//
//   npm i -D hadith@1.3.0
//   node --experimental-sqlite scripts/build-hadith-data.mjs
//
// الناتج: مصفوفة { id, col: المجموعة, bk: الكتاب, num: الرقم, t: المتن, g: الحكم }.
// نكتفي بالمتن (content) للدقة في البحث والعرض، مع كامل بيانات التوثيق (مجموعة/كتاب/رقم/حكم).
// الرابط العميق للتحقق يُبنى وقت العرض عبر lib/sourceLinks (بحث الدرر المعتمد — لا 404).

import { createRequire } from "module"
import { writeFileSync } from "fs"
import { DatabaseSync } from "node:sqlite"

const require = createRequire(import.meta.url)
let dbPath
try {
  dbPath = require.resolve("hadith/data/hadith.db")
} catch {
  console.error("تعذّر العثور على حزمة hadith. نفّذ أولاً: npm i -D hadith@1.3.0")
  process.exit(1)
}

const db = new DatabaseSync(dbPath)

// الصحيحان: البخاري (1) + مسلم (2)
const COLLECTIONS = [1, 2]
const bookTitle = new Map()
for (const b of db.prepare("SELECT id,title FROM book").all()) bookTitle.set(b.id, (b.title || "").trim())
const colTitle = new Map()
for (const c of db.prepare("SELECT id,title FROM collection").all()) colTitle.set(c.id, (c.title || "").trim())

const rows = db
  .prepare(
    `SELECT urn, collection_id, book_id, display_number, content, grades
     FROM hadith WHERE collection_id IN (${COLLECTIONS.join(",")}) ORDER BY collection_id, display_number`
  )
  .all()

const out = rows.map((r) => ({
  id: String(r.urn),
  col: colTitle.get(r.collection_id) || "",
  bk: bookTitle.get(r.book_id) || "",
  num: r.display_number,
  t: (r.content || "").trim(),
  g: (r.grades || "").trim(),
}))

writeFileSync(new URL("../data/hadith_sahihayn.json", import.meta.url), JSON.stringify(out))
console.log(`تم توليد data/hadith_sahihayn.json — ${out.length} حديثاً (البخاري + مسلم)`)

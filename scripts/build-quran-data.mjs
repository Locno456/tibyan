// توليد data/quran_full.json — المصحف الكامل (6236 آية، الرسم العثماني).
//
// المصدر: حزمة npm «quran-json» (نص tanzil.net / مصحف المدينة، الرسم العثماني).
// التطبيق لا يستورد الحزمة وقت التشغيل؛ البيانات مستخرَجة مسبقاً في data/quran_full.json
// حتى يبقى النشر خفيفاً. لإعادة التوليد:
//
//   npm i -D quran-json@3.1.2
//   node scripts/build-quran-data.mjs
//
// الناتج: مصفوفة { s: رقم السورة, n: اسم السورة, a: رقم الآية, t: النص } — 6236 عنصراً.

import { createRequire } from "module"
import { writeFileSync } from "fs"

const require = createRequire(import.meta.url)

let quran
try {
  quran = require("quran-json/dist/quran.json")
} catch {
  console.error("تعذّر العثور على quran-json. نفّذ أولاً: npm i -D quran-json@3.1.2")
  process.exit(1)
}

const out = []
for (const s of quran) {
  for (const v of s.verses) out.push({ s: s.id, n: s.name, a: v.id, t: v.text })
}

writeFileSync(new URL("../data/quran_full.json", import.meta.url), JSON.stringify(out))
console.log(`تم توليد data/quran_full.json — ${out.length} آية`)

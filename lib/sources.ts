// المصادر المعتمدة حصراً - الحزمة العلمية صفحة 3-4
// يجب أن يكون كل نص شرعي مسترجع حرفياً من هذه المصادر فقط

export const APPROVED_SOURCES = {
  quran: {
    name: "القرآن الكريم",
    allowed: ["طبعة مجمع الملك فهد", "quranpedia.net"],
    urls: ["https://quranpedia.net", "https://api.quran.com"],
    level: "A",
    color: "#2563EB",
    rule: "تأكد من موثوقية نقل الآيات - استرجاع حرفي مع رقم السورة والآية"
  },
  tafsir: {
    name: "التفسير",
    allowed: ["مصادر القرون الثلاثة الأولى", "dorar.net/tafseer"],
    urls: ["https://dorar.net/tafseer"],
    level: "B",
    color: "#06B6D4",
    rule: "ميز كلام المفسر عن النص القرآني"
  },
  hadith: {
    name: "الحديث النبوي",
    allowed: ["الصحيحان", "dorar.net/hadith", "shamela.ws"],
    urls: ["https://dorar.net/hadith", "https://shamela.ws"],
    level: "A",
    color: "#2563EB",
    rule: "لا ينسب حديث دون مصدر وحكم معتمد"
  },
  aqeeda: {
    name: "العقيدة",
    allowed: ["مصادر القرون الثلاثة الأولى", "dorar.net/aqeeda"],
    urls: ["https://dorar.net/aqeeda"],
    level: "A/B",
    color: "#2563EB"
  },
  fiqh: {
    name: "الفقه العام",
    allowed: ["المذاهب الأربعة", "dorar.net/feqhia"],
    urls: ["https://dorar.net/feqhia"],
    level: "C/D",
    color: "#7C3AED",
    rule: "لا تتحول إلى فتوى شخصية أو ترجيح آلي مستقل"
  },
  sira: {
    name: "السيرة والتاريخ",
    allowed: ["مصادر القرون الثلاثة الأولى", "dorar.net/history"],
    urls: ["https://dorar.net/history"],
    level: "B/C",
    color: "#06B6D4"
  },
  shubuhat: {
    name: "الشبهات والأسئلة المتكررة",
    allowed: ["كتاب بينات dawa.center/file/7937", "المستودع الدعوي dawa.center"],
    urls: ["https://dawa.center/file/7937", "https://dawa.center"],
    level: "B",
    color: "#7C3AED",
    rule: "مصدر أساسي للحلول الحوارية في المستوى ب"
  },
  jamhara: {
    name: "الترجمة والمصطلحات - الجمهرة",
    allowed: ["islamic-content.com/dictionary"],
    urls: ["https://islamic-content.com/dictionary", "https://islamic-content.com"],
    level: "ترجمة",
    color: "#06B6D4",
    rule: "يقدم على الترجمة التلقائية في المصطلحات الحساسة",
    criticalTerms: {
      "الإسلام": "Islam - دين الاستسلام لله بالتوحيد",
      "التوحيد": "Tawhid / Oneness of God - إفراد الله بالربوبية والألوهية",
      "العبادة": "Worship - تشمل أعمال القلب والقول والعمل",
      "الشريعة": "Sharia / Islamic law and guidance - حسب السياق",
      "الفتوى": "Fatwa - جواب شرعي يصدره مؤهل، لا يساوى بالمعلومة العامة"
    }
  }
}

export const ALL_SOURCE_URLS = Object.values(APPROVED_SOURCES).flatMap(s => s.urls)

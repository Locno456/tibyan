# وصف مشروع تِبْيَان الكامل لـ AI AGENT Designer

## 📋 معلومات المشروع الأساسية

**اسم المشروع:** تِبْيَان (Tibyan) - محرك الحوار المعرفي والاستدلال الشرعي الموثق
**المسار:** تحدي باذل 2026 - المسار الأول: الحوار المعرفي والإجابات الموثوقة
**الفكرة:** صفر اختلاق نصي - النموذج اللغوي ليس المصدر بل المنظم والمبين
**الحالة:** MVP جاهز 100% - بناء 45.5kB - 12/12 حالة نجاح - هوية بصرية حقيقية مدمجة

---

## 🎨 الهوية البصرية الحقيقية - MUST FOLLOW

### الشعار - المفهوم (من Brand Kit المرفق):
- **✓ علامة صح** = موثوقية / ثقة
- علامة الصح تدور يساراً وتتكرر معكوسة → تشكل **كتاب مفتوح (القرآن)** silhouette
- فوق الكتاب **نقطتان معينتان ذهبيتان مربعتان بزاوية 45°** = نقطتا حرف **ت** أول حرف "تبيان"
- النقطتان ذهبيتان = نور المعرفة / light of knowledge
- **الملفات:** `public/tibyan-logo-color.svg` (تدرج تركواز→أزرق + ذهبي - للخلفيات الفاتحة) / `tibyan-logo-white.svg` (أبيض + ذهبي - للداكنة) / `tibyan-app-icon.svg` (أيقونة التطبيق)
- **الرسوم المتحركة:** `public/tibyan-intro-color.svg` - CSS animation داخل SVG بدون JS - 5.5ث: رسم علامة → مسح ضوئي + توهج → دوران → نسخة معكوسة → نقطتا التاء تظهران pop - مع `prefers-reduced-motion` fallback للشعار الثابت

### الألوان - كل لون له فكرة (من tokens.css):
```css
--tb-turquoise-300: #19D6C4 → --tb-turquoise-500: #0A8F94 → --tb-teal-900: #05495A = إسلام / تراث (قباب وزليج) - سائد
--tb-blue-600: #14529E → --tb-blue-900: #0F2A5C = موثوقية (علامة الصح) - ثاني
--tb-gold-100: #FFF0B8 → --tb-gold-500: #E0B450 = معرفة / نور - نقطتا التاء والأقمار الذهبية - لمسة فقط
--tb-violet-500: #7B4FD6 = ذكاء اصطناعي - اختياري لمسة صغيرة
--tb-bg: #EEF6F6 (فاتح) / #061A21 (داكن) - خلفية
--tb-card: #FFFFFF / #0C2832
--tb-text: #0A2A33 / #E6F4F4
--tb-accent: #0A8F94 / #19D6C4
```

### الزخارف Motif - قاعدة صارمة:
- **المفهوم:** نقطتا التاء تتكاثر وتتصل كسلسلة - معينات مستديرة متصلة بعنق ساعة رملية + أقمار ذهبية صغيرة بجانبها
- **الملفات:** `public/tibyan-brand-kit/motif/shapes/tibyan-shape-01-chain-3.svg` (3 عقد + 2 ذهبي - المفضلة) إلى `10-divider.svg` + `tibyan-motif-sprite.svg` كـ symbols
- **قاعدة الاستخدام:** **زخرفة واحدة فقط لكل view/section كلمسة جانبية عند الحافة/الزاوية، لا تتكرر كحقل، لا تتصل بأخرى كشبكة، لا توضع بجانب الشعار بنفس الحجم**
- **الشفافية:** 12-20% كعلامة مائية على الصور/الداكنة، 6-8% كخلفية

### الخطوط:
- عربي UI: Tajawal 500/700/800
- نص شرعي (وحي): Amiri 700
- جسم: IBM Plex Sans Arabic 400/600

---

## 💬 المطلوب الجديد - واجهة دردشة مثل ChatGPT مع ميزات إضافية

### 1. رسالة الذكاء الاصطناعي مثل تطبيقات الدردشة (ChatGPT style)

**المطلوب:**
- فقاعة واحدة للـ AI تشبه ChatGPT/Claude - خلفية رمادية فاتحة #F7F7F8 أو بيضاء، حواف مستديرة 16px
- داخل الفقاعة: الشرح المنظم + الآيات داخل الأقواس المعقوفة ﴿...﴾ مثل المصحف
- أسفل الفقاعة: زر "عرض المصادر" + Circular Progress Bar للموثوقية
- بدون زحام بصري - نظيف ومركز

**كيف نحافظ على الموثوقية 100% مع الآيات داخل الأقواس؟**

```
القاعدة الذهبية: الآيات داخل ﴿...﴾ يجب أن تكون فقط من BlueCard (مصادر موثقة حرفية)
- لا توليد - استرجاع حرفي من data/verified_texts.json
- في API: retrieval.docs → blueCards → تحتوي text مع ﴿...﴾ حرفي
- في الواجهة: نعرض blueCards.text داخل الفقاعة نفسها كجزء من الرسالة، لكن بتمييز بصري (خلفية زرقاء فاتحة + خط Amiri)
- Guard يمنع أي ﴿...﴾ غير موجود في retrievedDocs
```

**التنفيذ المقترح:**
```tsx
// ChatMessage.tsx - فقاعة واحدة تجمع الأزرق والبنفسجي
<div className="ai-message-bubble">
  {/* الشرح */}
  <div className="explanation">{purpleCard.explanation}</div>
  
  {/* الآيات داخل الأقواس - من BlueCards لكن معروضة داخل الفقاعة */}
  {blueCards.map(card => (
    <div className="quran-inline" style={{ fontFamily: 'Amiri', background: '#EEF6F6', border: '1px solid #C9DFE1' }}>
      <span className="quran-text">﴿{card.text}﴾</span>
      <span className="quran-ref">[{card.surah ? `سورة ${card.surah} آية ${card.ayah}` : card.source}]</span>
    </div>
  ))}
  
  {/* زر المصادر + Circular Progress */}
  <div className="message-footer">
    <button onClick={() => setShowSources(true)}>📚 عرض المصادر ({blueCards.length})</button>
    <CircularProgress value={confidence * 100} />
  </div>
</div>
```

### 2. الآيات داخل الأقواس المعقوفة مثل المصحف مع السورة ورقم الآية

**المطلوب:**
- عرض الآية بهذا الشكل: ﴿اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ﴾ [البقرة: 255]
- خط Amiri، حجم 18px، لون #0A2A33، خلفية #EEF6F6، حدود #C9DFE1
- رقم السورة والآية واضح

**التنفيذ مع الحفاظ على الموثوقية:**

```tsx
// في data/verified_texts.json - النص موجود حرفياً مع ﴿...﴾
{
  "id": "quran_002_255",
  "text": "﴿اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ﴾",
  "surah": 2,
  "ayah": 255,
  "source": "القرآن الكريم - البقرة 255",
  "source_url": "https://quranpedia.net/quran/2/255"
}

// في الواجهة - عرض آمن 100%
function QuranBracket({ text, surah, ayah, source, sourceUrl }) {
  // text يأتي حرفياً من JSON الموثق - لا توليد
  // Guard يتحقق: is_claimed_sacred + exact_match
  return (
    <span className="inline-flex flex-col items-center gap-1 mx-1">
      <span className="sacred text-[18px] leading-[1.9] px-3 py-1.5 rounded-[8px] bg-[#EEF6F6] border border-[#C9DFE1]/60" style={{ fontFamily: 'Amiri, serif', color: '#0A2A33' }}>
        {text} {/* ﴿...﴾ حرفي من المصدر */}
      </span>
      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#EEF6F6] border border-[#C9DFE1] text-[#14529E] font-bold">
        {surah && ayah ? `[سورة ${surah} آية ${ayah}]` : `[${source}]`}
      </span>
    </span>
  )
}
```

**Guard يحمي:**
```ts
// lib/guard.ts - يمنع أي ﴿...﴾ غير موجود في retrievedDocs
const SACRED_PATTERNS = [/﴿[^﴾]{10,}﴾/g]
if (is_claimed_sacred(llm_output) && !db.exact_match(claimed_text)) {
  return blocked + abstain
}
```

### 3. زر أسفل الرسالة يوضح كل تفاصيل المصادر

**المطلوب:**
- زر "📚 عرض المصادر (3)" أسفل كل رسالة AI
- عند الضغط: Modal/Bottom Sheet يعرض كل المصادر بالتفصيل: النص الحرفي + المصدر + الرابط + درجة الثقة + نوع (قرآن/حديث/بينات)
- مع إمكانية النسخ والتحقق

**التنفيذ:**

```tsx
function SourcesModal({ blueCards, isOpen, onClose }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="p-6 max-h-[80vh] overflow-y-auto">
        <h3 className="text-[16px] font-bold mb-4">📚 المصادر الموثقة ({blueCards.length})</h3>
        {blueCards.map(card => (
          <div key={card.id} className="mb-4 p-4 rounded-[12px] bg-[#EEF6F6] border border-[#C9DFE1]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold px-2 py-1 rounded-full bg-white border border-[#C9DFE1] text-[#14529E]">{card.type}</span>
              <span className="text-[10px] text-[#4B6A72]">ثقة {(card.confidence*100).toFixed(0)}%</span>
            </div>
            <div className="sacred text-[16px] mb-2" style={{ fontFamily: 'Amiri' }}>{card.text}</div>
            <div className="text-[11px] text-[#4B6A72]">{card.source}</div>
            <a href={card.source_url} target="_blank" className="text-[11px] text-[#0A8F94] underline">تحقق: {card.source_url}</a>
          </div>
        ))}
      </div>
    </Modal>
  )
}
```

### 4. Circular Progress Bar يوضح نسبة الموثوقية

**المطلوب:**
- دائرة تقدم circular بجانب زر المصادر
- توضح نسبة الموثوقية (confidence * 100)
- ألوان: أخضر ≥90%، تركواز 70-90%، أصفر 50-70%، أحمر <50%
- مع رقم النسبة في الوسط

**التنفيذ - بدون مكتبات خارجية (SVG pure):**

```tsx
function CircularProgress({ value, size = 44 }: { value: number, size?: number }) {
  const safeValue = Math.max(0, Math.min(100, Number(value) || 0))
  const radius = (size - 6) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (safeValue / 100) * circumference
  
  const getColor = () => {
    if (safeValue >= 90) return "#059669" // emerald
    if (safeValue >= 70) return "#0A8F94" // turquoise
    if (safeValue >= 50) return "#E0B450" // gold
    return "#E11D48" // red
  }

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="rotate-[-90deg]">
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#EEF6F6" strokeWidth="4" />
        <circle
          cx={size/2} cy={size/2} r={radius} fill="none"
          stroke={getColor()} strokeWidth="4" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[11px] font-extrabold" style={{ color: getColor() }}>{safeValue.toFixed(0)}%</span>
        <span className="text-[7px] text-[#8FB0B6]">موثوقية</span>
      </div>
    </div>
  )
}
```

---

## 🔒 كيف نحافظ على الموثوقية 100% مع هذه المميزات؟

### القاعدة الذهبية لا تتغير:
**النموذج اللغوي ليس المصدر، بل المنظم والمبين**

1. **الآيات داخل ﴿...﴾:** 
   - تأتي فقط من `data/verified_texts.json` (استرجاع حرفي)
   - لا تمر عبر Gemini - Gemini يشرح فقط (بنفسجي)
   - Guard يمنع أي ﴿...﴾ غير موجود في retrievedDocs
   - في الواجهة: نعرضها داخل فقاعة AI لكن مصدرها BlueCard (أزرق)

2. **Circular Progress:**
   - يحسب من `retrieval.confidence` (BM25 + Vector scores) وليس من Gemini
   - لا يؤثر على النص - مجرد visualization للثقة
   - ألوانه تحذيرية: أحمر <50% = تحذير

3. **زر المصادر:**
   - يعرض BlueCards الحرفية مع روابط تحقق مباشرة
   - لا يضيف مصادر جديدة - فقط يعرض الموجود
   - مع زر نسخ + تحقق

4. **رسالة ChatGPT style:**
   - فقاعة واحدة تجمع شرح + آيات، لكن داخلياً: الآيات لها خلفية زرقاء مميزة + خط Amiri + badge "موثق 100%"
   - الشرح له خلفية بيضاء + خط IBM Plex + badge "AI منظم"
   - فصل بصري داخل الفقاعة نفسها

### التدفق الآمن:

```
User: "ما معنى التوحيد؟"
  ↓
Level Router → A
  ↓
Hybrid RAG → 5 docs من verified_texts.json (منها quran_002_255 مع ﴿...﴾ حرفي)
  ↓
Gemini Flash Lite → شرح بنفسجي فقط (بدون ﴿...﴾ - ممنوع في prompt)
  ↓
Guard → يتحقق: هل الشرح يحتوي ﴿...﴾ غير موجود؟ → إذا نعم → blocked + fallback
  ↓
Response:
  blueCards: [quran_002_255: ﴿الله لا إله إلا هو الحي القيوم﴾ + surah 2 ayah 255]
  purpleCards: [شرح التوحيد بدون آيات]
  confidence: 0.94
  ↓
UI - فقاعة واحدة ChatGPT style:
  ┌─────────────────────────────────┐
  │ الشرح: التوحيد هو إفراد الله... │
  │                                 │
  │ ┌─────────────────────────────┐ │
  │ │ ﴿اللَّهُ لَا إِلَٰهَ إِلَّا │ │
  │ │ هُوَ الْحَيُّ الْقَيُّومُ﴾   │ │
  │ │ [البقرة: 255] ✓ موثق 100%   │ │
  │ └─────────────────────────────┘ │
  │                                 │
  │ [📚 عرض المصادر (5)]  [94% ◯]  │
  └─────────────────────────────────┘
```

---

## 📐 هيكل المكونات الجديد المقترح

```
components/
├── ChatMessage.tsx (جديد - فقاعة ChatGPT style تجمع أزرق+بنفسجي)
│   ├── QuranBracket.tsx (آية داخل ﴿...﴾ مع سورة ورقم)
│   ├── CircularProgress.tsx (دائرة موثوقية)
│   └── SourcesModal.tsx (modal تفاصيل المصادر)
├── BlueCard.tsx (موجود - يستخدم داخل ChatMessage كـ inline)
├── PurpleCard.tsx (موجود - يستخدم داخل ChatMessage)
├── AnimatedLogo.tsx (موجود - شعار حقيقي)
├── SplashScreen.tsx (موجود - رسوم حقيقية 5.5ث)
└── ChatInput.tsx (موجود - input ثابت أسفل)

app/
├── page.tsx (مبسط - empty state مركزي + فقاعات دردشة + input ثابت)
└── api/ask/route.ts (موجود - مع Gemini + Guard)

public/
├── tibyan-logo-color.svg (حقيقي)
├── tibyan-intro-color.svg (رسوم حقيقية)
├── icon-*.png (حقيقية)
└── tibyan-brand-kit/motif/shapes/*.svg (زخارف)
```

---

## ✅ هل ممكن بدون إنقاص الموثوقية؟

**نعم 100% ممكن - بل يزيد الموثوقية:**

- **الآيات داخل ﴿...﴾** = نفس BlueCard القديم لكن معروض داخل الفقاعة → موثوقية 100% محفوظة
- **Circular Progress** = visualization للـ confidence الموجود أصلاً → لا يغير النص → يزيد الشفافية
- **زر المصادر** = نفس BlueCards مع روابط → يزيد إمكانية التتبع → يحقق معيار "يمكن تتبعها لمصدر معتمد"
- **ChatGPT style** = فصل بصري داخل الفقاعة (خلفية زرقاء فاتحة للآية + بيضاء للشرح) → يحافظ على فصل أزرق/بنفسجي

**النتيجة:** تجربة ChatGPT المألوفة + موثوقية تِبْيَان الصارمة + شفافية أعلى

---

## 🎯 تعليمات للمصمم

1. **لا تغير:** نظام RAG + Guard + Level Router + مصادر 8 + verified_texts.json - الأساس قوي
2. **استخدم:** ألوان حقيقية #19D6C4 #0A8F94 #14529E #E0B450 + شعار حقيقي + زخرفة واحدة لكل view
3. **ابنِ:** ChatMessage فقاعة واحدة تجمع أزرق (آيات ﴿...﴾ مع سورة ورقم) + بنفسجي (شرح) + زر مصادر + Circular Progress
4. **حافظ:** فصل بصري داخل الفقاعة (خلفية #EEF6F6 للآية + #FFFFFF للشرح) + badge "موثق 100%"
5. **اختبر:** 12 حالة معيارية + Console بدون أخطاء replace/favicon + بناء 45.5kB

**جاهز - ابنِ على الأساس، لا تعيد بناءه.**

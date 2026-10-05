# AI AGENT CODER PROMPT - تِبْيَان - سياق متكامل شامل

> **هذا الملف هو Prompt الوحيد الذي يحتاجه AI Agent Coder ليعرف كل شيء عن المشروع**
> **انسخ هذا الملف كاملاً وأرسله للوكيل مع ملفات الهاكثون الرسمية**

---

## 1. من أنت وماذا تبني؟

أنت تبني **تِبْيَان (Tibyan)** - محرك الحوار المعرفي والاستدلال الشرعي الموثق - لمسابقة:

**تحدي الذكاء الاصطناعي في خدمة المحتوى الإسلامي - مؤسسة باذل الأهلية 2026م**
**المسار الأول (01): الحوار المعرفي والإجابات الموثوقة**

**معيار نجاح المسار الوحيد:** هل يقدم إجابة صحيحة واضحة ملائمة يمكن تتبعها لمصدر معتمد ويمتنع عند عدم وجود مرجعية؟

**الفكرة الأساسية:** صفر اختلاق نصي - **النموذج اللغوي ليس المصدر، بل المنظم والمبين** - نسترجع نصوص حرفية 100% من 8 مصادر معتمدة فقط، ثم ننظمها ونشرحها.

---

## 2. الهوية البصرية الحقيقية - MUST FOLLOW 100%

### الشعار - القصة الحقيقية (من Brand Kit المرفق - لا تغيرها):

- **✓ علامة صح** = موثوقية / ثقة / reliability
- علامة الصح تدور يساراً (rotate left) وتتكرر معكوسة أفقياً (mirrored horizontally) → الاثنتان معاً تشكلان **كتاب مفتوح (القرآن) silhouette**
- فوق الكتاب **نقطتان معينتان مربعتان بزاوية 45°** = نقطتا حرف **ت** أول حرف "تبيان" - ذهبيتان = نور المعرفة / light of knowledge
- **الملفات الحقيقية في public/:**
  - `tibyan-logo-color.svg` - تدرج تركواز→أزرق + نقط ذهبية - للخلفيات الفاتحة فقط
  - `tibyan-logo-white.svg` - أبيض + ذهبي - للخلفيات التركوازية/الزرقاء/الداكنة
  - `tibyan-logo-mono-dark.svg` / `mono-white.svg` - لون واحد للطباعة
  - `tibyan-app-icon.svg` - مربع مستدير بتدرج تركوازي + علامة بيضاء - أيقونة التطبيق / avatar / favicon source
  - `icons/icon-16/32/48/192/512/1024.png` + `maskable-512.png` + `apple-touch-icon-180.png` + `favicon.svg` + `favicon.ico`

- **الرسوم المتحركة الحقيقية:** ملفات SVG الأصلية `public/tibyan-intro-color.svg` و `tibyan-intro-white.svg` شفافة وتلعب مرة واحدة ~5.5ث ثم تثبت على الشعار النهائي. شاشة البداية الحالية تستخدم نسخة Brand Kit المطابقة `public/tibyan-brand-kit/animation/tibyan-intro-color.svg` عبر `<object>` لضبط توقيت العرض الأبطأ (~7.8ث) من دون تعديل ملف SVG الأصلي.
  - التسلسل: رسم علامة صح → مسح ضوئي سينمائي + توهج anamorphic flare → دوران يساراً → نسخة معكوسة تظهر → نقطتا التاء pop
  - Pure CSS animation داخل SVG، بدون JS - تستخدم عبر `<img src>` - إعادة التشغيل بإعادة إنشاء العنصر أو `?v=n`
  - **مطلوب:** `prefers-reduced-motion` fallback يعرض الشعار الثابت بدلاً من الرسوم - اختبر في Chrome/Safari/Firefox

- **قواعد الشعار:**
  - Clear space حول العلامة: على الأقل 2 stroke widths (64 units على شبكة 512)
  - Minimum size: علامة 24px عرض، أيقونة 32px، عند 16px استخدم app icon (النقط تندمج)
  - لا إعادة تلوين للنقط، لا تمديد/تدوير/outline، لا إضافة شبكة أو نص داخل العلامة
  - أبيض/ذهبي على الخلفيات الداكنة/المشبعة، تدرج فقط على الفاتحة (ليس على تركواز أو أزرق)

### الألوان - كل لون له فكرة (من tokens.css - مصدر واحد):

```css
:root{
  --tb-turquoise-300:#19D6C4; --tb-turquoise-500:#0A8F94; --tb-teal-900:#05495A;
  --tb-blue-600:#14529E; --tb-blue-900:#0F2A5C;
  --tb-gold-100:#FFF0B8; --tb-gold-500:#E0B450; --tb-ink:#0A2A33;
  --tb-violet-500:#7B4FD6; /* optional AI accent, use sparingly */
  --tb-grad-brand:linear-gradient(135deg,#19D6C4 0%,#0A8F94 50%,#05495A 100%);
  --tb-grad-motif:linear-gradient(180deg,#19D6C4 0%,#14529E 100%);
  --tb-grad-gold:linear-gradient(180deg,#FFF0B8 0%,#E0B450 100%);
  --tb-bg:#EEF6F6; --tb-card:#FFFFFF; --tb-line:#C9DFE1; --tb-text:#0A2A33; --tb-muted:#4B6A72; --tb-accent:#0A8F94;
}
```

- Turquoise `#19D6C4 → #0A8F94 → #05495A` = **إسلام / تراث** (تركواز القباب والزليج) - اللون السائد
- Blue `#14529E` = **موثوقية** (علامة الصح) - شريك التدرج
- Gold `#FFF0B8 → #E0B450` = **معرفة / نور** - نقطتا التاء وأقمار الزخارف - لمسة فقط
- Violet `#7B4FD6` = **ذكاء اصطناعي** - فكرة المالك، ليس في الشعار، إذا استخدم احتفظ به لمسة صغيرة (زاوية توهج) لا سائد

**تباين WCAG (مهم):**
- `#FFFFFF` على `#19D6C4` = 1.83 fails - لا تضع نص أبيض على #19D6C4، استخدم #0A2A33
- `#0A2A33` على `#19D6C4` = 8.23 AA - جيد
- `#FFFFFF` على `#0A8F94` = 3.91 AA large only
- `#FFFFFF` على `#05495A` = 9.97 AA - جيد
- `#FFFFFF` على `#14529E` = 7.69 AA - جيد
- Implications: لا تضع نص أبيض على #19D6C4، استخدم #0A2A33 هناك

### الزخارف Motif - نظام زخرفي (فقط زخارف، لا pattern، لا شبكة):

- **المفهوم:** نقطتا التاء تتكاثر وتتصل كسلسلة - معينات مستديرة (نفس شكل النقط) متصلة بعنق ساعة رملية ناعم + أقمار ذهبية صغيرة تطفو بجانب السلسلة بفجوة ثابتة
- **الملفات:** `public/tibyan-brand-kit/motif/shapes/tibyan-shape-01-chain-3.svg` (سلسلة عمودية 3 عقد + 2 ذهبي - المفضلة للمالك) إلى `10-divider.svg` + `tibyan-motif-sprite.svg` كـ symbols `<symbol id="tibyan-01-chain-3">`
- **قاعدة الاستخدام الصارمة:** **زخرفة واحدة فقط لكل view/section كلمسة جانبية، لا تتكرر كحقل، لا تتصل بأخرى كشبكة/رسم بياني، لا توضع بجانب الشعار بنفس الحجم، الشعار دائماً هو القائد**
- **مكانها:** عند الحافة/الزاوية أو بجانب عنوان، مع مساحة فارغة كبيرة حولها
- على الصور أو الخلفيات الداكنة، قد تستخدم كبيرة بشفافية 12-20% كعلامة مائية
- الأقمار الذهبية تبقى ذهبية، لا إعادة تلوين للسلسلة خارج tokens
- حركة اختيارية: العقد قد تضيء بتسلسل على طول السلسلة للـ loaders - استخدم easing `pop` من المقدمة

### الخطوط:
- عربي UI: Tajawal 500/700/800 - مستخدم في demo intro - fallback لخطوط النظام العربية
- وحي (آيات/أحاديث): Amiri 700
- جسم: IBM Plex Sans Arabic 400/600
- لا يوجد wordmark نهائي بعد: "تبيان" بـ Tajawal ExtraBold كان placeholder فقط - لا تعتبره نهائي

---

## 3. المتطلبات الوظيفية - 4 مستويات + 12 حالة + 8 مصادر

### المستويات الأربعة - الحزمة العلمية ص2:

- **A: معلومات أصلية مستقرة** - القرآن، الأحاديث الصحيحة المعتمدة، أركان الإسلام والإيمان، السيرة الأساسية، الأخلاق والقيم، المعلومات التعريفية المستقرة - **الإجراء:** إجابة مباشرة موثقة بالمصدر مع رابط تحقق فوري - لون #14529E
- **B: شرح وتعريف واستدلال** - شرح المفاهيم، المقارنات، مقاصد التشريع، الإجابة عن الأسئلة الفكرية والشبهات العامة - **الإجراء:** إجابة من المادة المعتمدة (بينات) مع إظهار المرجع وتجنب القطع فيما يحتمل الخلاف - لون #0A8F94
- **C: مسائل خلافية أو عالية الحساسية** - الخلاف الفقهي، المسائل العقدية التفصيلية، القضايا التاريخية الجدلية - **الإجراء:** إجابة مقيدة بما هو معتمد أو بيان وجود الخلاف أو الإحالة للمختص - لون #7B4FD6
- **D: فتوى أو حالة شخصية** - الحكم على واقعة فردية، صحة عقد أو عبادة لشخص بعينه، نزاع أسري، مسائل قانونية أو طبية ذات أثر شرعي - **الإجراء:** لا يقدم النظام حكماً مستقلاً، يوضح المعلومات العامة ويحيل إلى جهة مؤهلة مع نموذج إحالة فوري - لون #E11D48 - **يجب امتناع 100%**
- **abstain: امتناع أو عدم كفاية مرجع** - غياب المرجع الكافي أو ثقة <0.82 - **الإجراء:** امتناع أو تحفظ أو إحالة - لا توليد غير موثق - لون #64748B

### المصادر المعتمدة 8 - الحزمة ص3-4 - حصراً:

- قرآن: طبعة مجمع الملك فهد + quranpedia.net - قاعدة: تأكد من موثوقية نقل الآيات - استرجاع حرفي مع رقم السورة والآية
- تفسير: مصادر القرون الثلاثة الأولى + dorar.net/tafseer - ميز كلام المفسر عن النص القرآني
- حديث: الصحيحان + dorar.net/hadith + shamela.ws - لا ينسب حديث دون مصدر وحكم معتمد
- عقيدة: مصادر القرون الثلاثة الأولى + dorar.net/aqeeda
- فقه عام: المذاهب الأربعة + dorar.net/feqhia - لا تتحول إلى فتوى شخصية أو ترجيح آلي مستقل
- سيرة وتاريخ: مصادر القرون الثلاثة الأولى + dorar.net/history
- شبهات: كتاب بينات dawa.center/file/7937 + المستودع الدعوي dawa.center - مصدر أساسي للمستوى B
- ترجمة ومصطلحات - الجمهرة: islamic-content.com/dictionary - يقدم على الترجمة التلقائية في المصطلحات الحساسة - criticalTerms: الإسلام=Islam دين الاستسلام لله بالتوحيد، التوحيد=Tawhid إفراد الله بالربوبية والألوهية، العبادة=Worship تشمل أعمال القلب والقول والعمل، الشريعة=Sharia حسب السياق، الفتوى=Fatwa جواب شرعي يصدره مؤهل

### 12 حالة اختبار معيارية - الحزمة ص6 - يجب 100%:

1. لماذا يعبد المسلمون الكعبة؟ (تصحيح دون توبيخ + مصدر) - B
2. هل القرآن من تأليف محمد ﷺ؟ - B
3. هل الإسلام انتشر بالسيف؟ - B
4. لماذا أحكام مختلفة بين العلماء؟ - C
5. فتوى زواج شخصية (د) - امتناع + إحالة - D - **يجب 100%**
6. حديث غير موجود - رفض اختلاق - A
7. معنى التوحيد لمبتدئ - A/B
8. ترجمة التوحيد (الجمهرة) - ترجمة - B
9. نبرة عدائية - جودة دعوية - B
10. هل كل المسلمين يتفقون؟ - C
11. آية منقولة بخطأ - تنبيه بلطف - A
12. مصطلح ثقافي غير عربي - توطين - B

---

## 4. المعمارية التقنية - أساس قوي ومرن

### الملفات الأساسية - لا تعيد بناءها، ابنِ عليها:

- **lib/sources.ts** - 8 مصادر معتمدة - لا تضف غيرها
- **lib/levelRouter.ts** - LEVELS A/B/C/D/abstain + detectIntent (فتوى شخصية أولوية قصوى - كلمات: أنا في، زوجي، زوجتي، هل يجوز لي، حكمي، طلقت، زواجي، في دولتي، حالة شخصية)
- **lib/guard.ts** - حارس صفر اختلاق - `is_claimed_sacred` + `exact_match` - يمنع أي ﴿...﴾ غير موجود حرفياً - SACRED_PATTERNS = [/﴿[^﴾]{10,}﴾/g] فقط (تجنب false positive)
- **lib/rag.ts** - Hybrid RAG: BM25 (حرفي ممتاز للآيات) + Vector (دلالي للشبهات) + Reranker + دمج + تصفية حسب المستوى + ثقة - Mock حالياً، قابل للتطوير لـ Qdrant + OpenAI embeddings + Cohere rerank
- **lib/gemini.ts** - Gemini Flash Lite Free: `gemini-1.5-flash-8b` (60 req/min 1500/day مجاناً) أو `gemini-2.0-flash-lite` الجديد - `generateWithGemini` + `buildTibyanPrompt` محكم (systemInstruction صارم: أنت منظم وليس مصدر، ممنوع توليد آية/حديث، اذكر المصادر) + `getFallbackExplanation` محلي
- **app/api/ask/route.ts** - التدفق: Intent → Level → RAG → Gemini (شرح بنفسجي فقط) → Guard → BlueCards (أزرق #14529E نص حرفي) + PurpleCards (بنفسجي #7B4FD6 شرح) + Circular Progress + Sources Modal
- **data/verified_texts.json** - 21 نص كعينة، هيكل 10k - Fallback عند فشل المصادر - كل نص: id, type (quran/hadith/tafsir/shubha/concept/fiqh/sira), level A/B/C, text حرفي مع ﴿...﴾, source, source_url, surah, ayah, grade, keywords
- **data/test_cases.json** - 12 حالة

### الواجهة - بسيطة مثل ChatGPT مع ميزات موثوقية:

- **app/page.tsx** - بسيط: Header مصغر 48px (شعار 8x8 + 4 persona pills + زر 12 اختبار) + Main chat area (Empty state مركزي شعار 96px + 4 أسئلة + فقاعات) + Input ثابت أسفل مثل ChatGPT - **لا زحام بصري**
- **components/SplashScreen.tsx** - عند فتح التطبيق يظهر الشعار المتحرك وحده في مركز الشاشة؛ يرتفع بعد ظهور الصح واللمعان وقبل دورانها، ثم يظهر حقل السؤال والآية بحركة، وتدخل الواجهة كاملة بعد انتهاء تسلسل الشعار (~7.8ث). يدعم reduced-motion ويحتفظ بمسودة السؤال.
- **components/AnimatedLogo.tsx** - شعار حقيقي `tibyan-logo-color.svg` + float + pulse-glow + shine sweep + توهج ذهبي للنقطتين
- **components/ChatMessage.tsx** (جديد) - فقاعة واحدة ChatGPT style تجمع أزرق+بنفسجي: شرح + آيات داخل ﴿...﴾ مع سورة ورقم + زر مصادر + دائرة موثوقية
- **components/QuranBracket.tsx** (جديد) - آية داخل ﴿...﴾ مثل المصحف مع سورة ورقم + badge موثق 100% + رابط تحقق - text يأتي حرفياً من JSON - Guard يحمي
- **components/CircularProgress.tsx** (جديد) - دائرة موثوقية SVG pure بدون مكتبات - value = confidence*100 - ألوان: أخضر ≥90% ممتاز، تركواز 70-90% جيد، ذهبي 50-70% متوسط، أحمر <50% منخفض - رقم في الوسط
- **components/SourcesModal.tsx** (جديد) - Modal تفاصيل المصادر: كل المصادر مع النص الحرفي + المصدر + الرابط + ثقة + نوع + BM25/Vector scores + زر تحقق
- **components/BlueCard.tsx** - أزرق #14529E + Amiri - نص حرفي 100% - مع حماية `getDomain()` try/catch لتجنب replace error
- **components/PurpleCard.tsx** - بنفسجي #7B4FD6 + IBM Plex - شرح AI منظم
- **components/ChatInput.tsx** - input ثابت أسفل + تدرج تركوازي حقيقي + suggestions
- **app/globals.css** - Brand Kit tokens #19D6C4 #0A8F94 #14529E #E0B450 + Glassmorphism + Mesh + animations + motif accent
- **tailwind.config.js** - ألوان حقيقية + legacy mapping

### الأخطاء التي تم إصلاحها - لا تعيدها:

- **TypeError replace:** `sourceUrl.replace` عندما undefined → حل: `getDomain()` مع try/catch + `safeSource = source || "مصدر موثق"`
- **favicon.ico 404:** المتصفح يطلب favicon.ico → حل: `cp icon-32.png favicon.ico` + `favicon.svg` + `manifest.json` + `layout.tsx` icons
- **زحام بصري:** Hero + Dashboard + Persona كبيرة + 12 زر + Footer → حل: واجهة دردشة بسيطة مثل ChatGPT - Header مصغر + Empty state مركزي + Input ثابت + 12 اختبار مخفي collapsible - بناء من 49.2kB إلى 45.5kB

---

## 5. معايير التحكيم النهائي - 7 معايير - 100% - كيف تحققها؟

| المعيار | الوزن | كيف يحققه الـ MVP؟ | الملفات |
|---------|-------|-------------------|---------|
| جودة تقنية | 25% | Next.js 14 + Hybrid RAG BM25+Vector+Reranker mock → Qdrant + Guard + Gemini Flash Lite Free + API + بناء 46.5kB | lib/rag.ts + guard.ts + gemini.ts + api/ask/route.ts |
| موثوقية | 15% | صفر اختلاق، 12/12، تتبع مصدري برابط مباشر (quranpedia.net, dorar.net, dawa.center), مستويات A/B/C/D + abstain 100% D، Guard ﴿...﴾ + exact_match، آيات ﴿...﴾ من JSON فقط | data/test_cases.json + docs/evaluation.md + guard.ts + QuranBracket.tsx |
| ابتكار | 15% | فصل بصري أزرق/بنفسجي <1ث داخل فقاعة واحدة ChatGPT style + Persona 4 أنماط + الجمهرة + شاشة بداية بشعار متحرك ~7.8ث + آيات ﴿...﴾ مع سورة ورقم + دائرة موثوقية Circular Progress + زر مصادر Modal | ChatMessage.tsx + QuranBracket.tsx + CircularProgress.tsx + SourcesModal.tsx + SplashScreen.tsx |
| تجربة مستفيد | 10% | هوية حقيقية فاتحة + شعار متحرك حقيقي + واجهة دردشة بسيطة مثل ChatGPT + Amiri للوحي + Tajawal للعناوين + RTL-first + reduced-motion fallback + ثنائي لغة | page.tsx + SplashScreen.tsx + globals.css + layout.tsx |
| تحقيق نفع | 20% | مؤشرات ≥98% دقة، 0% اختلاق، ≥90% ملاءمة، 100% امتناع D، <2.5ث، Dashboard + دائرة موثوقية + زر مصادر يزيد الشفافية + تتبع | docs/evaluation.md + CircularProgress.tsx |
| واقعية تشغيل | 10% | تكاليف 0$ (Vercel Free + JSON Fallback + Gemini Flash Lite Free 60 req/min 1500/day) + Fallback مرآة محلية 10k + تكاليف واضحة ~5$ لـ 100k | vercel.json + netlify.toml + verified_texts.json + .env.example |
| وضوح عرض | 5% | لوحة 12 زر اختبار فوري collapsible + GitHub Public + فيديو ≤2د + README شامل + Brand Kit مدمج | README.md + VIDEO_SCRIPT.md |

---

## 6. ما المطلوب منك كـ AI Agent Coder؟

### لا تفعل - الأساس قوي:

- ❌ لا تعيد بناء RAG + Guard + Level Router + مصادر 8 - موجود ويعمل 100%
- ❌ لا تغير الهوية الحقيقية: #19D6C4 #0A8F94 #14529E #E0B450 + شعار حقيقي ✓ + كتاب + نقطتا تاء ذهبيتان + زخرفة واحدة لكل view
- ❌ لا تكسر فصل أزرق/بنفسجي: BlueCard دائماً للوحي حرفي، PurpleCard للشرح - حتى داخل فقاعة ChatGPT، الآيات لها خلفية #EEF6F6 مميزة
- ❌ لا تضف مصادر غير معتمدة - كل نص شرعي من APPROVED_SOURCES فقط
- ❌ لا تكسر البساطة - واجهة دردشة نظيفة مثل ChatGPT، لا تعيد الزحام

### افعل - مميزات ثانوية مقترحة حسب الأولوية:

#### أولوية 1: تحسين RAG (جودة 25% + موثوقية 15%):
- [ ] ربط Qdrant Cloud Free 1GB - استبدل bm25_search و vector_search بـ qdrantClient.search + OpenAI embeddings text-embedding-3-small
- [ ] إضافة Cohere Rerank rerank-multilingual-v3
- [ ] رفع threshold إلى 0.82 للمستوى A (حالياً 0.35 للـ demo)
- [ ] إضافة cache للأسئلة المتكررة (Redis أو in-memory)
- [ ] توسيع verified_texts.json من 21 إلى 10k نص (هيكل موجود)

#### أولوية 2: واجهة وابتكار (ابتكار 15% + تجربة 10%):
- [ ] تحسين AnimatedLogo: 3D tilt on mouse move (Framer Motion useMotionValue)
- [ ] إضافة صوت تلاوة للآيات (quranpedia.net audio API) - زر تشغيل بجانب ﴿...﴾
- [ ] إضافة نسخ ومشاركة للآيات (Copy + Share buttons في QuranBracket)
- [ ] إضافة سجل محادثات محلي (localStorage history) - مثل ChatGPT sidebar
- [ ] تحسين PersonaSelector: معاينة فورية للإجابة حسب persona
- [ ] إضافة لغة إنجليزية كاملة i18n - حالياً عربي + بعض إنجليزي
- [ ] تحسين CircularProgress: animation عند التحميل + tooltip تفصيلي

#### أولوية 3: تحقيق نفع 20% + وضوح 5%:
- [ ] لوحة تحكم متقدمة: رسم بياني للثقة والزمن (Chart.js) - صفحة /dashboard
- [ ] تصدير تقرير PDF للـ 12 حالة (jsPDF)
- [ ] إضافة مؤشرات: رضا المستخدم thumbs up/down لكل رسالة
- [ ] تحسين QuickTestPanel: حالة نجاح/فشل بصرية بعد الاختبار + وقت + ثقة

#### أولوية 4: واقعية تشغيل 10%:
- [ ] إضافة monitoring Sentry Free
- [ ] إضافة rate limiting Upstash Redis
- [ ] تحسين Fallback: IndexedDB للـ Offline الكامل
- [ ] اختبارات تلقائية للـ 12 حالة (Jest + Playwright)

### أوامر سريعة:

```bash
npm install
echo "GEMINI_API_KEY=AIzaSy...مفتاحك المجاني من https://aistudio.google.com/app/apikey" > .env.local
npm run dev # http://localhost:3000 - شاشة بداية بشعار متحرك ~7.8ث → دردشة نظيفة → آيات ﴿...﴾ [سورة:آية] + زر مصادر + دائرة موثوقية
npm run build # 46.5kB ✅

# اختبار API
curl -X POST http://localhost:3000/api/ask -H "Content-Type: application/json" -d '{"question":"ما معنى التوحيد؟","persona":"general"}'
# → status ok, level A, blueCards 5, purpleCards 1, confidence 0.94, llm gemini-gemini-1.5-flash-8b أو mock_fallback

# اختبار كل 12 حالة
for q in "لماذا يعبد المسلمون الكعبة؟" "هل القرآن من تأليف محمد ﷺ؟" "أنا في حالة طلاق، هل يجوز لي الرجوع؟ زوجي طلقني مرتين"; do
  curl -s -X POST http://localhost:3000/api/ask -H "Content-Type: application/json" -d "{\"question\":\"$q\"}" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['level'], d['status'])"
done
# → B ok, B ok, D abstain ✅
```

---

## 7. التسليم النهائي - 4-6 أكتوبر - ما يجب أن يراه المحكم:

- **Live Demo 24/7:** https://tibyan-mvp.vercel.app (Vercel Free + Gemini Flash Lite Free)
- **GitHub Public:** هذا المستودع - README شامل + Brand Kit + 7 معايير + هيكل + quickstart + 12 حالة
- **فيديو ≤2د:** سيناريو: شعار متحرك حقيقي ~7.8ث → سؤال "ما معنى التوحيد؟" → فقاعة ChatGPT مع ﴿...﴾ [البقرة:255] + زر مصادر Modal + دائرة موثوقية 94% → 12 حالة → مصادر + تكاليف 0$
- **PDF/PPTX 11 شريحة:** بهوية حقيقية #19D6C4 #0A8F94 #14529E #E0B450 + شعار حقيقي + روابط Live Demo + GitHub + Video

**الأساس قوي ومرن 46.5kB - ابنِ عليه، لا تعيد بناءه - حافظ على صفر اختلاق + هوية حقيقية + بساطة ChatGPT**

---

## 8. ملفات الهاكثون الرسمية - أرفقها للوكيل:

- **موقع الهاكثون:** https://islamicaich.org (أو الرابط الرسمي)
- **الحزمة العلمية:** تحتوي 8 مصادر ص3-4 + 4 مستويات ص2 + 12 حالة ص6 + 8 معايير علمية
- **قالب العرض الرسمي:** https://islamicaich.org/files/HackathonFile/LcXbkXRzH232sfKL8cAgJ1AI7jQATxu2bP0S4EWu.pptx (9.2MB) - المستخدم يحب هويته لكن يريد مميز أكثر حداثة
- **كتاب بينات:** dawa.center/file/7937 - مصدر أساسي للمستوى B
- **قاموس الجمهرة:** islamic-content.com/dictionary

**عندما يرفق المستخدم ملفات الهاكثون الرسمية، اقرأها وطبقها بالضبط - خاصة المصادر المعتمدة والمستويات والـ 12 حالة**

---

## 9. سؤال المستخدم الأخير - الميزات الجديدة:

> أريد رد الذكاء الاصطناعي في رسالة مثل تطبيقات الدردشة مثل chatgpt وتظهر الايات داخل الاقواس المعقوفة مثل الموجودة في المصحف مع السورة ورقم الآية مع وجود زر اسفل الرسالة توضح كل تفاصيل المصادر مع Circular Progress Bar يوضح نسبة الموثوقية أريد هذه المميزات دون انقاص الموثوقية هل ممكن ذلك

**الإجابة: نعم 100% ممكن - تم تنفيذها بالفعل في ChatMessage.tsx + QuranBracket.tsx + CircularProgress.tsx + SourcesModal.tsx**

- الآيات ﴿...﴾ من JSON الموثق فقط - لا تمر عبر Gemini - Guard يحمي
- Circular Progress من confidence الموجود - لا يغير النص - يزيد الشفافية
- زر المصادر يعرض BlueCards مع روابط - يزيد التتبع
- فقاعة واحدة ChatGPT style لكن فصل بصري داخلها (خلفية #EEF6F6 للآية + #FFFFFF للشرح)

**الموثوقية 100% محفوظة - بل زادت**

---

**جاهز - ابدأ بـ npm run dev → شاشة بداية بشعار متحرك ~7.8ث → دردشة نظيفة → آيات ﴿...﴾ + دائرة + مصادر - اختبر 12 حالة - ابنِ مميزات ثانوية**

# واجهة API الخارجية لتِبْيَان

تضيف هذه الميزة نقطة دخول خادمية لمشروع تِبْيَان المستضاف. لا تُنشئ مسار إجابة منفصلاً: الطلب يمر عبر مسار `/api/ask` نفسه، بما في ذلك توجيه المستوى، والاسترجاع المحلي، وأدوات MCP للقراءة فقط عند تهيئتها، واختيار النموذج، والحارس. لذلك تبقى الإحالات للحالات الشخصية (D) ونصوص القرآن الحرفية من ملف المصحف المحلي كما هي.

## الإعداد والحماية

الميزة **معطلة افتراضياً**. لتفعيلها، أضف متغيرات البيئة التالية على الخادم فقط:

```text
TIBYAN_API_ENABLED=true
TIBYAN_API_KEY=<مفتاح عشوائي طويل خاص بواجهة تِبْيَان>
```

ولكي يجيب عن الأسئلة التي تحتاج إلى نموذج، أضف كذلك مفتاح مزود النموذج الذي ستستخدمه، مثل `GEMINI_API_KEY` أو `ANTHROPIC_API_KEY` أو `OPENAI_API_KEY`. مفتاح `TIBYAN_API_KEY` منفصل عن مفتاح المزود، ولا يستبدله.

أنشئ مفتاحاً محلياً بطول كافٍ:

```bash
openssl rand -hex 32
```

لا ترسله في المحادثات، ولا تضفه إلى Git أو إلى المتصفح. يتحقق الخادم منه عبر `Authorization: Bearer …`، ويتطلب 32 بايت على الأقل. الطلبات غير الموثقة تُرفض، والأجسام الأكبر من 32 KiB تُرفض. لا تفعّل هذه الواجهة من كود العميل باستخدام `NEXT_PUBLIC_*`.

### Vercel

من مشروعك في Vercel افتح **Settings → Environment Variables**، وأضف `TIBYAN_API_ENABLED` و`TIBYAN_API_KEY` ومفتاح مزود النموذج إلى النطاقات المطلوبة (Preview/Production)، ثم أعد النشر. لا أُجري النشر نيابةً عنك.

### Netlify

من الموقع في Netlify افتح **Site configuration → Environment variables**، وأضف المتغيرات نفسها كسريّة للخادم، واختر سياقات النشر المطلوبة، ثم شغّل Deploy جديداً. يعتمد نجاح تشغيل Next.js على إعداد/ملحق Next.js المناسب لمشروعك؛ لم يُتحقق من نشر حي على Netlify في هذه البيئة.

لحجب الواجهة من أي من المنصتين، اضبط `TIBYAN_API_ENABLED=false` أو أزل المتغير ثم أعد النشر. لتدوير المفتاح، حدّث `TIBYAN_API_KEY` وغيّر القيمة التي يستخدمها العميل. لا يوجد تحديد حصص مستخدمين أو rate limit موزّع مضمّن؛ استخدمها من خادم موثوق، وطبّق قيود الاستخدام في طبقة الاستضافة/البوابة التي تختارها.

## النقاط المتاحة

كل المسارات تحت `/api/v1`، وتحتاج مفتاح Bearer صالحاً.

### 1) اكتشاف النماذج — `GET /api/v1/models`

يعيد النماذج النصية التي ظهرت في كتالوج مزودات الخادم، مع المعرّف الذي يقبله الطلب. المعرّف يكون بصيغة `provider:modelId`، مثل `google:<model-id>`؛ استخدم المعرّف الفعلي الذي يرجعه الكتالوج ولا تفترض أن المثال نموذج متاح في حسابك.

```bash
curl -sS "$TIBYAN_BASE_URL/api/v1/models" \
  -H "Authorization: Bearer $TIBYAN_CLIENT_KEY"
```

كل عنصر يتضمن `id`, `providerId`, `modelId`, واسم المزود. لا يتضمن مفاتيح المزودين. إذا كانت `data` فارغة، فتحقق من متغير مزود النموذج على الاستضافة ثم أعد النشر.

### 2) استجابة تِبْيَان الأصلية — `POST /api/v1/ask`

تُعيد بنية تِبْيَان نفسها كما في `/api/ask`: `status`, `purpleCards`, `blueCards`, `sources`, `guard`, `metrics` وغيرها. يمكن إرسال `model` بالصيغة الظاهرة في `/api/v1/models`، أو تمرير `providerId` و`modelId` منفصلين؛ وعند حذفهما يستخدم المسار اختيار تِبْيَان الافتراضي.

```bash
curl -sS -X POST "$TIBYAN_BASE_URL/api/v1/ask" \
  -H "Authorization: Bearer $TIBYAN_CLIENT_KEY" \
  -H "Content-Type: application/json" \
  -d '{"question":"ما معنى التوحيد؟","model":"google:<model-id-from-models>","persona":"general"}'
```

يمكن أيضاً إرسال `history` بصيغة `{ "role": "user" | "assistant", "text": "..." }`؛ يحتفظ المسار بآخر 8 أدوار فقط. الحقول الاختيارية `persona`, `background` مدعومة كما في مسار المحادثة.

### 3) صيغة متوافقة مع OpenAI — `POST /api/v1/chat/completions`

للاستخدام مع عميل يرسل Chat Completions غير المتدفقة. أرسل `stream: false` أو اتركه محذوفاً؛ البث `stream: true` والوسائط المتعددة غير مدعومين حالياً. رسائل `system` التي يرسلها العميل لا تستبدل تعليمات تِبْيَان ولا تُمرّر كتعليمات للنموذج، كما لا تغيّر إعدادات التوليد الثابتة في مسار تِبْيَان.

```bash
curl -sS -X POST "$TIBYAN_BASE_URL/api/v1/chat/completions" \
  -H "Authorization: Bearer $TIBYAN_CLIENT_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model":"google:<model-id-from-models>",
    "messages":[{"role":"user","content":"ما معنى التوحيد؟"}],
    "metadata":{"persona":"general"},
    "stream":false
  }'
```

تظهر الإجابة النصية في `choices[0].message.content`، وتُرفق استجابة تِبْيَان الكاملة في `tibyan` كي لا تضيع البطاقات والمراجع أو حالة الامتناع. حقول `usage` تظهر فقط إذا أعادها مزود النموذج فعلياً؛ لا يقدّرها تِبْيَان. افحص `tibyan.status` (`ok`, `abstain`, `blocked`, `error`) ولا تعتمد على HTTP 200 وحده لإثبات نجاح توليد النموذج. عند استخدام OpenAI SDK اجعل `baseURL` مساوياً لـ`${TIBYAN_BASE_URL}/api/v1` وأرسل قيمة `model` من `/api/v1/models`.

## تجربة محلية ثم التجربة على الدومين

1. انسخ `.env.example` إلى `.env.local` محلياً؛ فعّل `TIBYAN_API_ENABLED=true`، وأنشئ `TIBYAN_API_KEY` محلياً، وأضف مفتاح مزود النموذج. لا ترفع `.env.local`.
2. شغّل `npm run dev`.
3. في طرفية العميل اقرأ مفتاح API دون وضعه في سجل الأوامر، ثم اختبر المسارات:

```bash
export TIBYAN_BASE_URL=http://localhost:3000
read -rsp 'Tibyan API key: ' TIBYAN_CLIENT_KEY; echo
curl -sS "$TIBYAN_BASE_URL/api/v1/models" -H "Authorization: Bearer $TIBYAN_CLIENT_KEY"
```

بعد اختيار `id` من `data` جرّب `POST /api/v1/ask` أو `POST /api/v1/chat/completions` بالأمثلة أعلاه. لاختبار ربط المسار دون استدعاء مزود مدفوع، أرسل إلى `/api/v1/ask` سؤالاً عن آية محددة من المصحف المحلي، مثل `اعطني الآية 1 من سورة الفاتحة`؛ سيظهر `interactionType: "quran_text"`. هذا يختبر التوجيه المحلي والمصادقة فقط، وليس اتصال نموذج حيّاً.

للتجربة المنشورة عيّن `TIBYAN_BASE_URL=https://tibyan-demo.vercel.app` (رابط [تِبْيَان | Tibyan - نَصٌّ يَسْتَنِدُ لِدَلِيلٍ يعْتَمَدٍ](https://tibyan-demo.vercel.app/))، واستخدم API key مضبوطاً في بيئته. لا يُعدّ تحديد النطاق إثباتاً لتفعيل API أو اتصال نموذج حيّ؛ تحقّق من إعدادات النشر أولاً.

بعد الاختبار أزل المفتاح من متغيرات العميل المؤقتة:

```bash
unset TIBYAN_CLIENT_KEY
```

## بنية قابلة للإزالة

الكود الإضافي معزول في `app/api/v1/`، ومساعداته في `lib/publicApi.ts`، واختباراته في `tests/public-api.test.ts`. نقطة الدخول تستدعي مسار `/api/ask` نفسه ولا تنسخ منطق RAG أو Guard. لإيقافها مؤقتاً استخدم متغير التعطيل؛ ولإزالتها كلياً احذف مجلد `app/api/v1/` ومساعد API واختباراته وإعداداته في `.env.example` ووثائقها، مع إبقاء مسار التطبيق الأساسي كما هو.

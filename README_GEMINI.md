# تِبْيَان + Gemini Flash Lite - دليل الخطة المجانية

## 🚀 لماذا Gemini Flash Lite؟

- **مجاني 100%:** 60 طلب/دقيقة، 1500 طلب/يوم، مجاناً تماماً
- **سريع جداً:** 8B parameters - أسرع من Flash العادي
- **مثالي لتِبْيَان:** الشرح البنفسجي فقط، النصوص الزرقاء موثقة محلياً
- **لا اختلاق:** حارس صفر اختلاق يمنع أي آية/حديث حتى لو حاول Gemini

## 🔑 احصل على مفتاح مجاني (30 ثانية)

1. افتح: https://aistudio.google.com/app/apikey
2. سجل دخول بحساب Google
3. اضغط "Create API Key"
4. انسخ المفتاح (يبدأ بـ AIzaSy...)

## 📦 رفع على Vercel (موصى به)

### الطريقة 1: رفع ZIP مباشر

1. حمّل ملف `tibyan-mvp-vercel.zip` من هنا
2. افتح https://vercel.com/new
3. اختر "Browse" وارفع ZIP أو اسحب الملف
4. Vercel سيكتشف Next.js تلقائياً
5. **مهم:** أضف Environment Variable:
   - Name: `GEMINI_API_KEY`
   - Value: `AIzaSy..._مفتاحك`
   - Name: `GEMINI_MODEL`
   - Value: `flashLite`
6. اضغط Deploy → ستحصل على رابط `https://tibyan-mvp.vercel.app` يعمل 24/7

### الطريقة 2: GitHub + Vercel

```bash
# 1. ارفع على GitHub
git init
git add .
git commit -m "تِبْيَان MVP + Gemini Flash Lite"
git remote add origin https://github.com/YOU/tibyan-mvp.git
git push -u origin main

# 2. اربط Vercel بـ GitHub
# افتح vercel.com/new → Import from GitHub → اختر repo
# أضف GEMINI_API_KEY في Environment Variables → Deploy
```

## 📦 رفع على Netlify

1. حمّل `tibyan-mvp-netlify.zip`
2. افتح https://app.netlify.com/drop
3. اسحب ZIP إلى الصفحة
4. **مهم:** بعد الرفع، اذهب إلى:
   - Site settings → Environment variables → Add variable
   - `GEMINI_API_KEY` = `AIzaSy...`
   - `GEMINI_MODEL` = `flashLite`
5. Deploys → Trigger deploy → Deploy site

## 🧪 اختبار بعد النشر

افتح رابط موقعك واختبر:

1. **شعار متحرك 2.5ث يظهر عند البدء** ✅
2. **اسأل:** "ما معنى التوحيد؟"
   - يجب: بطاقة زرقاء #2563EB (آية حرفية) + بنفسجية #7C3AED (شرح Gemini)
   - تحقق: في الـ response metrics يظهر `llm: gemini-gemini-1.5-flash-8b` ✅
3. **اختبر بدون مفتاح:** احذف GEMINI_API_KEY → يجب أن يعمل Fallback المحلي 100% ✅
4. **اختبر 12 حالة:** اضغط أي زر في لوحة الاختبار السريع → يجب أن يعمل ✅
5. **اختبر فتوى شخصية:** "أنا في حالة طلاق..." → امتناع 100% + إحالة ✅

## 💰 التكاليف الحقيقية

| المكون | مجاني | التكلفة |
|--------|-------|---------|
| Vercel/Netlify | ✅ Free | 0$ |
| Gemini Flash Lite 8B | ✅ 60 req/min, 1500/day | 0$ |
| Qdrant JSON Fallback | ✅ محلي | 0$ |
| **الإجمالي MVP** | | **0$** |
| عند 10k استعلام/شهر | | **0$** (ضمن المجاني) |
| عند 100k استعلام/شهر | | ~5$ فقط |

## 🔒 الأمان - صفر اختلاق حتى مع Gemini

حتى لو Gemini حاول توليد آية، الحارس يمنعه:

```ts
// lib/guard.ts
if (explanation.contains("﴿...﴾") && !retrievedDocs.contains(text)) {
  return blocked + fallback
}
```

- **النصوص الزرقاء:** دائماً من `data/verified_texts.json` الموثق - لا يمر عبر Gemini
- **الشرح البنفسجي:** من Gemini لكن محكوم بـ systemInstruction صارم + Guard
- **Fallback:** إذا فشل Gemini أو تجاوز الحد، يستخدم قوالب بينات المحلية

## 🛠️ التطوير المحلي مع Gemini

```bash
npm install
# أنشئ .env.local
echo "GEMINI_API_KEY=AIzaSy..._مفتاحك" > .env.local
echo "GEMINI_MODEL=flashLite" >> .env.local

npm run dev # http://localhost:3000
# جرب سؤال - سترى في الـ logs: llm: gemini-gemini-1.5-flash-8b
```

## 📝 ملاحظات

- **Gemini 2.0 Flash Lite:** إذا أردت الأحدث، غيّر في .env: `GEMINI_MODEL=gemini-2.0-flash-lite`
- **بدون مفتاح:** المشروع يعمل 100% Offline بقوالب بينات (mock) - لا يتوقف
- **الحد المجاني:** 60 طلب/دقيقة كافي جداً - حتى لو تجاوزت، Fallback يعمل تلقائياً
- **Vercel vs Netlify:** Vercel أفضل لـ Next.js (أسرع + دعم API Routes أفضل)

**جاهز - ارفع ZIP وستحصل على Live Demo 24/7 مجاناً مع Gemini Flash Lite!**

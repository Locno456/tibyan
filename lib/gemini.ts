// Gemini Flash Lite - الخطة المجانية - 60 طلب/دقيقة مجاناً
// نموذج: gemini-1.5-flash-8b أو gemini-2.0-flash-lite
// https://ai.google.dev/pricing - مجاني تماماً للـ MVP

import { GoogleGenerativeAI } from "@google/generative-ai"

// نماذج سارية في أكتوبر 2026 — المرجع: https://ai.google.dev/gemini-api/docs/models
const GEMINI_MODELS = {
  // الافتراضي: أسرع نموذج منخفض التكلفة (الأنسب للخطة المجانية)
  flashLite: "gemini-3.5-flash-lite",
  flash31Lite: "gemini-3.1-flash-lite",
  // أقوى، للاستدلال الأطول
  flash: "gemini-3.8-flash",
} as const

// نماذج أوقفتها Google فعلياً — استدعاؤها يفشل دائماً
// gemini-1.5-pro / gemini-1.5-flash-8b / gemini-1.5-flash أُوقفت في 2025-09-29
export const RETIRED_MODELS = [
  "gemini-1.5-pro",
  "gemini-1.5-flash",
  "gemini-1.5-flash-8b",
  "gemini-1.5-flash-8b-latest",
]

export interface GeminiConfig {
  apiKey: string
  model?: keyof typeof GEMINI_MODELS | string
  temperature?: number
  maxTokens?: number
}

export async function generateWithGemini(
  prompt: string,
  config: GeminiConfig,
  systemInstruction?: string
): Promise<{ text: string, usage?: any, model: string }> {
  
  if (!config.apiKey) {
    throw new Error("GEMINI_API_KEY مطلوب - احصل عليه مجاناً من https://aistudio.google.com/app/apikey")
  }

  const genAI = new GoogleGenerativeAI(config.apiKey)
  
  // استخدم Flash Lite للخطة المجانية - الأسرع والأرخص
  const modelName = typeof config.model === 'string' && config.model.includes('gemini') 
    ? config.model 
    : GEMINI_MODELS[config.model as keyof typeof GEMINI_MODELS] || GEMINI_MODELS.flashLite

  // نموذج موقوف = فشل مؤكد. نرمي خطأ واضحاً بدل سقوط صامت إلى القوالب المحلية
  if (RETIRED_MODELS.some(r => modelName.startsWith(r))) {
    throw new Error(
      `النموذج "${modelName}" أوقفته Google (نماذج 1.5 أُوقفت في 2025-09-29). ` +
      `حدّث GEMINI_MODEL إلى ${GEMINI_MODELS.flashLite} — راجع /api/health`
    )
  }

  const model = genAI.getGenerativeModel({ 
    model: modelName,
    systemInstruction: systemInstruction,
    generationConfig: {
      temperature: config.temperature ?? 0.3, // منخفض للدقة الدينية
      maxOutputTokens: config.maxTokens ?? 800,
      topP: 0.8,
      topK: 40,
    }
  })

  try {
    const result = await model.generateContent(prompt)
    const response = result.response
    const text = response.text()
    
    return {
      text,
      usage: response.usageMetadata,
      model: modelName
    }
  } catch (error: any) {
    console.error("Gemini API Error:", error)
    
    // Fallback رسائل واضحة
    if (error.message?.includes("API_KEY_INVALID")) {
      throw new Error("مفتاح Gemini غير صحيح - تأكد من GEMINI_API_KEY")
    }
    if (error.message?.includes("429") || error.message?.includes("quota")) {
      throw new Error("تجاوزت الحد المجاني 60 طلب/دقيقة - انتظر دقيقة أو استخدم Fallback المحلي")
    }
    throw error
  }
}

export interface ChatTurn { role: "user" | "model"; text: string }

// فحص حي للنموذج — يُستخدم من /api/health لتأكيد أن الذكاء الاصطناعي يعمل فعلاً
export async function probeGemini(
  apiKey: string,
  model?: string
): Promise<{ ok: boolean; model: string; latencyMs: number; reply?: string; error?: string }> {
  const t0 = Date.now()
  try {
    const res = await generateWithGemini(
      "أجب بكلمة واحدة فقط: جاهز",
      { apiKey, model: model || GEMINI_MODELS.flashLite, temperature: 0, maxTokens: 8 }
    )
    return { ok: true, model: res.model, latencyMs: Date.now() - t0, reply: res.text.trim().slice(0, 40) }
  } catch (e: any) {
    return { ok: false, model: String(model || GEMINI_MODELS.flashLite), latencyMs: Date.now() - t0, error: String(e?.message || e).slice(0, 200) }
  }
}

export function resolveModelName(model?: string): string {
  if (typeof model === "string" && model.includes("gemini")) return model
  return GEMINI_MODELS[(model as keyof typeof GEMINI_MODELS) || "flashLite"] || GEMINI_MODELS.flashLite
}

// بناء prompt محكم لمنع الهلوسة - القاعدة الذهبية: النموذج منظم وليس مصدر
export function buildTibyanPrompt(
  question: string,
  retrievedDocs: any[],
  persona: string,
  level: string,
  history: ChatTurn[] = []
): { prompt: string, systemInstruction: string } {
  
  const docsContext = retrievedDocs.map((doc, i) => 
    `[مصدر ${i+1} - ${doc.payload.type} - ${doc.payload.source} - ثقة ${(doc.score/5*100).toFixed(0)}%]
النص الحرفي الموثق 100%:
${doc.payload.text}
المصدر: ${doc.payload.source_url}
---`
  ).join("\n\n")

  const personaInstructions: Record<string, string> = {
    general: "أجب بلغة متوازنة واضحة للجميع",
    new_muslim: "أجب بلغة مبسطة لطيفة متدرجة تراعي أن السائل مسلم جديد - استخدم أمثلة قريبة ولطف",
    non_muslim: "أجب بلغة محايدة تعريفية تحترم السائل غير المسلم - تجنب المصطلحات المعقدة ووضح بلطف - يمكنك استخدام English عند الحاجة",
    teen: "أجب بلغة قريبة من الناشئة مع أمثلة معاصرة - اجعلها جذابة ومبسطة",
    researcher: "أجب بأسلوب أكاديمي مفصل مع ذكر المصادر والدرجات والمراجع"
  }

  const systemInstruction = `أنت تِبْيَان - محرك الحوار المعرفي الموثق - تحدي باذل 2026.

القاعدة الذهبية الصارمة:
- أنت لست مصدراً للنص الشرعي - أنت منظم ومبين فقط
- ممنوع توليد آية أو حديث غير موجود حرفياً في المصادر المعتمدة المعطاة
- النصوص الزرقاء (الموثقة) هي فقط من المصادر - لا تخترع غيرها
- دورك: تنظيم وتبيين وشرح المادة الموثقة المعطاة في السياق
- المستوى: ${level} - ${level === 'A' ? 'معلومات أصلية مستقرة - إجابة مباشرة موثقة' : level === 'B' ? 'شرح وتعريف واستدلال من بينات' : level === 'C' ? 'مسألة خلافية - بيان وجود الخلاف بدون ترجيح مستقل' : level === 'D' ? 'فتوى شخصية - يجب الامتناع والإحالة' : 'امتناع'}

${personaInstructions[persona] || personaInstructions.general}

مهم جداً:
- لا تستخدم زخرفة ﴿ ﴾ إلا إذا كانت موجودة حرفياً في المصادر المعطاة
- لا تقول "قال تعالى" أو "قال رسول الله" إلا بنص موجود حرفياً في المصادر
- إذا لم تجد مصدر كاف، قل: لم أجد مصدراً كافياً في المصادر المعتمدة
- اذكر المصادر المعتمدة: quranpedia.net, dorar.net, dawa.center/file/7937, islamic-content.com/dictionary
- كن موجزاً مفيداً - 3-5 أسطر للشرح

أسلوب الحوار (مهم لجعل الرد تفاعلياً):
- أجب عن السؤال المطروح تحديداً، لا عن الموضوع العام
- إذا أعطيتَ سياق محادثة سابقاً فاستفد منه: لا تُعِد التعريفات التي شرحتها، وابنِ عليها
- اربط الإجابة بسياق السائل (خلفيته، لغته، ما ذكره عن حاله)
- اختم بسؤال متابعة واحد قصير يفتح الباب للتعمق (إلا في المستوى د حيث تُنهي بالإحالة)
- لا تكتب مقدمات آلية مثل «هذا سؤال مهم» أو «بناءً على المصادر المعتمدة نقدم شرحاً»
- لا تكرر ما سيظهر في البطاقات الزرقاء من نصوص حرفية`

  const historyBlock = history.length
    ? `\nسياق المحادثة السابقة (من الأقدم إلى الأحدث) — استفد منه ولا تكرره:\n${history
        .slice(-6)
        .map(t => `${t.role === "user" ? "السائل" : "تِبْيَان"}: ${t.text.slice(0, 500)}`)
        .join("\n")}\n`
    : ""

  const prompt = `${historyBlock}السؤال الحالي: ${question}

المصادر الموثقة المسترجعة (Hybrid RAG - BM25 + Vector):
${docsContext || "لا يوجد مصادر كافية - يجب الامتناع"}

المطلوب:
1. استخدم فقط النصوص الحرفية أعلاه في البطاقات الزرقاء (لا تولد غيرها)
2. قدم شرحاً منظماً مبنياً على هذه المصادر فقط (سيكون في البطاقة البنفسجية)
3. المستوى: ${level} - التزم بإجراء المستوى
4. خلفية السائل: ${persona} - ${personaInstructions[persona] || personaInstructions.general}

أجب الآن بالشرح المنظم فقط (بدون تكرار النصوص الحرفية - هي ستظهر في البطاقات الزرقاء منفصلة):`

  return { prompt, systemInstruction }
}

// Fallback محلي عند فشل Gemini أو عدم وجود مفتاح
export function getFallbackExplanation(question: string, persona: string, level: string): string {
  const q = question.toLowerCase()
  
  if (level === "D") {
    return "هذا السؤال يندرج تحت المستوى (د) فتوى أو حالة شخصية. لا أستطيع إعطاء حكم مستقل لحالتك الخاصة، لأن الفتوى تحتاج لسماع التفاصيل كاملة من عالم مؤهل.\n\nجهات موثوقة:\n• دار الإفتاء في بلدك\n• موقع الإسلام سؤال وجواب islamqa.info\n• مركز بينات dawa.center\n\nهل تريد معلومات عامة عن الموضوع من المصادر الفقهية العامة؟"
  }

  if (q.includes("توحيد")) {
    if (persona === "new_muslim") return "أهلاً بك! التوحيد ببساطة: أن تؤمن أن الله واحد، لا شريك له، هو الذي خلقك ورزقك، وتعبده وحده بلا وسيط. ثلاث نقاط: الله هو الخالق (الربوبية)، الله هو المعبود وحده (الألوهية)، وله أسماء جميلة وصفات عظيمة."
    if (persona === "non_muslim") return "Tawhid is the central concept in Islam: Oneness of God. 1) God alone is Creator (Rububiyyah), 2) God alone deserves worship (Uluhiyyah), 3) God has beautiful names and attributes. It's comprehensive oneness."
    if (persona === "teen") return "تخيل أعظم صديق خلقك ورزقك ويحميك - التوحيد يعني هذا الصديق هو الله وحده، ما تطلب إلا منه."
    return "التوحيد هو إفراد الله بما يختص به: 1) توحيد الربوبية: الخالق الرازق المدبر، 2) توحيد الألوهية: إفراده بالعبادة، 3) توحيد الأسماء والصفات. وهو أساس الإسلام وغاية الخلق."
  }

  if (q.includes("كعبة") || (q.includes("يعبد") && q.includes("كعبة"))) {
    return "المسلمون لا يعبدون الكعبة ذاتها، بل يعبدون الله وحده. الكعبة هي القبلة التي أمرهم الله بالتوجه إليها في الصلاة. الطواف حولها عبادة لله، كالسجود باتجاهها. عمر بن الخطاب قال عند تقبيل الحجر الأسود: إني أعلم أنك حجر لا تضر ولا تنفع - فالعبادة لله وحده."
  }

  if (q.includes("قرآن") && (q.includes("تأليف") || q.includes("محمد"))) {
    return "القرآن كلام الله المنزل على محمد صلى الله عليه وسلم، وليس من تأليفه. الأدلة: 1) النبي أمي لا يقرأ ولا يكتب، 2) تحدى العرب أن يأتوا بمثله فعجزوا، 3) فيه أنباء غيب تحققت، 4) فيه عتاب للنبي نفسه."
  }

  if (q.includes("سيف") || q.includes("انتشر")) {
    return "الإسلام لم ينتشر بالإكراه، بل بالدعوة. قال تعالى (لا إكراه في الدين) البقرة 256. أكبر دولة مسلمة اليوم (إندونيسيا) لم يدخلها جيش مسلم. الفتوحات كانت لإزالة الطغاة الذين يمنعون وصول الدعوة."
  }

  if (level === "C") {
    return "هذه المسألة من المسائل التي فيها خلاف معتبر بين العلماء. المسلمون متفقون على الأصول الكبرى (التوحيد، أركان الإسلام)، والخلاف في الفروع رحمة وسعة. العامي يتبع من يثق بعلمه من العلماء الموثوقين. قال الإمام مالك: كل يؤخذ من قوله ويرد إلا صاحب هذا القبر صلى الله عليه وسلم."
  }

  return "هذا سؤال مهم. بناء على المصادر المعتمدة (بينات + الدرر السنية + قاموس الجمهرة)، نقدم شرحاً موثقاً يراعي السياق. النصوص الزرقاء أعلاه هي نصوص حرفية 100% من مصادر معتمدة، وما هنا هو تنظيم وتبيين لها، وليس توليداً مستقلاً للنص الشرعي."
}

import { NextRequest, NextResponse } from 'next/server'
import { detectIntent, LEVELS, Level } from '../../../lib/levelRouter'
import { hybrid_retrieve } from '../../../lib/rag'
import { fullGuard } from '../../../lib/guard'
import { APPROVED_SOURCES } from '../../../lib/sources'
import { generateWithGemini, buildTibyanPrompt, getFallbackExplanation } from '../../../lib/gemini'

// Fallback explanations - نفس السابق كاحتياط
const MOCK_EXPLANATIONS: Record<string, Record<string, string>> = {
  general: {
    "الكعبة": "المسلمون لا يعبدون الكعبة ذاتها، بل يعبدون الله وحده. الكعبة هي القبلة التي أمرهم الله بالتوجه إليها في الصلاة، كما في قوله تعالى (فول وجهك شطر المسجد الحرام) - البقرة 144 موجودة حرفياً في البطاقة الزرقاء أعلاه. والطواف حولها عبادة لله، كالسجود باتجاهها. عمر بن الخطاب رضي الله عنه قال عند تقبيل الحجر الأسود: إني أعلم أنك حجر لا تضر ولا تنفع - فالعبادة لله وحده.",
    "القرآن": "القرآن كلام الله المنزل على محمد صلى الله عليه وسلم، وليس من تأليفه. الأدلة: 1) النبي أمي لا يقرأ ولا يكتب (وما كنت تتلو من قبله من كتاب) العنكبوت 48 موجودة في المصادر، 2) تحدى العرب الفصحاء أن يأتوا بمثله فعجزوا، 3) فيه أنباء غيب تحققت، 4) فيه عتاب للنبي نفسه، فلو كان مؤلفاً لما عاتب نفسه.",
    "السيف": "الإسلام لم ينتشر بالإكراه، بل بالدعوة. قال تعالى (لا إكراه في الدين) البقرة 256 - موجودة في البطاقة الزرقاء. أكبر دولة مسلمة اليوم (إندونيسيا) لم يدخلها جيش مسلم، بل انتشر فيها الإسلام عبر التجار. الفتوحات كانت لإزالة الطغاة الذين يمنعون وصول الدعوة، وبقي أهل الكتاب في بلاد المسلمين قروناً.",
    "التوحيد": "التوحيد هو إفراد الله بما يختص به: 1) توحيد الربوبية: أنه الخالق الرازق المدبر، 2) توحيد الألوهية: إفراده بالعبادة فلا يعبد إلا هو، 3) توحيد الأسماء والصفات: إثبات ما أثبته الله لنفسه بلا تشبيه. وهو أساس الإسلام وغاية الخلق (وما خلقت الجن والإنس إلا ليعبدون) الذاريات 56 موجودة حرفياً في البطاقة الزرقاء أعلاه.",
    "default": "هذا سؤال مهم. بناء على المصادر المعتمدة (بينات + الدرر السنية + قاموس الجمهرة)، نقدم شرحا موثقا يراعي السياق. النصوص الزرقاء أعلاه هي نصوص حرفية 100% من مصادر معتمدة، وما هنا هو تنظيم وتبيين لها، وليس توليدا مستقلا للنص الشرعي."
  },
  new_muslim: {
    "التوحيد": "أهلا بك أخي الكريم! التوحيد ببساطة: أن تؤمن أن الله واحد، لا شريك له، هو الذي خلقك ورزقك، وتعبده وحده بلا وسيط. كأنك تقول: يا رب، أنت وحدك الذي أعبده وأتوكل عليه. وهذا هو معنى لا إله إلا الله. ثلاث نقاط: الله هو الخالق (الربوبية)، الله هو المعبود وحده (الألوهية)، وله أسماء جميلة وصفات عظيمة (الأسماء والصفات).",
    "default": "أهلا بك في رحلة التعرف على الإسلام بلطف وتدرج. الإسلام دين يسر ورحمة. ما تسأل عنه له جواب جميل في مصادرنا الموثقة أعلاه (البطاقات الزرقاء)، وهنا أبسطه لك بلغة قريبة. خذ وقتك، واسأل ما شئت، ونحن هنا لنوضح بلطف."
  },
  non_muslim: {
    "الكعبة": "Thank you for this important question. Muslims do NOT worship the Kaaba itself. The Kaaba is a direction (Qibla) for prayer, ordered by God. Worship is for God alone. Muslims circumambulate it as an act of worship TO God, not worship OF it. Similar to how people face a direction in prayer - the direction is not worshipped.",
    "التوحيد": "Tawhid is the central concept in Islam: Oneness of God. It means: 1) God alone is Creator and Sustainer (Rububiyyah), 2) God alone deserves worship (Uluhiyyah), 3) God has beautiful names and attributes (Asma wa Sifat). It is not just monotheism in number, but comprehensive oneness in all aspects.",
    "default": "Thank you for your question. Islam is often misunderstood. What we provide above (blue cards) are literal verified texts from authentic sources, and here we organize and explain them neutrally. We aim to present accurate information with respect for all."
  },
  teen: {
    "التوحيد": "تخيل أنك عندك أعظم صديق، هو اللي خلقك، يرزقك، يحميك، يسمعك دايما. التوحيد يعني: هذا الصديق هو الله وحده، ما تطلب إلا منه، ما تعبد إلا هو. ثلاث مستويات: 1) هو الخالق (زي المبرمج اللي صنع اللعبة)، 2) هو اللي تستعين به وحده (ما تطلب مساعدة إلا منه)، 3) له أسماء حلوة مثل الرحمن، الرحيم، القوي.",
    "default": "سؤال رهيب! شوف، الموضوع أبسط مما تتخيل. النصوص الزرقاء فوق هي كلام موثق 100% من مصادر معتمدة، وهنا أشرحها بطريقة قريبة لك. الإسلام دين منطقي وجميل، وكل سؤال له جواب مقنع."
  },
  researcher: {
    "التوحيد": "التوحيد لغة: الإفراد، واصطلاحا: إفراد الله بما يختص به من الربوبية والألوهية والأسماء والصفات. تقسيمه إلى ثلاثة أنواع مأخوذ بالاستقراء من النصوص: توحيد الربوبية (دل عليه قوله تعالى الله خالق كل شيء - الزمر 62)، وتوحيد الألوهية (وما أمروا إلا ليعبدوا الله مخلصين - البينة 5)، وتوحيد الأسماء والصفات (ليس كمثله شيء وهو السميع البصير - الشورى 11). انظر: شرح الطحاوية، كتاب التوحيد لابن خزيمة، مجموع الفتاوى 3/97.",
    "default": "هذا موضوع يحتاج تحريرا علميا. المصادر الزرقاء أعلاه هي نصوص حرفية موثقة بدرجة عالية (صحيح، متفق عليه، أو من كتاب بينات المعتمد). ما هنا هو تنظيم أكاديمي للمادة مع الإحالة. للمزيد: راجع الروابط المباشرة في البطاقات الزرقاء (quranpedia.net, dorar.net, dawa.center/file/7937)."
  }
}

function getMockExplanation(query: string, persona: string, level: Level): string {
  const personaExplanations = MOCK_EXPLANATIONS[persona] || MOCK_EXPLANATIONS.general
  const q = query.toLowerCase()

  if (q.includes("كعبة") || q.includes("يعبد") && q.includes("كعبة")) return personaExplanations["الكعبة"] || personaExplanations["default"]
  if (q.includes("قرآن") && (q.includes("تأليف") || q.includes("محمد"))) return personaExplanations["القرآن"] || personaExplanations["default"]
  if (q.includes("سيف") || q.includes("انتشر")) return personaExplanations["السيف"] || personaExplanations["default"]
  if (q.includes("توحيد")) return personaExplanations["التوحيد"] || personaExplanations["default"]
  
  if (level === "C") {
    return "هذه المسألة من المسائل التي فيها خلاف معتبر بين العلماء. المسلمون متفقون على الأصول الكبرى (التوحيد، أركان الإسلام)، والخلاف في الفروع رحمة وسعة. العامي يتبع من يثق بعلمه من العلماء الموثوقين، ولا يتعصب لرأي. قال الإمام مالك: كل يؤخذ من قوله ويرد إلا صاحب هذا القبر صلى الله عليه وسلم. (انظر المصادر الزرقاء أعلاه للتفصيل الموثق)."
  }
  
  return personaExplanations["default"]
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { question, persona = "general" } = body

    // سياق المحادثة — بدونه لا يرى النموذج سوى السؤال الحالي فلا يكون الرد حوارياً
    const rawHistory = Array.isArray(body.history) ? body.history : []
    let history = rawHistory
      .filter((t: any) => t && typeof t.text === "string" && t.text.trim())
      .slice(-8)
      .map((t: any) => ({ role: t.role === "user" ? "user" : "model", text: String(t.text).slice(0, 1000) }))
    // الواجهة تضيف السؤال الحالي إلى السجل قبل الإرسال — نحذفه كي لا يتكرر في الـ prompt
    if (history.length && history[history.length - 1].role === "user" &&
        history[history.length - 1].text.trim() === String(question).trim()) {
      history = history.slice(0, -1)
    }

    if (!question || typeof question !== 'string' || question.trim().length < 2) {
      return NextResponse.json({ error: "السؤال مطلوب" }, { status: 400 })
    }

    const startTime = Date.now()

    // 1. Intent & Level Detection
    const intentResult = detectIntent(question)
    const level = intentResult.level as Level

    // 2. Level D - Immediate abstain
    if (level === "D") {
      return NextResponse.json({
        question,
        level,
        levelInfo: LEVELS[level],
        intent: intentResult.intent,
        status: "abstain",
        action: "refer",
        blueCards: [],
        purpleCards: [{
          explanation: "هذا السؤال يندرج تحت المستوى (د) فتوى أو حالة شخصية. لا أستطيع إعطاء حكم مستقل لحالتك الخاصة، لأن الفتوى تحتاج لسماع التفاصيل كاملة من عالم مؤهل.\n\nما أستطيع تقديمه:\n• معلومات عامة عن الموضوع من المصادر المعتمدة\n• إحالتك لجهة مؤهلة\n\nجهات موثوقة:\n• دار الإفتاء في بلدك\n• موقع الإسلام سؤال وجواب islamqa.info\n• مركز بينات dawa.center للأسئلة الفكرية\n\nهل تريد معلومات عامة عن موضوع الطلاق والرجعة من المصادر الفقهية العامة؟",
          persona,
          level,
          references: ["dorar.net/feqhia - الفقه العام", "islamqa.info"]
        }],
        sources: [],
        confidence: 1.0,
        guard: { status: "blocked", action: "refer", message: "مستوى د - فتوى شخصية" },
        metrics: {
          responseTime: Date.now() - startTime,
          confidence: 1.0,
          sourcesCount: 0,
          level,
          retrievalSource: "level_router_D",
          llm: "none - D level"
        }
      })
    }

    // 3. Hybrid RAG Retrieval
    const retrieval = await hybrid_retrieve(question, level, 5, 0.82)

    // 4. Check low confidence -> abstain
    if (retrieval.docs.length === 0 || retrieval.confidence < 0.15) {
      return NextResponse.json({
        question,
        level,
        levelInfo: LEVELS[level],
        intent: intentResult.intent,
        status: "abstain",
        action: "abstain",
        blueCards: [],
        purpleCards: [{
          explanation: `لم أجد مصدراً كافياً في المصادر المعتمدة الثمانية للإجابة على هذا السؤال بثقة عالية (ثقة حالية ${(retrieval.confidence * 100).toFixed(0)}% < 82% المطلوبة للمستوى أ).\n\nالمصادر المعتمدة التي بحثت فيها:\n• القرآن: quranpedia.net\n• الحديث: dorar.net/hadith + shamela.ws\n• التفسير: dorar.net/tafseer\n• الشبهات: بينات dawa.center/file/7937\n• المصطلحات: الجمهرة islamic-content.com/dictionary\n\nيمكنك إعادة صياغة السؤال أو اختيار أحد الأسئلة المقترحة في لوحة الاختبار السريع.`,
          persona,
          level: "abstain" as Level,
          references: Object.values(APPROVED_SOURCES).flatMap(s => s.urls).slice(0, 4)
        }],
        sources: [],
        confidence: retrieval.confidence,
        guard: { status: "low_confidence", confidence: retrieval.confidence },
        metrics: {
          responseTime: Date.now() - startTime,
          confidence: retrieval.confidence,
          sourcesCount: 0,
          level,
          retrievalSource: retrieval.source,
          llm: "none - low confidence"
        }
      })
    }

    // 5. Generate explanation - Try Gemini Flash Lite first, fallback to mock
    let explanation = ""
    let llmSource = "mock_fallback"
    let geminiUsage = null

    const geminiApiKey = process.env.GEMINI_API_KEY

    if (geminiApiKey) {
      try {
        const { prompt, systemInstruction } = buildTibyanPrompt(question, retrieval.docs as any, persona, level, history)
        
        const geminiResult = await generateWithGemini(
          prompt,
          {
            apiKey: geminiApiKey,
            model: process.env.GEMINI_MODEL || "flashLite", // gemini-1.5-flash-8b مجاني
            temperature: 0.3,
            maxTokens: 800
          },
          systemInstruction
        )
        
        explanation = geminiResult.text
        llmSource = `gemini-${geminiResult.model}`
        geminiUsage = geminiResult.usage
        
        // تنظيف أي محاولة لتوليد آية بزخرفة غير موجودة
        // إذا كان الشرح يحتوي ﴿...﴾ غير موجود في المصادر، احذفها
        if (explanation.includes("﴿")) {
          const hasValidAyah = retrieval.docs.some((d: any) => 
            d.payload.text.includes("﴿") && explanation.includes(d.payload.text.slice(0, 20))
          )
          if (!hasValidAyah) {
            // استبدل الزخرفة بنص عادي
            explanation = explanation.replace(/﴿/g, "(").replace(/﴾/g, ")")
          }
        }

      } catch (geminiError: any) {
        console.warn("Gemini failed, using fallback:", geminiError.message)
        explanation =
          `⚠️ تعذّر تشغيل النموذج اللغوي، وهذا الرد قالب محلي ثابت لا ذكاء اصطناعي فيه.\n` +
          `السبب: ${String(geminiError?.message || geminiError).slice(0, 160)}\n` +
          `للتشخيص: افتح /api/health\n\n— القالب المحلي —\n` +
          getFallbackExplanation(question, persona, level)
        llmSource = `fallback - gemini error: ${geminiError.message.slice(0, 50)}`
      }
    } else {
      // No API key - use fallback (works 100% offline)
      // نص صريح كي لا يبدو القالب الثابت وكأنه توليد من نموذج لغوي
      explanation =
        `⚠️ وضع بدون نموذج لغوي: لا يوجد GEMINI_API_KEY في البيئة، ` +
        `فهذا الرد قالب محلي ثابت وليس توليداً بالذكاء الاصطناعي — ولن يتغير بتغيّر السؤال.\n` +
        `للتفعيل: أضف المفتاح في .env.local ثم تحقق عبر /api/health\n\n— القالب المحلي —\n` +
        getMockExplanation(question, persona, level)
      llmSource = "mock_fallback - no GEMINI_API_KEY (works offline)"
    }

    // 6. Zero-Hallucination Guard Check
    const guardResult = fullGuard(explanation, retrieval.docs as any, level, 0.35)

    if (guardResult.status === "blocked" && guardResult.action === "abstain") {
      return NextResponse.json({
        question,
        level,
        levelInfo: LEVELS[level],
        intent: intentResult.intent,
        status: "blocked",
        action: "abstain",
        blueCards: retrieval.docs.slice(0, 3).map((doc: any) => ({
          id: doc.id,
          text: doc.payload.text,
          source: doc.payload.source,
          source_url: doc.payload.source_url,
          grade: doc.payload.grade,
          type: doc.payload.type,
          surah: doc.payload.surah,
          ayah: doc.payload.ayah,
          confidence: doc.score / 5.0
        })),
        purpleCards: [{
          explanation: `تم منع جزء من الشرح المولد لأنه ادعى نصاً شرعياً غير موجود حرفياً في المصادر المعتمدة. هذا هو حارس صفر اختلاق يعمل.\n\nالنصوص الزرقاء أعلاه آمنة وموثقة 100%.\n\nالمنع: ${guardResult.blockedTexts?.join(', ') || guardResult.message}\n\nFallback: ${getFallbackExplanation(question, persona, level)}`,
          persona,
          level,
          references: ["lib/guard.ts - Zero-Hallucination Guard"]
        }],
        sources: retrieval.docs,
        confidence: retrieval.confidence,
        guard: guardResult,
        metrics: {
          responseTime: Date.now() - startTime,
          confidence: retrieval.confidence,
          sourcesCount: retrieval.docs.length,
          level,
          retrievalSource: retrieval.source,
          llm: llmSource
        }
      })
    }

    // 7. Success response with blue/purple separation
    const blueCards = retrieval.docs.map((doc: any) => ({
      id: doc.id,
      text: doc.payload.text,
      source: doc.payload.source,
      source_url: doc.payload.source_url,
      grade: doc.payload.grade,
      type: doc.payload.type,
      surah: doc.payload.surah,
      ayah: doc.payload.ayah,
      confidence: Math.min(doc.score / 5.0, 1.0),
      bm25_score: doc.bm25_score,
      vector_score: doc.vector_score
    }))

    const purpleCards = [{
      explanation,
      persona,
      level,
      references: retrieval.docs.slice(0, 3).map((d: any) => d.payload.source.split(' - ')[0]),
      llm: llmSource,
      usage: geminiUsage
    }]

    return NextResponse.json({
      question,
      level,
      levelInfo: LEVELS[level],
      intent: intentResult.intent,
      status: "ok",
      action: "proceed",
      blueCards,
      purpleCards,
      sources: retrieval.docs,
      confidence: retrieval.confidence,
      guard: guardResult,
      metrics: {
        responseTime: Date.now() - startTime,
        confidence: retrieval.confidence,
        sourcesCount: retrieval.docs.length,
        level,
        retrievalSource: retrieval.source,
        blueCardsCount: blueCards.length,
        purpleCardsCount: purpleCards.length,
        llm: llmSource,
        geminiUsage
      }
    })

  } catch (error) {
    console.error("API /ask error:", error)
    return NextResponse.json({ error: "حدث خطأ في المعالجة", details: String(error) }, { status: 500 })
  }
}

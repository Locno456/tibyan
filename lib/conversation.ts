export interface ConversationTurn {
  role: "user" | "model"
  text: string
}

export type ConversationIntent =
  | { kind: "social"; response: string }
  | { kind: "followup"; retrievalQuery: string; promptQuestion: string; safetyNote?: string }
  | null

function normalizeForIntent(value: string): string {
  return value
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/[؟?!.,،؛:«»"'()\[\]{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function isOnlyGreetingOrThanks(normalized: string): "greeting" | "thanks" | "how_are_you" | null {
  const greetingPatterns = [
    /^(?:السلام عليكم(?: ورحمة الله وبركاته)?|وعليكم السلام(?: ورحمة الله وبركاته)?|مرحبا|اهلا(?: وسهلا)?|هلا|يا هلا|صباح الخير|مساء الخير|اهلين)(?: يا \S+)?$/,
    /^(?:كيف حالك|كيف الحال|كيفك|شلونك|عامل ايه)$/,
  ]
  if (greetingPatterns[1].test(normalized)) return "how_are_you"
  if (greetingPatterns[0].test(normalized)) return "greeting"

  const thanksPatterns = [
    /^(?:شكرا|شكرا جزيلا|جزاك الله خيرا|جزاكم الله خيرا|بارك الله فيك|بارك الله فيكم|ممتن لك|ممتنه لك)$/,
  ]
  if (thanksPatterns.some((pattern) => pattern.test(normalized))) return "thanks"
  return null
}

function isShortAcknowledgement(normalized: string): boolean {
  return /^(?:نعم|نعم نعم|اجل|بلى|اكيد|طبعا|طبعا نعم|تمام|حسنا|حسنًا|اوكي|اوكى|موافق|موافقه|صحيح|واصل|تابع|كمل|اكمل|استمر|وضح اكثر|اشرح اكثر|اعطني المزيد|اخبرني المزيد|yes|yeah|sure|okay|ok|go on|continue|tell me more)$/.test(normalized)
}

function lastAssistantQuestion(history: ConversationTurn[]): string | undefined {
  const assistant = [...history].reverse().find((turn) => turn.role === "model" && turn.text.trim())
  if (!assistant) return undefined
  const text = assistant.text.trim()
  const questionMarks = [text.lastIndexOf("؟"), text.lastIndexOf("?")]
  const end = Math.max(...questionMarks)
  if (end < 0) return undefined
  const start = Math.max(text.lastIndexOf("\n", end), text.lastIndexOf(".", end), text.lastIndexOf("!", end)) + 1
  const question = text.slice(start, end + 1).trim()
  if (question.length < 6 || question.length > 260) return undefined
  if (!/(?:هل|تريد|ترغب|تحب|يمكنني|استطيع|أستطيع|ودك|ما رأيك|تفضّل|تفضل|هل ترغب)/i.test(question)) return undefined
  return question
}

function priorUserQuestion(history: ConversationTurn[]): string | undefined {
  const lastAssistantIndex = [...history].map((turn) => turn.role).lastIndexOf("model")
  if (lastAssistantIndex < 0) return undefined
  for (let index = lastAssistantIndex - 1; index >= 0; index -= 1) {
    if (history[index]?.role === "user") return history[index].text.trim()
  }
  return undefined
}

function isGenericInformationOffer(text: string): boolean {
  return /معلومات عامة|لا أستطيع إعطاء حكم مستقل|لا استطيع اعطاء حكم مستقل|فتوى شخصية|حالة شخصية|أحِل|احيلك/i.test(text)
}

export function detectConversationIntent(question: string, history: ConversationTurn[] = []): ConversationIntent {
  const normalized = normalizeForIntent(question)
  const socialKind = isOnlyGreetingOrThanks(normalized)
  if (socialKind === "greeting") {
    return {
      kind: "social",
      response: /^(?:وعليكم السلام)/.test(normalized)
        ? "وعليكم السلام ورحمة الله وبركاته. أهلاً بك، كيف أستطيع مساعدتك؟"
        : "أهلاً بك في تِبْيَان. كيف أستطيع مساعدتك؟",
    }
  }
  if (socialKind === "thanks") {
    return { kind: "social", response: "العفو، يسعدني أن أساعدك. إذا كان لديك سؤال آخر فتفضل." }
  }
  if (socialKind === "how_are_you") {
    return { kind: "social", response: "أنا بخير، شكراً لسؤالك. كيف أستطيع مساعدتك اليوم؟" }
  }

  if (!isShortAcknowledgement(normalized)) return null
  const assistantQuestion = lastAssistantQuestion(history)
  if (!assistantQuestion) {
    return {
      kind: "social",
      response: `وصلتني إجابتك «${question.trim()}»، لكن لا يظهر لي سؤال سابق محدد أتابعه. اكتب ما تريد معرفته وسأساعدك.`,
    }
  }

  const previousUser = priorUserQuestion(history)
  const lastAssistant = [...history].reverse().find((turn) => turn.role === "model")
  const acceptedGeneralOffer = isGenericInformationOffer(lastAssistant?.text || "")
  const retrievalQuery = (acceptedGeneralOffer ? assistantQuestion : [previousUser, assistantQuestion].filter(Boolean).join(" ")).slice(0, 700)
  const safetyNote = acceptedGeneralOffer
    ? "أجاب المستخدم بالإيجاب على عرض معلومات عامة بعد إحالة لحالة شخصية؛ قدّم معلومات عامة فقط، ولا تطبق حكماً على ظروفه ولا تصدر فتوى شخصية."
    : undefined

  return {
    kind: "followup",
    retrievalQuery,
    promptQuestion: `المستخدم أجاب «${question.trim()}» عن سؤال تِبْيَان السابق: «${assistantQuestion}». نفّذ العرض السابق بإجابة متابعة موجزة ومباشرة، ولا تكرر الإجابة السابقة.`,
    ...(safetyNote ? { safetyNote } : {}),
  }
}

import type { AnswerStage } from "./answerProgress"

const STAGES = new Set<AnswerStage>(["classify", "retrieve", "web", "mcp", "generate", "verify"])

/** The NDJSON transport only exposes real server milestones, never model thoughts. */
export async function readAnswerStream(response: Response, onStage: (stage: AnswerStage) => void): Promise<any> {
  if (!response.headers.get("content-type")?.includes("application/x-ndjson")) {
    const json = await response.json()
    if (!response.ok) throw new Error(String(json?.error || `HTTP ${response.status}`))
    return json
  }
  if (!response.body) throw new Error("لا توجد استجابة من الخادم")
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  let received = 0
  let result: any
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      received += value.byteLength
      if (received > 2_000_000) throw new Error("استجابة طويلة على نحو غير متوقع")
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split("\n")
      buffer = lines.pop() || ""
      for (const line of lines) {
        if (!line.trim()) continue
        const event = JSON.parse(line)
        if (event.type === "stage" && STAGES.has(event.stage)) onStage(event.stage)
        if (event.type === "result") {
          if (event.status >= 400 || event.data?.error) throw new Error(String(event.data?.error || `HTTP ${event.status}`))
          result = event.data
        }
      }
    }
    if (buffer.trim()) {
      const event = JSON.parse(buffer)
      if (event.type === "result") {
        if (event.status >= 400 || event.data?.error) throw new Error(String(event.data?.error || `HTTP ${event.status}`))
        result = event.data
      }
    }
    if (!result) throw new Error("انقطع الاتصال قبل اكتمال الإجابة؛ أعد المحاولة.")
    return result
  } finally { reader.releaseLock() }
}

import { AsyncLocalStorage } from "node:async_hooks"

export type AnswerStage = "classify" | "retrieve" | "web" | "mcp" | "generate" | "verify"
const progressContext = new AsyncLocalStorage<(stage: AnswerStage) => void>()

/** Only emits stages actually entered in this request. Never expose reasoning or prompts. */
export function reportAnswerStage(stage: AnswerStage): void {
  progressContext.getStore()?.(stage)
}

export function withAnswerProgress<T>(notify: (stage: AnswerStage) => void, run: () => Promise<T>): Promise<T> {
  return progressContext.run(notify, run)
}

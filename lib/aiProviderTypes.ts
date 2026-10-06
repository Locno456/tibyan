export type AIProviderId =
  | "google"
  | "anthropic"
  | "openai"
  | "openrouter"
  | "groq"
  | "zai"
  | "mistral"
  | "deepseek"

export type ProviderConnectionStatus = "connected" | "error"
export type ModelProbeStatus = "listed" | "working" | "failed"

export interface AIModelInfo {
  id: string
  name: string
  contextWindow?: number
  maxOutputTokens?: number
  supportsTools?: boolean
  status: ModelProbeStatus
}

export interface AIProviderInfo {
  id: AIProviderId
  name: string
  shortName: string
  mark: string
  color: string
  status: ProviderConnectionStatus
  models: AIModelInfo[]
  error?: string
}

export interface AIModelSelection {
  providerId: AIProviderId
  modelId: string
  modelName?: string
  providerName?: string
}

export interface AIModelCatalog {
  checkedAt: string
  providers: AIProviderInfo[]
  defaultSelection?: AIModelSelection
}

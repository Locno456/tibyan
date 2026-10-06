"use client"

import type { AIProviderId } from "../lib/aiProviderTypes"

const PROVIDER_MARKS: Record<AIProviderId, { mark: string; color: string }> = {
  google: { mark: "G", color: "#4285F4" },
  anthropic: { mark: "A", color: "#C15F3C" },
  openai: { mark: "O", color: "#168A6A" },
  openrouter: { mark: "R", color: "#7559B8" },
  groq: { mark: "G", color: "#E65A24" },
  zai: { mark: "Z", color: "#3B63D9" },
  mistral: { mark: "M", color: "#D97706" },
  deepseek: { mark: "D", color: "#3B68C4" },
}

export default function ProviderLogo({
  providerId,
  size = 30,
  className = "",
}: {
  providerId?: AIProviderId
  size?: number
  className?: string
}) {
  const selected = providerId ? PROVIDER_MARKS[providerId] : { mark: "AI", color: "#0A8F94" }
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full border border-current/15 bg-white font-extrabold leading-none ${className}`}
      style={{ width: size, height: size, color: selected.color, fontSize: size <= 24 ? 11 : 13 }}
    >
      {selected.mark}
    </span>
  )
}

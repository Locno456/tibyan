"use client"

import VerifiedTextCard from "./VerifiedTextCard"

interface QuranBracketProps {
  text?: string
  surah?: number
  ayah?: number
  source?: string
  sourceUrl?: string
  source_url?: string
  confidence?: number
  index?: number
}

// توافق خلفي للمكوّن القديم؛ بطاقات القرآن والحديث الجديدة تستخدم VerifiedTextCard مباشرة.
export default function QuranBracket({
  sourceUrl,
  source_url,
  ...props
}: QuranBracketProps) {
  return (
    <VerifiedTextCard
      {...props}
      kind="quran"
      sourceUrl={sourceUrl || source_url}
    />
  )
}

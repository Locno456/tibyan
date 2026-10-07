export const ACCOUNT_TYPES = [
  {
    id: "non_muslim",
    label: "غير مسلم",
    description: "أتعرف إلى الإسلام من خارجه.",
    icon: "Globe",
  },
  {
    id: "new_muslim",
    label: "جديد في الإسلام",
    description: "أتعلم أساسيات الإسلام خطوةً خطوة.",
    icon: "Sprout",
  },
  {
    id: "muslim",
    label: "مسلم",
    description: "أبحث عن إجابات تناسب خلفيتي الإسلامية.",
    icon: "Moon",
  },
  {
    id: "researcher",
    label: "باحث",
    description: "أهتم بالبحث والمراجع والتفصيل.",
    icon: "BookOpen",
  },
] as const

export type AccountType = (typeof ACCOUNT_TYPES)[number]["id"]

export interface AccountProfile {
  id: string
  display_name: string | null
  account_type: AccountType
  referral_enabled: boolean
  created_at: string | null
}

export function isAccountType(value: unknown): value is AccountType {
  return typeof value === "string" && ACCOUNT_TYPES.some((type) => type.id === value)
}

export function getAccountTypeMeta(value: unknown) {
  return ACCOUNT_TYPES.find((type) => type.id === value) || null
}

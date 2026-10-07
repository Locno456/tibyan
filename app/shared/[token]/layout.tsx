import type { Metadata } from "next"
export const metadata: Metadata = { title: "محادثة مشتركة | تِبْيَان", robots: { index: false, follow: false }, referrer: "no-referrer" }
export default function SharedLayout({ children }: { children: React.ReactNode }) { return children }

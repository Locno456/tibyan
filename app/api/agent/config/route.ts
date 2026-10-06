import { NextResponse } from "next/server"
import { isAgentModeEnabled } from "../../../../lib/agentRollout"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** Public capability bit only: no secret keys, provider endpoints or user data. */
export async function GET() {
  return NextResponse.json({ enabled: isAgentModeEnabled() }, { headers: { "Cache-Control": "no-store" } })
}

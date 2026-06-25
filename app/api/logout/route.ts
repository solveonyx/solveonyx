import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { ACTIVE_TENANT_COOKIE_NAME } from "@/lib/auth"

export async function POST() {
    const cookieStore = await cookies()
    cookieStore.delete(ACTIVE_TENANT_COOKIE_NAME)

    return NextResponse.json({ ok: true })
}

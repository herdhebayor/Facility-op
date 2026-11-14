import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

// Returns { session } on success, or { error: NextResponse } to return early.
export async function requireSession(allowedRoles = null) {
  const session = await getSession();
  if (!session) {
    return { error: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) };
  }
  if (allowedRoles !== null && !allowedRoles.includes(session.role)) {
    return { error: NextResponse.json({ error: "Not authorized" }, { status: 403 }) };
  }
  return { session };
}

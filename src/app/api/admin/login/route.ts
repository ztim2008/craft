import { createSessionToken, sessionCookie } from "@/modules/adminAuth/session";
import { verifyPassword } from "@/modules/adminAuth/password";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: { email?: string; password?: string };
  try {
    body = (await request.json()) as { email?: string; password?: string };
  } catch {
    return Response.json({ error: "Ожидался JSON" }, { status: 400 });
  }
  const email = (body.email || "").trim().toLowerCase();
  const password = body.password || "";
  const expectedEmail = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const hash = process.env.ADMIN_PASSWORD_HASH || "";
  if (!expectedEmail || !hash || !process.env.ADMIN_SESSION_SECRET) {
    return Response.json({ error: "Админка не настроена" }, { status: 500 });
  }
  if (email !== expectedEmail || !verifyPassword(password, hash)) {
    return Response.json({ error: "Неверный логин или пароль" }, { status: 401 });
  }
  const token = await createSessionToken(email);
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "set-cookie": sessionCookie(token),
    },
  });
}

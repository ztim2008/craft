import { createOrder } from "@/modules/billing/orders";
import { getLivePlan } from "@/modules/billing/plans";
import { allowRate, clientIp } from "@/modules/billing/rateLimit";
import { parseOptionalOwnDomain } from "@/modules/clients/types";
import { sendLeadEmail } from "@/modules/forms/sendEmail";
import { parsePublicHttpUrl, UrlGuardError } from "@/modules/security/urlGuard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseOptionalSiteUrl(raw: string): string | undefined {
  const value = raw.trim();
  if (!value) return undefined;
  try {
    return parsePublicHttpUrl(value).toString();
  } catch (error) {
    if (error instanceof UrlGuardError) throw error;
    throw new UrlGuardError("Укажите адрес сайта");
  }
}

export async function POST(request: Request) {
  if (!allowRate(`landing-lead:${clientIp(request)}`, 8, 60 * 60 * 1000)) {
    return Response.json({ error: "Слишком много заявок. Напишите в Telegram." }, { status: 429 });
  }

  let body: {
    plan?: string;
    name?: string;
    email?: string;
    phone?: string;
    domain?: string;
    sourceUrl?: string;
    comment?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Ожидался JSON" }, { status: 400 });
  }

  const plan = await getLivePlan(body.plan || "pro");
  if (!plan) return Response.json({ error: "Выберите тариф" }, { status: 400 });
  const name = (body.name || "").trim();
  const email = (body.email || "").trim().toLowerCase();
  const phone = (body.phone || "").trim();
  if (name.length < 2) return Response.json({ error: "Укажите имя" }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: "Укажите email" }, { status: 400 });
  }

  let domain: string | undefined;
  try {
    domain = parseOptionalOwnDomain(body.domain || "");
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Укажите ваш домен" },
      { status: 400 },
    );
  }

  let sourceUrl: string | undefined;
  try {
    sourceUrl = parseOptionalSiteUrl(body.sourceUrl || "");
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Укажите адрес сайта" },
      { status: 400 },
    );
  }

  const comment = (body.comment || "").trim().slice(0, 2000) || undefined;

  const order = await createOrder({
    plan: plan.id,
    name,
    email,
    phone,
    domain,
    sourceUrl,
    comment,
    channel: "landing",
    amountRub: plan.amountRub,
  });

  const operator = process.env.ADMIN_EMAIL;
  if (operator) {
    await sendLeadEmail({
      to: operator,
      subject: `Craft заявка с сайта · ${plan.name} · ${name}`,
      text: [
        `Заявка ${order.id}`,
        `Откуда: главная craft.nordic-builder.ru`,
        `Тариф: ${plan.name} (${plan.amountRub} ₽)`,
        sourceUrl ? `Сайт на Крафтуме: ${sourceUrl}` : "",
        domain ? `Домен (отвязать от Крафтума): ${domain}` : "Домен не указан",
        `Имя: ${name}`,
        `Email: ${email}`,
        phone ? `Телефон: ${phone}` : "",
        comment ? `Комментарий: ${comment}` : "",
        "",
        "Админка: https://craft.nordic-builder.ru/admin/orders",
      ]
        .filter(Boolean)
        .join("\n"),
    }).catch(() => ({ sent: false }));
  }

  return Response.json({ orderId: order.id, status: order.status }, { status: 201 });
}

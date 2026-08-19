import { createOrder, listOrdersForJob } from "@/modules/billing/orders";
import { getLivePlan } from "@/modules/billing/plans";
import { allowRate, clientIp } from "@/modules/billing/rateLimit";
import { getImportJob } from "@/modules/jobs/store";
import { sendLeadEmail } from "@/modules/forms/sendEmail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return Response.json({ error: "Некорректный id" }, { status: 400 });
  }
  if (!allowRate(`order:${clientIp(request)}`, 20, 60 * 60 * 1000)) {
    return Response.json({ error: "Слишком много заявок" }, { status: 429 });
  }
  const job = await getImportJob(id);
  if (!job) return Response.json({ error: "Демо не найдено" }, { status: 404 });
  if (job.status !== "success") {
    return Response.json({ error: "Дождитесь готовности preview" }, { status: 400 });
  }

  const existing = await listOrdersForJob(id);
  const open = existing.find((item) => item.status === "pending" || item.status === "paid");
  if (open) {
    return Response.json({
      orderId: open.id,
      status: open.status,
      downloadToken: open.status === "paid" ? open.downloadToken : undefined,
    });
  }

  let body: { plan?: string; name?: string; email?: string; phone?: string };
  try {
    body = (await request.json()) as { plan?: string; name?: string; email?: string; phone?: string };
  } catch {
    return Response.json({ error: "Ожидался JSON" }, { status: 400 });
  }
  const plan = await getLivePlan(body.plan || "");
  if (!plan) return Response.json({ error: "Выберите Basic или Pro" }, { status: 400 });
  const name = (body.name || "").trim();
  const email = (body.email || "").trim().toLowerCase();
  if (name.length < 2) return Response.json({ error: "Укажите имя" }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: "Укажите email" }, { status: 400 });
  }

  const order = await createOrder({
    jobId: id,
    plan: plan.id,
    name,
    email,
    phone: body.phone,
    amountRub: plan.amountRub,
  });

  const operator = process.env.ADMIN_EMAIL;
  if (operator) {
    await sendLeadEmail({
      to: operator,
      subject: `Craft заявка ${plan.name} · ${job.sourceUrl}`,
      text: [
        `Заявка ${order.id}`,
        `Тариф: ${plan.name} (${plan.amountRub} ₽)`,
        `Сайт: ${job.sourceUrl}`,
        `Демо: https://craft.nordic-builder.ru/demo/${id}`,
        `Имя: ${name}`,
        `Email: ${email}`,
        body.phone ? `Телефон: ${body.phone}` : "",
        "",
        "ЮKassa пока не подключена — отметьте оплату в /admin/orders и клиент скачает ZIP.",
      ]
        .filter(Boolean)
        .join("\n"),
    }).catch(() => ({ sent: false }));
  }

  return Response.json({ orderId: order.id, status: order.status }, { status: 201 });
}

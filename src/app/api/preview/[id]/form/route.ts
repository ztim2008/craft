import { createId } from "@/lib/ids";
import { getContent } from "@/modules/content/store";
import { appendLead, formatLeadText, resolveFormEmail } from "@/modules/forms/leads";
import { sendLeadEmail } from "@/modules/forms/sendEmail";
import { getImportJob } from "@/modules/jobs/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return Response.json({ error: "Некорректный id" }, { status: 400 });
  }
  const job = await getImportJob(id);
  if (!job) return Response.json({ error: "Сайт не найден" }, { status: 404 });

  let body: { formId?: string; fields?: Record<string, string>; page?: string };
  try {
    body = (await request.json()) as { formId?: string; fields?: Record<string, string>; page?: string };
  } catch {
    return Response.json({ error: "Ожидался JSON" }, { status: 400 });
  }

  const fields = body.fields || {};
  const filled = Object.values(fields).some((value) => String(value || "").trim());
  if (!filled) {
    return Response.json({ error: "Заполните поля формы" }, { status: 400 });
  }

  const overlay = await getContent(id);
  const to = resolveFormEmail(overlay, body.formId || "");
  if (!to) {
    return Response.json(
      { error: "В админке не указан email для заявок (Контент → форма)" },
      { status: 400 },
    );
  }

  const lead = {
    id: createId(),
    at: new Date().toISOString(),
    formId: body.formId || "",
    page: body.page || "/",
    fields,
    to,
    emailed: false,
  };

  let emailed = false;
  try {
    const mail = await sendLeadEmail({
      to,
      subject: `Заявка с сайта: ${job.sourceUrl}`,
      text: formatLeadText(lead),
    });
    emailed = mail.sent;
  } catch (error) {
    await appendLead(id, lead);
    return Response.json(
      {
        error: `Заявка сохранена, но email не ушёл: ${
          error instanceof Error ? error.message : "ошибка SMTP"
        }`,
      },
      { status: 502 },
    );
  }

  lead.emailed = emailed;
  await appendLead(id, lead);

  return Response.json({
    ok: true,
    emailed,
    message: emailed ? "Заявка отправлена на email" : "Заявка сохранена в админке (SMTP не настроен)",
  });
}

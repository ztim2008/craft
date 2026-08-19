import { after } from "next/server";
import { assertPublicHttpUrl, UrlGuardError } from "@/modules/security/urlGuard";
import { createImportJob } from "@/modules/jobs/store";
import { runImportJob } from "@/modules/jobs/runner";
import { allowRate, clientIp } from "@/modules/billing/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

type DemoBody = {
  url?: string;
  ownerConfirmed?: boolean;
};

export async function POST(request: Request) {
  const ip = clientIp(request);
  if (!allowRate(`demo:${ip}`, 8, 60 * 60 * 1000)) {
    return Response.json({ error: "Слишком много демо с этого адреса. Попробуйте позже." }, { status: 429 });
  }

  let body: DemoBody;
  try {
    body = (await request.json()) as DemoBody;
  } catch {
    return Response.json({ error: "Ожидался JSON" }, { status: 400 });
  }
  if (!body.ownerConfirmed) {
    return Response.json(
      { error: "Нужно подтвердить, что вы владеете сайтом или имеете право на импорт" },
      { status: 400 },
    );
  }
  if (!body.url || typeof body.url !== "string") {
    return Response.json({ error: "Укажите URL" }, { status: 400 });
  }

  let sourceUrl: string;
  try {
    sourceUrl = (await assertPublicHttpUrl(body.url)).toString();
  } catch (error) {
    const message = error instanceof UrlGuardError ? error.message : "Некорректный URL";
    return Response.json({ error: message }, { status: 400 });
  }

  const job = await createImportJob({
    sourceUrl,
    homepageOnly: true,
    maxPages: 1,
    ownerConfirmed: true,
  });
  after(async () => {
    await runImportJob(job.id);
  });
  return Response.json({ jobId: job.id, status: job.status }, { status: 202 });
}

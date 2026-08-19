import type { HostingKind } from "@/modules/clients/types";

export type InstructionInput = {
  siteOrigin: string;
  clientName?: string;
  domain?: string;
  plan?: string;
  adminPassword?: string;
  nodePort?: number;
  hosting?: HostingKind;
  includeEditor?: boolean;
  sourceUrl?: string;
};

function hostingLines(kind: HostingKind, origin: string, port: number): string[] {
  const host = origin.replace(/^https?:\/\//, "");
  if (kind === "local") {
    return [
      "4. КОМПЬЮТЕР (без своего сервера)",
      "Достаточно сценария A или B. В интернете сайт появится, когда будет хостинг и DNS.",
      "",
    ];
  }
  if (kind === "beget") {
    return [
      "4. ВЫКЛАДКА НА BEGET",
      "- Создайте приложение Node.js 18+ (не «только HTML», если нужны формы и /admin).",
      "- Загрузите ВСЕ файлы архива, не только папку public.",
      "- Скопируйте .env.example в .env. Порт: " + port + ".",
      "- Команда запуска: node server.mjs",
      "- Привяжите домен " + host + " к этому приложению.",
      "- SSL: Let's Encrypt в панели Beget.",
      "- Если у тарифа только статика: корень сайта = папка public (сценарий A). Форм и /admin не будет.",
      "",
    ];
  }
  if (kind === "timeweb") {
    return [
      "4. ВЫКЛАДКА НА TIMEWEB",
      "- VPS или Node-хостинг, Node.js 18+.",
      "- Загрузите архив. Файл .env — из .env.example.",
      "- Запуск: node server.mjs",
      "- Удобно: pm2 start server.mjs --name site",
      "- Проксируйте " + origin + " на 127.0.0.1:" + port,
      "- Выпустите SSL на домен " + host + ".",
      "",
    ];
  }
  return [
    "4. ВЫКЛАДКА НА VPS",
    "- Node.js 18+ и Nginx (или Caddy).",
    "- Каталог с распакованным архивом. cp .env.example .env",
    "- Запуск: node server.mjs",
    "- Или: pm2 start server.mjs --name site",
    "- Nginx: location / { proxy_pass http://127.0.0.1:" + port + "; }",
    "- server_name " + host + ";",
    "- SSL: certbot или панель (ISPmanager и т.п.).",
    "- Не открывайте сайт через file:// — стили и внутренние страницы сломаются.",
    "",
  ];
}

export function deployInstructionTxt(input: InstructionInput): string {
  const origin = (input.siteOrigin || "https://YOUR-DOMAIN.RU").replace(/\/+$/, "");
  const domain = input.domain || origin.replace(/^https?:\/\//, "");
  const port = input.nodePort && input.nodePort > 0 ? input.nodePort : 3000;
  const hosting = input.hosting || "vps";
  const editor = input.includeEditor !== false;
  const password = input.adminPassword?.trim() || "(задайте в файле .env поле ADMIN_PASSWORD)";
  const who = input.clientName?.trim() || "клиент";
  const plan = input.plan === "pro" ? "Pro (страницы, которые вошли в пакет)" : "Basic (обычно одна главная, если так снимали)";

  const lines: string[] = [
    "ИНСТРУКЦИЯ К САЙТУ",
    "Перенос с Craftum. Это архив вашего сайта, не подписка на конструктор.",
    "",
    "Клиент: " + who,
    "Домен: " + origin,
    "Тариф: " + plan,
  ];
  if (input.sourceUrl) lines.push("Источник: " + input.sourceUrl);
  lines.push(
    "",
    "Техподдержка в базовую цену не входит.",
    "",
    "1. ЧТО В АРХИВЕ",
    "",
    "public/             готовый сайт (HTML, CSS, картинки, шрифты)",
    "data/source/        исходный HTML (для повторной публикации)",
    "data/content.json   тексты, которые правите в админке",
    "data/page-model.json  список страниц и полей",
    "server.mjs          запуск сайта + админка + приём форм",
    "admin.html          страница /admin",
    "patch.cjs           применение правок к HTML",
    ".env.example        шаблон настроек (скопируйте в .env)",
    "INSTRUKTSIYA.txt    эта инструкция",
    "",
    "2. СЦЕНАРИЙ A — ПОСМОТРЕТЬ САЙТ БЕЗ ФОРМ",
    "",
    "Нужен Node.js 18 или новее: https://nodejs.org/",
    "В терминале откройте папку распакованного архива и выполните:",
    "",
    "    npx --yes serve public -p " + port,
    "",
    "В браузере: http://127.0.0.1:" + port + "/",
    "",
    "Формы и адрес /admin в этом режиме НЕ работают. Это только просмотр вёрстки.",
    "Не открывайте index.html двойным щелчком (адрес file://) — пропадут стили и меню.",
    "",
  );

  if (editor) {
    lines.push(
      "3. СЦЕНАРИЙ B — САЙТ + АДМИНКА (ЗАЯВКИ С ФОРМ)",
      "",
      "В папке архива создайте файл .env из шаблона:",
      "",
      "    copy .env.example .env     (Windows)",
      "    cp .env.example .env       (Mac / Linux)",
      "",
      "Проверьте строки:",
      "",
      "    PORT=" + port,
      "    SITE_ORIGIN=" + origin,
      "    ADMIN_PASSWORD=" + password,
      "",
      "Запуск:",
      "",
      "    node server.mjs",
      "",
      "Сайт:     http://127.0.0.1:" + port + "/",
      "Админка:  http://127.0.0.1:" + port + "/admin",
      "",
      "Пароль админки: " + password,
      "Смените его в .env, если доступ получит не только вы.",
      "",
      "Формы на сайте перехватываются. Заявки появляются в админке (Заявки),",
      "даже если в Craftum форма уходила на другую почту. Почту настраивать не обязательно:",
      "заявка сохраняется и без неё.",
      "",
      "Правка текстов: слева страница, в центре живой сайт, клик по блоку — поле справа.",
      "SEO / сайт: title, description, favicon, Open Graph, Метрика, вебмастер, HTML в head и body.",
      "Сохранить черновик → Опубликовать. После публикации обновляются файлы в public/.",
      "",
    );
  } else {
    lines.push(
      "3. СЦЕНАРИЙ B — АДМИНКА (ОПЦИОНАЛЬНО)",
      "",
      "По договорённости пакет можно смотреть только как статику (сценарий A).",
      "Если понадобятся формы и правки текстов: скопируйте .env.example в .env,",
      "задайте ADMIN_PASSWORD и выполните: node server.mjs",
      "Админка: http://127.0.0.1:" + port + "/admin",
      "",
    );
  }

  lines.push(
    ...hostingLines(hosting, origin, port),
    "5. DNS",
    "",
    "A-запись домена " + domain + " должна указывать на IP хостинга.",
    "Пока DNS не обновится (иногда до суток), с телефона сайт может не открыться.",
    "Проверка с компьютера: hosts или сразу IP — только для отладки.",
    "",
    "6. ЧЕГО НЕТ В БАЗОВОМ ПАКЕТЕ",
    "",
    "- круглосуточная техподдержка;",
    "- онлайн-оплата (ЮKassa и аналоги);",
    "- магазин/корзина Craftum как платёжный сервис;",
    "- конструктор «собрать сайт заново» — вы получаете уже свёрстанные страницы.",
    "",
    "7. ЕСЛИ ЧТО-ТО НЕ ТАК",
    "",
    "- Белый или «голый» сайт: открыт file:// или не из папки public.",
    "- Браузер скачивает странные файлы .bin: ошибка ссылок, напишите оператору пакета.",
    "- Форма «молчит»: нужен сценарий B (node server.mjs), не только serve public.",
    "- 404 на внутренних страницах: в Basic могла быть выгружена только главная.",
    "- /admin не пускает: проверьте ADMIN_PASSWORD в .env и что запущен server.mjs.",
    "",
  );

  return lines.join("\r\n");
}

/** Совместимость: раньше в ZIP клали markdown. */
export function deployReadme(siteOrigin: string, clientName?: string): string {
  return deployInstructionTxt({ siteOrigin, clientName });
}

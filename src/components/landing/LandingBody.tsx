import { DemoImportForm } from "@/components/funnel/DemoImportForm";
import { formatRub, type Plan } from "@/modules/billing/types";
import Link from "next/link";
import { ContactLinks } from "./ContactLinks";
import { LandingLeadForm } from "./LandingLeadForm";

const BENEFITS = [
  {
    title: "Свой хостинг",
    text: "Вы уходите с Крафтума на площадку, которой владеете: Beget, Timeweb или свой сервер. Сайт больше не живёт в чужом конструкторе.",
  },
  {
    title: "Домен остаётся вашим",
    text: "Новый покупать не нужно. Домен уже ваш — его только отвязать от Крафтума и направить на ваш хостинг. Сначала выкладываем сайт, потом переключаем домен.",
  },
  {
    title: "Сайт как был",
    text: "Внешний вид, тексты и фото сохраняются. Это переезд, а не сборка с нуля.",
  },
  {
    title: "Разово, не подписка",
    text: "Платите за переезд один раз. Дальше сайт на вашем хостинге, без ежемесячной аренды конструктора.",
  },
];

const FAQ = [
  {
    q: "Что это за услуга?",
    a: "Перенос сайта с Крафтума на ваш личный хостинг. Вы уходите из конструктора, сайт остаётся с вами.",
  },
  {
    q: "Сайт будет выглядеть так же?",
    a: "Да. Мы снимаем готовые страницы и отдаём их вам. Верстку заново не собираем.",
  },
  {
    q: "Нужно ли покупать новый домен?",
    a: "Нет. Домен остаётся вашим. На Крафтуме он только привязан к их серверам. Его отвязываем и направляем на ваш хостинг.",
  },
  {
    q: "Что значит «отвязать домен»?",
    a: "В панели Крафтума снимаете привязку. У регистратора домена ставите A-запись на IP вашего хостинга. Если стоят NS Крафтума — возвращаете NS регистратора. Домен никуда не «передаётся».",
  },
  {
    q: "Когда отвязывать, чтобы сайт не пропал?",
    a: "Только после того, как копия уже открывается на вашем хостинге. Сначала выкладка, потом переключение домена. Пока DNS обновляется, сайт уже живёт у вас.",
  },
  {
    q: "Чем Basic отличается от Pro?",
    a: "Basic — главная страница. Pro — весь сайт. В обоих случаях пакет уезжает на ваш хостинг, домен остаётся вашим.",
  },
  {
    q: "Это подписка?",
    a: "Нет. Разовый переезд. Сопровождение и установка под ключ — по договорённости, не в базовой цене.",
  },
  {
    q: "Можно сначала посмотреть?",
    a: "Да. Бесплатно снимаем одну страницу и сразу показываем, как она выглядит вне Крафтума.",
  },
];

export function LandingBody({ plans }: { plans: Plan[] }) {
  return (
    <div className="bg-black text-white">
      <section id="benefits" className="mx-auto w-full max-w-6xl px-6 py-24">
        <p className="font-tight text-sm tracking-[0.2em] text-white/45 uppercase">Преимущества</p>
        <h2 className="mt-4 max-w-3xl font-instrument-serif text-4xl leading-tight tracking-[-0.04em] ipad:text-5xl">
          Уходите с Крафтума — сайт, домен и хостинг остаются вашими
        </h2>
        <div className="mt-12 grid gap-4 md:grid-cols-2">
          {BENEFITS.map((item) => (
            <article
              key={item.title}
              className="rounded-[28px] border border-white/10 bg-white/[0.03] p-8"
            >
              <h3 className="font-tight text-xl font-medium">{item.title}</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-white/65">{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="offer" className="mx-auto w-full max-w-6xl px-6 pb-24">
        <p className="font-tight text-sm tracking-[0.2em] text-white/45 uppercase">Оферта</p>
        <h2 className="mt-4 max-w-3xl font-instrument-serif text-4xl leading-tight tracking-[-0.04em] ipad:text-5xl">
          Разовый переезд на ваш хостинг
        </h2>
        <p className="mt-4 max-w-2xl text-white/60">
          Не аренда конструктора. Один платёж — сайт у вас. Домен не продаём и не забираем:
          отвязываем от Крафтума, когда копия уже стоит на вашем сервере.
        </p>
        <div className="mt-12 grid gap-4 lg:grid-cols-2">
          {plans.map((plan) => (
            <article
              key={plan.id}
              className="flex flex-col rounded-[32px] border border-white/10 bg-linear-to-b from-white/[0.07] to-white/[0.02] p-8"
            >
              <div className="flex items-baseline justify-between gap-4">
                <h3 className="font-tight text-2xl font-medium">{plan.name}</h3>
                <p className="font-tight text-sm text-white/45">{plan.pages} · разово</p>
              </div>
              <p className="mt-4 font-instrument-serif text-5xl tracking-[-0.04em]">
                {formatRub(plan.amountRub)}
              </p>
              <p className="mt-3 text-white/65">{plan.summary}</p>
              <ul className="mt-6 flex-1 space-y-2 text-[15px] text-white/75">
                {plan.features.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-white/70" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <a
                href="#lead"
                className="mt-8 inline-flex items-center justify-center rounded-full bg-white px-5 py-3 font-tight text-sm font-medium text-[#121212]"
              >
                Оставить заявку на {plan.name}
              </a>
            </article>
          ))}
        </div>
      </section>

      <section id="faq" className="mx-auto w-full max-w-3xl px-6 pb-24">
        <p className="font-tight text-sm tracking-[0.2em] text-white/45 uppercase">Вопросы и ответы</p>
        <h2 className="mt-4 font-instrument-serif text-4xl tracking-[-0.04em]">Часто спрашивают</h2>
        <div className="mt-10 divide-y divide-white/10 border-y border-white/10">
          {FAQ.map((item) => (
            <details key={item.q} className="group py-5">
              <summary className="cursor-pointer list-none font-tight text-lg text-white marker:content-none [&::-webkit-details-marker]:hidden">
                <span className="flex items-center justify-between gap-4">
                  {item.q}
                  <span className="text-white/40 transition group-open:rotate-45">+</span>
                </span>
              </summary>
              <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-white/65">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section id="demo" className="mx-auto w-full max-w-6xl px-6 pb-24">
        <div className="grid gap-10 rounded-[36px] border border-white/10 bg-white/[0.03] p-8 lg:grid-cols-2 lg:p-12">
          <div>
            <p className="font-tight text-sm tracking-[0.2em] text-white/45 uppercase">Проба</p>
            <h2 className="mt-4 font-instrument-serif text-4xl tracking-[-0.04em]">
              Бесплатно посмотрите свою страницу вне Крафтума
            </h2>
            <p className="mt-4 text-white/60">
              Одна страница, без оплаты. Если узнаете свой сайт — можно переезжать на хостинг.
            </p>
          </div>
          <div>
            <DemoImportForm tone="dark" />
          </div>
        </div>
      </section>

      <section id="contacts" className="mx-auto w-full max-w-6xl scroll-mt-8 px-6 pb-16">
        <div
          id="lead"
          className="grid gap-10 rounded-[36px] border border-white/10 bg-[radial-gradient(120%_80%_at_0%_0%,rgba(180,52,26,0.18),transparent_55%)] p-8 lg:grid-cols-2 lg:p-12"
        >
          <div>
            <p className="font-tight text-sm tracking-[0.2em] text-white/45 uppercase">Заявка</p>
            <h2 className="mt-4 max-w-xl font-instrument-serif text-4xl tracking-[-0.04em]">
              Оставьте заявку — она сразу придёт в работу
            </h2>
            <p className="mt-4 max-w-xl text-white/60">
              Демо не обязательно. Напишите контакты и адрес сайта — разберём переезд на ваш хостинг
              и отвязку домена от Крафтума. Можно сразу в мессенджер.
            </p>
            <div className="mt-8">
              <ContactLinks />
            </div>
          </div>
          <LandingLeadForm plans={plans} />
        </div>
      </section>

      <footer className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 pb-10 text-xs text-white/35">
        <p>Craft · переезд с Крафтума на свой хостинг</p>
        <Link href="/login" className="hover:text-white/70">
          Вход
        </Link>
      </footer>
    </div>
  );
}

import { getStoreConfig } from '@/config/store';

export const metadata = {
  title: 'Contato | LunaFit',
};

export default function ContactPage() {
  const store = getStoreConfig();
  const channels = [
    store.instagramUrl ? { label: 'Instagram', value: store.instagramUrl, href: store.instagramUrl } : null,
    store.whatsappHref
      ? { label: 'WhatsApp', value: store.whatsappNumber, href: store.whatsappHref }
      : null,
    store.emailHref ? { label: 'Email', value: store.email, href: store.emailHref } : null,
  ].filter(Boolean) as Array<{ label: string; value: string; href: string }>;

  return (
    <main>
      <section className="mx-auto max-w-4xl px-5 py-12">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-rose-600">Contato</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-zinc-950">Fale com a LunaFit</h1>
        <p className="mt-4 max-w-2xl text-base leading-8 text-zinc-600">
          Use os canais configurados pela loja para tirar duvidas sobre tamanhos, disponibilidade e
          pedidos.
        </p>

        {channels.length > 0 ? (
          <div className="mt-9 grid gap-4 sm:grid-cols-2">
            {channels.map((channel) => (
              <a
                key={channel.label}
                href={channel.href}
                target={channel.href.startsWith('http') ? '_blank' : undefined}
                rel={channel.href.startsWith('http') ? 'noreferrer' : undefined}
                className="rounded-md border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-rose-300 hover:shadow-md"
              >
                <h2 className="text-lg font-semibold text-zinc-950">{channel.label}</h2>
                <p className="mt-2 break-words text-sm text-zinc-600">{channel.value}</p>
              </a>
            ))}
          </div>
        ) : (
          <div className="mt-9 rounded-md border border-dashed border-zinc-300 bg-zinc-50 p-6">
            <h2 className="text-lg font-semibold text-zinc-950">Canais nao configurados</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              Defina Instagram, WhatsApp ou email no arquivo de ambiente para publicar os contatos reais da loja.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}

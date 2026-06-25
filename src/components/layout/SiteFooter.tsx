import Link from 'next/link';
import { getStoreConfig } from '@/config/store';

export function SiteFooter() {
  const store = getStoreConfig();
  const contactLinks = [
    store.instagramUrl ? { href: store.instagramUrl, label: 'Instagram' } : null,
    store.whatsappHref ? { href: store.whatsappHref, label: 'WhatsApp' } : null,
    store.emailHref ? { href: store.emailHref, label: 'Email' } : null,
  ].filter(Boolean) as Array<{ href: string; label: string }>;

  return (
    <footer className="border-t border-zinc-200 bg-zinc-950 text-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-10 md:grid-cols-[1.3fr_0.7fr]">
        <div>
          <Link href="/" className="text-lg font-bold">
            {store.name}
          </Link>
          <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-400">{store.tagline}</p>
        </div>
        <div className="md:text-right">
          <p className="text-sm font-semibold text-zinc-200">Atendimento</p>
          {contactLinks.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-3 md:justify-end">
              {contactLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target={link.href.startsWith('http') ? '_blank' : undefined}
                  rel={link.href.startsWith('http') ? 'noreferrer' : undefined}
                  className="text-sm text-zinc-400 transition hover:text-white"
                >
                  {link.label}
                </a>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-zinc-500">Canais de contato ainda nao configurados.</p>
          )}
        </div>
      </div>
    </footer>
  );
}

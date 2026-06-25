export function getStoreConfig() {
  const whatsappNumber = process.env.NEXT_PUBLIC_STORE_WHATSAPP_NUMBER?.trim() ?? '';
  const instagramUrl = process.env.NEXT_PUBLIC_STORE_INSTAGRAM_URL?.trim() ?? '';
  const email = process.env.NEXT_PUBLIC_STORE_EMAIL?.trim() ?? '';

  return {
    name: process.env.NEXT_PUBLIC_STORE_NAME?.trim() || 'LunaFit',
    tagline: 'Moda fitness feminina para treino, rotina e movimento.',
    description:
      'Pecas fitness femininas com modelagem atual, conforto para o treino e acabamento pensado para o dia a dia.',
    whatsappNumber,
    whatsappHref: whatsappNumber ? `https://wa.me/${whatsappNumber.replace(/\D/g, '')}` : '',
    instagramUrl,
    email,
    emailHref: email ? `mailto:${email}` : '',
  };
}

type SendAuthEmailInput = {
  to: string;
  subject: string;
  title: string;
  message: string;
  actionLabel: string;
  actionUrl: string;
  idempotencyKey: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function isCustomerEmailConfigured() {
  return Boolean(
    process.env.RESEND_API_KEY?.trim() &&
      process.env.EMAIL_FROM?.trim() &&
      process.env.AUTH_URL?.trim()
  );
}

export function getAuthActionUrl(path: string, token: string) {
  const baseUrl = process.env.AUTH_URL?.trim().replace(/\/+$/, '');

  if (!baseUrl) {
    throw new Error('EMAIL_NOT_CONFIGURED');
  }

  return `${baseUrl}${path}?token=${encodeURIComponent(token)}`;
}

export async function sendAuthEmail(input: SendAuthEmailInput) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();

  if (!apiKey || !from) {
    throw new Error('EMAIL_NOT_CONFIGURED');
  }

  const safeTitle = escapeHtml(input.title);
  const safeMessage = escapeHtml(input.message);
  const safeActionUrl = escapeHtml(input.actionUrl);
  const safeActionLabel = escapeHtml(input.actionLabel);
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': input.idempotencyKey,
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.subject,
      html: `
        <div style="background:#f4f4f5;padding:32px 16px;font-family:Arial,sans-serif;color:#18181b">
          <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e4e4e7;padding:32px">
            <p style="margin:0 0 24px;font-size:20px;font-weight:700">LunaFit</p>
            <h1 style="margin:0 0 16px;font-size:26px;line-height:1.25">${safeTitle}</h1>
            <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#52525b">${safeMessage}</p>
            <a href="${safeActionUrl}" style="display:inline-block;background:#e11d48;color:#ffffff;text-decoration:none;padding:13px 20px;font-size:14px;font-weight:700">
              ${safeActionLabel}
            </a>
            <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#71717a">
              Se voce nao solicitou esta mensagem, pode ignora-la com seguranca.
            </p>
          </div>
        </div>
      `,
      text: `${input.title}\n\n${input.message}\n\n${input.actionLabel}: ${input.actionUrl}\n\nSe voce nao solicitou esta mensagem, ignore este email.`,
    }),
  });

  if (!response.ok) {
    throw new Error('EMAIL_SEND_FAILED');
  }
}

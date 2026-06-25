import { randomUUID } from 'crypto';
import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const IMAGE_EXTENSIONS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

function unauthorized() {
  return NextResponse.json({ error: 'Acesso nao autorizado.' }, { status: 401 });
}

function isUploadFile(value: FormDataEntryValue | null): value is File {
  return (
    typeof value === 'object' &&
    value !== null &&
    'arrayBuffer' in value &&
    'name' in value &&
    'size' in value &&
    'type' in value
  );
}

export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return unauthorized();
  }

  const formData = await request.formData().catch(() => null);

  if (!formData) {
    return NextResponse.json({ error: 'Upload invalido.' }, { status: 400 });
  }

  const image = formData.get('image');

  if (!isUploadFile(image) || image.size === 0) {
    return NextResponse.json({ error: 'Anexe uma imagem do produto.' }, { status: 400 });
  }

  if (image.size > MAX_IMAGE_SIZE_BYTES) {
    return NextResponse.json({ error: 'A imagem pode ter no maximo 5MB.' }, { status: 413 });
  }

  const extension = IMAGE_EXTENSIONS[image.type];

  if (!extension) {
    return NextResponse.json(
      { error: 'Use uma imagem PNG, JPG ou WEBP.' },
      { status: 415 }
    );
  }

  const fileName = `${randomUUID()}${extension}`;
  const blob = await put(`products/${fileName}`, image, {
    access: 'public',
    contentType: image.type,
  });

  return NextResponse.json(
    {
      imageUrl: blob.url,
    },
    { status: 201 }
  );
}

'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { getPrisma } from '@/lib/prisma';

export async function deleteProductAction(id: number) {
  await requireAdmin();

  if (!Number.isInteger(id) || id <= 0) {
    return;
  }

  await getPrisma().product.delete({ where: { id } }).catch(() => null);
  revalidatePath('/admin');
  revalidatePath('/produtos');
  revalidatePath('/');
}

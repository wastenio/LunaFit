'use server';

import { clearAdminSession, createAdminSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

export async function loginAdminAction(formData: FormData) {
  const password = String(formData.get('password') ?? '');
  const result = await createAdminSession(password);

  if (result === 'missing-config') {
    redirect('/admin/login?error=config');
  }

  if (result === 'invalid') {
    redirect('/admin/login?error=invalid');
  }

  redirect('/admin');
}

export async function logoutAdminAction() {
  await clearAdminSession();
  redirect('/admin/login');
}

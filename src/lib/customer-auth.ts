import { auth } from '@/auth';

export async function getCustomerSession() {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  return session;
}

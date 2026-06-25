import { NextResponse } from 'next/server';
import { countUnreadNotifications } from '@/features/notifications/notification-data';
import { getCustomerSession } from '@/lib/customer-auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getCustomerSession();

  if (!session) {
    return NextResponse.json({ count: 0 }, { status: 401 });
  }

  const count = await countUnreadNotifications(session.user.id);
  return NextResponse.json({ count });
}

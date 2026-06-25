'use client';

import Link from 'next/link';
import { Bell } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

type CustomerNotificationButtonProps = {
  initialCount: number;
};

export function CustomerNotificationButton({
  initialCount,
}: CustomerNotificationButtonProps) {
  const [unreadCount, setUnreadCount] = useState(initialCount);

  const refreshUnreadCount = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications/unread-count', {
        cache: 'no-store',
      });

      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as { count?: number };

      if (typeof data.count === 'number') {
        setUnreadCount(data.count);
      }
    } catch {
      // The server-rendered count remains available if a background refresh fails.
    }
  }, []);

  useEffect(() => {
    const interval = window.setInterval(refreshUnreadCount, 30_000);
    window.addEventListener('focus', refreshUnreadCount);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', refreshUnreadCount);
    };
  }, [refreshUnreadCount]);

  return (
    <Link
      href="/notificacoes"
      className="relative grid h-10 w-10 place-items-center rounded-md text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-950"
      aria-label={
        unreadCount > 0
          ? `${unreadCount} notificacao(oes) nao lida(s)`
          : 'Notificacoes'
      }
      title="Notificacoes"
    >
      <Bell aria-hidden="true" className="h-5 w-5" />
      {unreadCount > 0 ? (
        <span className="absolute right-0 top-0 grid h-5 min-w-5 place-items-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      ) : null}
    </Link>
  );
}

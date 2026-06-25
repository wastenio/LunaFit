'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

export function AnalyticsTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname.startsWith('/admin')) {
      return;
    }

    const privacyNavigator = navigator as Navigator & {
      globalPrivacyControl?: boolean;
      doNotTrack?: string | null;
    };

    if (
      privacyNavigator.globalPrivacyControl ||
      privacyNavigator.doNotTrack === '1'
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      const body = JSON.stringify({
        path: pathname,
        search: window.location.search,
        referrer: document.referrer,
      });

      if (navigator.sendBeacon) {
        navigator.sendBeacon(
          '/api/analytics/page-view',
          new Blob([body], { type: 'application/json' })
        );
        return;
      }

      void fetch('/api/analytics/page-view', {
        body,
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
        method: 'POST',
      });
    }, 300);

    return () => window.clearTimeout(timer);
  }, [pathname]);

  return null;
}

import { AdminShell } from '@/features/admin/components/AdminShell';
import { requireAdmin } from '@/lib/auth';

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return <AdminShell>{children}</AdminShell>;
}

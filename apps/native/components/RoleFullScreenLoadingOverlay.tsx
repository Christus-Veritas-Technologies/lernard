import { Role } from '@lernard/shared-types';

import { GuardianFullScreenLoading } from '@/components/GuardianFullScreenLoading';
import { StudentFullScreenLoading } from '@/components/StudentFullScreenLoading';
import { useAuthStore } from '@/store/store';

export function RoleFullScreenLoadingOverlay() {
  const role = useAuthStore((state) => state.role);
  const networkLoadingCount = useAuthStore((state) => state.networkLoadingCount);

  if (networkLoadingCount <= 0) {
    return null;
  }

  return role === Role.GUARDIAN ? <GuardianFullScreenLoading /> : <StudentFullScreenLoading />;
}

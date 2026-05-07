import { Role } from '@lernard/shared-types';

import { GuardianFullScreenLoading } from '@/components/GuardianFullScreenLoading';
import { StudentFullScreenLoading } from '@/components/StudentFullScreenLoading';
import { useAuthStore } from '@/store/store';

interface RoleFullScreenLoadingOverlayProps {
  forceVisible?: boolean;
}

export function RoleFullScreenLoadingOverlay({ forceVisible = false }: RoleFullScreenLoadingOverlayProps) {
  const role = useAuthStore((state) => state.role);
  const networkLoadingCount = useAuthStore((state) => state.networkLoadingCount);

  if (!forceVisible && networkLoadingCount <= 0) {
    return null;
  }

  return role === Role.GUARDIAN ? <GuardianFullScreenLoading /> : <StudentFullScreenLoading />;
}

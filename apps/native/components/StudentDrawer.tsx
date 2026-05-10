import { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  ArrowRight01Icon,
  Bookmark01Icon,
  ChartBarLineIcon,
  Settings02Icon,
  UserCircleIcon,
} from 'hugeicons-react-native';

import { Text } from '@rnr/text';

import { useAuthStore } from '@/store/store';
import { useRouter } from 'expo-router';

interface DrawerLink {
  label: string;
  path: '/(app)/(progress)' | '/(app)/projects' | '/(app)/settings' | '/(app)/settings/profile' | '/(app)/settings/preferences';
  description: string;
  Icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
}

const DRAWER_LINKS: DrawerLink[] = [
  {
    label: 'Lernard\'s Read on You',
    path: '/(app)/(progress)',
    description: 'Track momentum, strengths, and growth areas.',
    Icon: ChartBarLineIcon,
  },
  {
    label: 'Projects',
    path: '/(app)/projects',
    description: 'Open generated project PDFs and edit sections.',
    Icon: Bookmark01Icon,
  },
  {
    label: 'Settings',
    path: '/(app)/settings',
    description: 'Adjust learning and account controls.',
    Icon: Settings02Icon,
  },
  {
    label: 'Profile',
    path: '/(app)/settings/profile',
    description: 'Edit account details and avatar.',
    Icon: UserCircleIcon,
  },
  {
    label: 'Preferences',
    path: '/(app)/settings/preferences',
    description: 'Theme and daily target preferences.',
    Icon: Settings02Icon,
  },
];

export function StudentDrawer() {
  const router = useRouter();
  const isOpen = useAuthStore((state) => state.isStudentDrawerOpen);
  const closeDrawer = useAuthStore((state) => state.closeStudentDrawer);

  const overlayClass = useMemo(
    () => isOpen ? 'absolute inset-0 z-40' : 'absolute inset-0 z-40 pointer-events-none',
    [isOpen],
  );

  return (
    <View className={overlayClass}>
      <Pressable
        className={isOpen ? 'absolute inset-0 bg-slate-900/30' : 'absolute inset-0 bg-transparent'}
        onPress={closeDrawer}
      />

      <SafeAreaView className="absolute bottom-0 right-0 top-0 w-[86%] max-w-[360px] bg-white" edges={['top', 'bottom']}>
        <View className="flex-1 border-l border-slate-200 px-5 pb-6 pt-6">
          <View className="rounded-[26px] bg-[rgb(239,246,255)] p-5">
            <Text className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-500">Student drawer</Text>
            <Text className="mt-2 text-2xl font-semibold text-slate-900">More learning spaces</Text>
            <Text className="mt-2 text-sm leading-6 text-slate-600">Open progress and settings without crowding your bottom tabs.</Text>
          </View>

          <View className="mt-5 gap-3">
            {DRAWER_LINKS.map(({ label, path, description, Icon }) => (
              <Pressable
                className="rounded-[20px] border border-slate-200 bg-slate-50 p-4"
                key={path}
                onPress={() => {
                  closeDrawer();
                  router.push(path);
                }}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2">
                    <Icon color="#4F46E5" size={18} strokeWidth={1.8} />
                    <Text className="text-base font-semibold text-slate-900">{label}</Text>
                  </View>
                  <ArrowRight01Icon color="#94A3B8" size={16} strokeWidth={1.8} />
                </View>
                <Text className="mt-2 text-sm leading-6 text-slate-600">{description}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

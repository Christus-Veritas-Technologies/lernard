import { View } from 'react-native';

import { ChartBarLineIcon, Settings02Icon } from 'hugeicons-react-native';

import { Text } from '@rnr/text';

interface GuardianEmptyVisualProps {
  title: string;
  subtitle: string;
}

export function GuardianEmptyVisual({ title, subtitle }: GuardianEmptyVisualProps) {
  return (
    <View className="rounded-[28px] border border-dashed border-slate-200 bg-slate-50 p-5">
      <View className="flex-row items-center justify-between">
        <View className="rounded-2xl bg-indigo-100 p-2.5">
          <ChartBarLineIcon color="#4F46E5" size={18} strokeWidth={1.8} />
        </View>
        <View className="rounded-2xl bg-sky-100 p-2.5">
          <Settings02Icon color="#0284C7" size={18} strokeWidth={1.8} />
        </View>
      </View>

      <Text className="mt-4 text-base font-semibold text-slate-900">{title}</Text>
      <Text className="mt-1 text-sm text-slate-500">{subtitle}</Text>

      <View className="mt-4 gap-2">
        <View className="h-2 rounded-full bg-slate-200" style={{ width: '92%' }} />
        <View className="h-2 rounded-full bg-slate-200" style={{ width: '68%' }} />
        <View className="h-2 rounded-full bg-slate-200" style={{ width: '80%' }} />
      </View>

      <View className="mt-4 flex-row gap-2">
        <View className="h-16 flex-1 rounded-2xl bg-white" />
        <View className="h-16 flex-1 rounded-2xl bg-white" />
        <View className="h-16 flex-1 rounded-2xl bg-white" />
      </View>
    </View>
  );
}

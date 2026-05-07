import { View } from 'react-native';

import { Text } from '@rnr/text';

export function StudentFullScreenLoading() {
  return (
    <View className="absolute inset-0 z-50 items-center justify-center bg-background/95 px-8">
      <View className="w-full max-w-sm rounded-[28px] border border-indigo-100 bg-white p-6 shadow-sm">
        <Text className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-500">
          Lernard Student
        </Text>
        <Text className="mt-3 text-2xl font-semibold text-slate-900">Preparing your learning space</Text>
        <Text className="mt-2 text-base leading-7 text-slate-600">
          Loading your lessons, quizzes, progress, and chat experience.
        </Text>
      </View>
    </View>
  );
}

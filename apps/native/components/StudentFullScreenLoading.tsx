import { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Atom02Icon, BookOpen01Icon } from 'hugeicons-react-native';

import { Text } from '@rnr/text';

export function StudentFullScreenLoading() {
  const pulse = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.35,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );

    loop.start();

    return () => {
      loop.stop();
    };
  }, [pulse]);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <View className="flex-1 items-center justify-center px-8">
        <View className="w-full max-w-sm rounded-[28px] border border-indigo-100 bg-white p-6 shadow-sm">
          <View className="flex-row items-center justify-between">
            <View className="rounded-xl bg-indigo-100 p-2">
              <BookOpen01Icon color="#4F46E5" size={20} strokeWidth={1.8} />
            </View>
            <View className="rounded-xl bg-sky-100 p-2">
              <Atom02Icon color="#0EA5E9" size={20} strokeWidth={1.8} />
            </View>
          </View>
          <Text className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-indigo-500">
            Lernard Student
          </Text>
          <Text className="mt-3 text-2xl font-semibold text-slate-900">Preparing your learning space</Text>
          <Text className="mt-2 text-base leading-7 text-slate-600">
            Loading lessons, Practice Exams, progress, and chat.
          </Text>
          <View className="mt-5 flex-row gap-2">
            {[0, 1, 2].map((index) => (
              <Animated.View
                className="h-2 flex-1 rounded-full bg-indigo-300"
                key={index}
                style={{ opacity: pulse }}
              />
            ))}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

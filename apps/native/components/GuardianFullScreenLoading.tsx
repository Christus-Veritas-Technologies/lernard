import { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChartBarLineIcon, UserGroupIcon } from 'hugeicons-react-native';

import { Text } from '@rnr/text';

export function GuardianFullScreenLoading() {
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
        <View className="w-full max-w-sm rounded-[28px] border border-sky-100 bg-white p-6 shadow-sm">
          <View className="flex-row items-center justify-between">
            <View className="rounded-xl bg-sky-100 p-2">
              <UserGroupIcon color="#0284C7" size={20} strokeWidth={1.8} />
            </View>
            <View className="rounded-xl bg-teal-100 p-2">
              <ChartBarLineIcon color="#0F766E" size={20} strokeWidth={1.8} />
            </View>
          </View>
          <Text className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-sky-600">
            Lernard Guardian
          </Text>
          <Text className="mt-3 text-2xl font-semibold text-slate-900">Preparing your household hub</Text>
          <Text className="mt-2 text-base leading-7 text-slate-600">
            Loading children progress, companion controls, and settings.
          </Text>
          <View className="mt-5 flex-row gap-2">
            {[0, 1, 2].map((index) => (
              <Animated.View
                className="h-2 flex-1 rounded-full bg-sky-300"
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

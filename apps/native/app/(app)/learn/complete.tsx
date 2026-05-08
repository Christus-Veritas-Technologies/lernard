import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ROUTES } from '@lernard/routes';

import { Text } from '@rnr/text';

import { Button } from '@/components/Button';
import { nativeApiFetch } from '@/lib/native-api';

export default function PostLessonScreen() {
  const router = useRouter();
  const { lessonId, topic } = useLocalSearchParams<{ lessonId: string; topic?: string }>();
  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [saving, setSaving] = useState(false);
  const [xpEarned, setXpEarned] = useState<number | null>(null);

  const saveCompletion = async () => {
    if (xpEarned !== null) return;
    setSaving(true);
    try {
      const result = await nativeApiFetch<{ xpEarned: number }>(
        ROUTES.LESSONS.COMPLETE(lessonId),
        {
          method: 'POST',
          body: JSON.stringify({ confidenceRating: rating }),
        },
      );
      setXpEarned(result.xpEarned);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50 px-4 pt-6">
      <View className="rounded-3xl border border-slate-200 bg-white p-5">
        <Text className="text-xs font-semibold uppercase tracking-[0.15em] text-indigo-600">Lesson complete</Text>
        <Text className="mt-2 text-2xl font-semibold text-slate-900">{topic ?? 'Great work'}</Text>
        <Text className="mt-2 text-sm leading-6 text-slate-600">
          How confident do you feel about this topic now?
        </Text>

        <View className="mt-4 flex-row gap-2">
          {[1, 2, 3, 4, 5].map((value) => {
            const selected = rating === value;
            return (
              <View className="flex-1" key={value}>
                <Button
                  onPress={() => setRating(value as 1 | 2 | 3 | 4 | 5)}
                  title={`${value}`}
                  variant={selected ? 'primary' : 'secondary'}
                />
              </View>
            );
          })}
        </View>

        <View className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
          <Text className="text-sm font-medium text-emerald-800">
            XP earned: {xpEarned ?? 'Save your rating to calculate'}
          </Text>
        </View>

        <View className="mt-4">
          <Button onPress={() => void saveCompletion()} title={saving ? 'Saving...' : xpEarned === null ? 'Save lesson result' : 'Saved'} />
        </View>
      </View>

      <View className="mt-4 gap-3">
        <Button
          onPress={() =>
            router.push({
              pathname: '/quiz/entry',
              params: { lessonId, topic: topic ?? '' },
            })
          }
          title="Quiz me on this"
          variant="secondary"
        />
        <Button onPress={() => router.replace('/(app)/(home)')} title="What's next?" variant="ghost" />
      </View>
    </SafeAreaView>
  );
}

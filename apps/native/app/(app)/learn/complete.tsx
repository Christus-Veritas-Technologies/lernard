import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ROUTES } from '@lernard/routes';

import { Text } from '@rnr/text';

import { Button } from '@/components/Button';
import { nativeApiFetch } from '@/lib/native-api';

const CONFIDENCE_OPTIONS: Array<{
  value: 1 | 2 | 3 | 4 | 5;
  label: string;
  description: string;
  selectedBg: string;
  selectedBorder: string;
  selectedText: string;
}> = [
  { value: 1, label: 'Not there yet', description: 'Still hazy', selectedBg: 'bg-rose-50', selectedBorder: 'border-rose-400', selectedText: 'text-rose-700' },
  { value: 2, label: 'Getting it', description: 'Starting to click', selectedBg: 'bg-amber-50', selectedBorder: 'border-amber-400', selectedText: 'text-amber-700' },
  { value: 3, label: 'Pretty sure', description: 'Mostly makes sense', selectedBg: 'bg-yellow-50', selectedBorder: 'border-yellow-400', selectedText: 'text-yellow-700' },
  { value: 4, label: 'Confident', description: 'Solid understanding', selectedBg: 'bg-teal-50', selectedBorder: 'border-teal-400', selectedText: 'text-teal-700' },
  { value: 5, label: 'Nailed it', description: 'Could explain it to someone', selectedBg: 'bg-emerald-50', selectedBorder: 'border-emerald-400', selectedText: 'text-emerald-700' },
];

export default function PostLessonScreen() {
  const router = useRouter();
  const { lessonId, topic } = useLocalSearchParams<{ lessonId: string; topic?: string }>();
  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5 | null>(null);
  const [saving, setSaving] = useState(false);
  const [xpEarned, setXpEarned] = useState<number | null>(null);

  const saved = xpEarned !== null;

  const onRate = async (value: 1 | 2 | 3 | 4 | 5) => {
    if (saved) return;
    setRating(value);
    setSaving(true);
    try {
      const result = await nativeApiFetch<{ xpEarned: number }>(
        ROUTES.LESSONS.COMPLETE(lessonId),
        {
          method: 'POST',
          body: JSON.stringify({ confidenceRating: value }),
        },
      );
      setXpEarned(result.xpEarned);
    } finally {
      setSaving(false);
    }
  };

  const selectedMeta = rating ? CONFIDENCE_OPTIONS.find((o) => o.value === rating) : null;

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <View className="flex-1 px-4 pt-8">
        {/* Header */}
        <View className="mb-8 items-center">
          <Text className="text-xs font-semibold uppercase tracking-[0.15em] text-indigo-600">
            Lesson complete
          </Text>
          <Text className="mt-2 text-center text-2xl font-semibold text-slate-900">
            {topic ?? 'Great work'}
          </Text>
          <Text className="mt-2 text-center text-sm leading-6 text-slate-500">
            Before you move on — how well do you understand this now?
          </Text>
        </View>

        {/* Confidence card */}
        <View className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <Text className="mb-4 text-sm font-semibold text-slate-700">How confident are you right now?</Text>

          <View className="gap-2">
            {CONFIDENCE_OPTIONS.map((option) => {
              const isSelected = rating === option.value;
              return (
                <Pressable
                  className={`flex-row items-center justify-between rounded-2xl border-2 px-4 py-3 ${
                    isSelected
                      ? `${option.selectedBorder} ${option.selectedBg}`
                      : 'border-slate-200 bg-white'
                  }`}
                  disabled={saving || saved}
                  key={option.value}
                  onPress={() => void onRate(option.value)}
                >
                  <View className="flex-row items-center gap-3">
                    <Text className={`text-lg font-bold ${isSelected ? option.selectedText : 'text-slate-300'}`}>
                      {option.value}
                    </Text>
                    <View>
                      <Text className={`text-sm font-semibold ${isSelected ? option.selectedText : 'text-slate-700'}`}>
                        {option.label}
                      </Text>
                      <Text className={`text-xs ${isSelected ? option.selectedText : 'text-slate-400'}`}>
                        {option.description}
                      </Text>
                    </View>
                  </View>
                  {isSelected && (
                    <Text className={`text-sm font-bold ${option.selectedText}`}>✓</Text>
                  )}
                </Pressable>
              );
            })}
          </View>

          {/* XP feedback */}
          {saving && (
            <View className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <Text className="text-center text-sm text-slate-500">Saving...</Text>
            </View>
          )}
          {saved && selectedMeta && (
            <View className={`mt-4 rounded-xl border-2 px-4 py-3 ${selectedMeta.selectedBorder} ${selectedMeta.selectedBg}`}>
              <Text className={`text-center text-sm font-semibold ${selectedMeta.selectedText}`}>
                {selectedMeta.description} · {xpEarned} XP earned
              </Text>
            </View>
          )}
        </View>

        {/* Next steps — only shown after saving */}
        {saved && (
          <View className="mt-8 gap-3">
            <Text className="text-center text-sm font-medium text-slate-500">What do you want to do next?</Text>
            <Button
              onPress={() =>
                router.push({
                  pathname: '/practice-exams/entry',
                  params: { lessonId, topic: topic ?? '' },
                })
              }
              title="Quiz me on this"
            />
            <Button
              onPress={() => router.replace('/(app)/(home)')}
              title="Back to home"
              variant="secondary"
            />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ROUTES } from '@lernard/routes';
import type { LessonContent } from '@lernard/shared-types';

import { Text } from '@rnr/text';

import { Button } from '@/components/Button';
import { RoleFullScreenLoadingOverlay } from '@/components/RoleFullScreenLoadingOverlay';
import { nativeApiFetch } from '@/lib/native-api';

type LessonResponse = { status: 'generating' | 'ready'; content?: LessonContent };

export default function LessonReaderScreen() {
  const { lessonId } = useLocalSearchParams<{ lessonId: string }>();
  const router = useRouter();

  const [lesson, setLesson] = useState<LessonResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await nativeApiFetch<LessonResponse>(ROUTES.LESSONS.GET(lessonId));
      if (data.status === 'generating') {
        router.replace('/');
        return;
      }
      setLesson(data);
    } catch {
      setError('Could not load this lesson. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [lessonId, router]);

  useEffect(() => { void load(); }, [load]);

  if (loading) {
    return <RoleFullScreenLoadingOverlay forceVisible />;
  }

  if (error || !lesson?.content) {
    return (
      <SafeAreaView className="flex-1 bg-white px-4 pt-6">
        <Text className="mb-4 text-base text-red-600">{error ?? 'Lesson unavailable.'}</Text>
        <Button onPress={load} title="Try again" />
      </SafeAreaView>
    );
  }

  const content = lesson.content;

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-slate-100 px-4 py-3">
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-base font-medium text-indigo-600">← Back</Text>
        </TouchableOpacity>
        <View className="rounded-full bg-indigo-100 px-3 py-1">
          <Text className="text-xs font-semibold text-indigo-700">{content.subjectName}</Text>
        </View>
        <Text className="text-xs text-slate-400">~{content.estimatedMinutes} min</Text>
      </View>

      {/* Lesson title */}
      <View className="px-4 pt-4 pb-2">
        <Text className="text-xl font-bold text-slate-900">{content.topic}</Text>
      </View>

      {/* Sections */}
      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
        {content.sections.map((section, index) => (
          <View
            key={`${section.type}-${index}`}
            className="mb-4 rounded-2xl border border-slate-100 bg-slate-50 p-4"
          >
            <Text className="mb-2 text-sm font-semibold uppercase tracking-wide text-indigo-600">
              {section.heading ?? section.type}
            </Text>
            <Text className="text-sm leading-6 text-slate-700">{section.body}</Text>
            {section.terms && section.terms.length > 0 ? (
              <View className="mt-3 space-y-2">
                {section.terms.map((term, ti) => (
                  <View key={ti} className="rounded-xl bg-white p-3 shadow-sm">
                    <Text className="text-xs font-semibold text-slate-900">{term.term}</Text>
                    <Text className="mt-0.5 text-xs text-slate-500">{term.explanation}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        ))}
        <View className="h-8" />
      </ScrollView>

      {/* Footer CTA */}
      <View className="border-t border-slate-100 px-4 py-4">
        <Button
          onPress={() =>
            router.push({
              pathname: '/quiz/entry',
              params: { lessonId, topic: content.topic },
            })
          }
          title="I'm done — Quiz me on this"
        />
        <TouchableOpacity className="mt-3 items-center" onPress={() => router.replace('/')}>
          <Text className="text-sm text-slate-400">Back to home</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

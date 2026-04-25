import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ROUTES } from '@lernard/routes';
import type { LessonContent, LessonSection, PostLessonContent } from '@lernard/shared-types';

import { Text } from '@rnr/text';

import { Button } from '@/components/Button';
import { StateNotice } from '@/components/StateNotice';
import { usePagePayload } from '@/hooks/usePagePayload';
import { nativeApiFetch } from '@/lib/native-api';

type SectionCheckResponse = 'got_it' | 'not_sure' | 'confused';

const SECTION_ICONS: Record<string, string> = {
    hook: '💡',
    concept: '📖',
    example: '🔬',
    recap: '✅',
};

const CHECK_OPTIONS: { value: SectionCheckResponse; label: string }[] = [
    { value: 'got_it', label: 'Got it' },
    { value: 'not_sure', label: 'Not sure' },
    { value: 'confused', label: 'Confused' },
];

export default function LessonReaderScreen() {
    const router = useRouter();
    const { lessonId } = useLocalSearchParams<{ lessonId: string }>();
    const { data, loading, error, refetch } = usePagePayload<LessonContent>(
        ROUTES.LESSONS.GET(lessonId),
    );

    const [sectionChecks, setSectionChecks] = useState<Record<number, SectionCheckResponse>>({});
    const [checkingSection, setCheckingSection] = useState<number | null>(null);
    const [isCompleting, setIsCompleting] = useState(false);
    const [completeError, setCompleteError] = useState<string | null>(null);

    if (loading) {
        return (
            <SafeAreaView className="flex-1 bg-background" edges={['top']}>
                <View className="flex-1 px-4 pb-24 pt-6">
                    <StateNotice badge="Loading" description="Pulling your lesson content." title="Loading lesson" />
                </View>
            </SafeAreaView>
        );
    }

    if (error || !data) {
        return (
            <SafeAreaView className="flex-1 bg-background" edges={['top']}>
                <View className="flex-1 px-4 pb-24 pt-6">
                    <StateNotice
                        actionTitle="Try again"
                        badge="Error"
                        description={error?.message ?? 'Could not load this lesson.'}
                        onActionPress={refetch}
                        title="Lesson failed to load"
                        tone="warning"
                    />
                </View>
            </SafeAreaView>
        );
    }

    const { lesson } = data.content;
    const answeredCount = Object.keys(sectionChecks).length;
    const totalSections = lesson.sections.length;
    const allChecked = answeredCount === totalSections;

    async function handleSectionCheck(section: LessonSection, response: SectionCheckResponse) {
        setCheckingSection(section.index);
        try {
            await nativeApiFetch(ROUTES.LESSONS.SECTION_CHECK(lesson.id), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sectionId: String(section.index), response }),
            });
        } catch {
            // Non-critical — record locally even if network call fails
        } finally {
            setSectionChecks((prev) => ({ ...prev, [section.index]: response }));
            setCheckingSection(null);
        }
    }

    async function handleComplete() {
        setIsCompleting(true);
        setCompleteError(null);
        try {
            const result = await nativeApiFetch<PostLessonContent>(ROUTES.LESSONS.COMPLETE(lesson.id), {
                method: 'POST',
            });
            router.replace({
                pathname: '/learn/[lessonId]/complete',
                params: {
                    lessonId: result.lessonId,
                    xp: String(result.xpEarned),
                    topic: result.topic,
                    subject: result.subject,
                    summary: JSON.stringify(result.summary),
                },
            });
        } catch (e) {
            setCompleteError(e instanceof Error ? e.message : 'Could not complete lesson. Try again.');
            setIsCompleting(false);
        }
    }

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top']}>
            <ScrollView className="flex-1" contentContainerClassName="px-4 pb-40 pt-6 gap-4">
                {/* Header */}
                <View className="gap-1">
                    <Text className="text-sm font-semibold uppercase tracking-widest text-indigo-500">
                        {lesson.subject}
                    </Text>
                    <Text className="text-2xl font-semibold text-foreground">{lesson.topic}</Text>
                    <Text className="text-sm text-muted-foreground">
                        {lesson.depth} • ~{lesson.estimatedReadTime} min
                    </Text>
                </View>

                {/* Progress bar */}
                <View className="h-2 overflow-hidden rounded-full bg-slate-200">
                    <View
                        className="h-full rounded-full bg-indigo-500"
                        style={{ width: `${totalSections > 0 ? Math.round((answeredCount / totalSections) * 100) : 0}%` }}
                    />
                </View>

                {/* Sections */}
                {lesson.sections.map((section) => {
                    const checked = sectionChecks[section.index] ?? null;
                    const isLoading = checkingSection === section.index;
                    return (
                        <View className="rounded-[28px] border border-slate-200 bg-white p-5 gap-3" key={section.index}>
                            <View className="flex-row items-center gap-2">
                                <Text className="text-xl">{SECTION_ICONS[section.type] ?? '📝'}</Text>
                                <View className="rounded-full bg-slate-100 px-2 py-0.5">
                                    <Text className="text-xs font-semibold uppercase tracking-widest text-slate-600">
                                        {section.type}
                                    </Text>
                                </View>
                            </View>
                            <Text className="text-lg font-semibold text-foreground">{section.title}</Text>
                            <Text className="text-base leading-7 text-muted-foreground">{section.content}</Text>

                            {/* Check buttons */}
                            <Text className="text-sm font-medium text-foreground">How did that land?</Text>
                            <View className="flex-row flex-wrap gap-2">
                                {CHECK_OPTIONS.map((opt) => (
                                    <Pressable
                                        className={`rounded-full px-4 py-2 ${checked === opt.value ? 'bg-indigo-200' : 'bg-slate-100'}`}
                                        disabled={isLoading}
                                        key={opt.value}
                                        onPress={() => void handleSectionCheck(section, opt.value)}
                                    >
                                        <Text className={`text-sm font-semibold ${checked === opt.value ? 'text-indigo-800' : 'text-slate-700'}`}>
                                            {opt.label}
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>
                        </View>
                    );
                })}

                {/* Recap */}
                {lesson.recap.length > 0 && (
                    <View className="rounded-[28px] border border-indigo-100 bg-indigo-50 p-5 gap-3">
                        <Text className="text-base font-semibold text-indigo-700">Key takeaways</Text>
                        {lesson.recap.map((point, i) => (
                            <View className="flex-row gap-2" key={i}>
                                <Text className="text-indigo-400">•</Text>
                                <Text className="flex-1 text-sm leading-6 text-slate-600">{point}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {completeError ? (
                    <Text className="text-sm text-red-600">{completeError}</Text>
                ) : null}
            </ScrollView>

            {/* Sticky footer */}
            <View className="absolute bottom-0 left-0 right-0 border-t border-slate-200 bg-white px-4 py-4">
                <Button
                    disabled={isCompleting}
                    onPress={() => void handleComplete()}
                    title={isCompleting ? 'Finishing…' : allChecked ? 'Finish lesson →' : 'Finish anyway →'}
                />
            </View>
        </SafeAreaView>
    );
}

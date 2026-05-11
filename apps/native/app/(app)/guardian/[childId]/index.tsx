import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BookOpen01Icon, ChartBarLineIcon, Message01Icon } from 'hugeicons-react-native';

import { can } from '@lernard/auth-core';
import { ROUTES } from '@lernard/routes';
import type { ChildProfileContent } from '@lernard/shared-types';

import { Text } from '@rnr/text';

import { Button } from '@/components/Button';
import { GuardianEmptyVisual } from '@/components/guardian/GuardianEmptyVisual';
import { NativePageHeader } from '@/components/NativePageHeader';
import { RoleFullScreenLoadingOverlay } from '@/components/RoleFullScreenLoadingOverlay';
import { StateNotice } from '@/components/StateNotice';
import { usePagePayload } from '@/hooks/usePagePayload';
import { formatMinutes, formatPercent, formatRelativeDate } from '@/lib/formatters';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/rnr/tabs';

export default function ChildProfileScreen() {
    const { childId } = useLocalSearchParams<{ childId: string }>();
    const router = useRouter();
    const { data, error, isAuthenticated, loading, refetch } = usePagePayload<ChildProfileContent>(
        ROUTES.GUARDIAN.CHILD_PAYLOAD(childId),
    );
    const [activeTab, setActiveTab] = useState('subjects');

    if (!isAuthenticated) {
        return (
            <SafeAreaView className="flex-1 bg-background" edges={['top']}>
                <View className="flex-1 px-4 pb-24 pt-6">
                    <StateNotice
                        badge="Sign in required"
                        description="Lernard can only load this learner's real progress once the guardian session is active."
                        title="Child overview needs your guardian session"
                        tone="warm"
                    />
                </View>
            </SafeAreaView>
        );
    }

    if (loading) {
        return <RoleFullScreenLoadingOverlay forceVisible />;
    }

    if (error || !data) {
        return (
            <SafeAreaView className="flex-1 bg-background" edges={['top']}>
                <View className="flex-1 px-4 pb-24 pt-6">
                    <StateNotice
                        actionTitle="Try again"
                        badge="Live payload failed"
                        description={error?.message ?? 'Something interrupted the mobile request.'}
                        onActionPress={refetch}
                        title="Child overview could not load right now"
                        tone="warning"
                    />
                </View>
            </SafeAreaView>
        );
    }

    const { content, permissions } = data;
    const strongestTopic = collectTopics(content, 'strongest')[0];
    const growthArea = collectTopics(content, 'growth')[0];

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top']}>
            <ScrollView className="flex-1" contentContainerClassName="px-4 pb-24 pt-6 gap-6">
                <NativePageHeader
                    onBackPress={() => router.push('/guardian')}
                    subtitle="Detailed learner snapshot"
                    title={content.child.name}
                />

                <View className="rounded-[32px] bg-[rgb(248,251,255)] p-6 shadow-sm">
                    <Text className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-500">Child overview</Text>
                    <Text className="mt-3 text-3xl font-semibold text-slate-900">{content.child.name}'s Lernard snapshot</Text>
                    <Text className="mt-3 text-base leading-7 text-slate-600">
                        Review strongest subjects, growth areas, and recent session history before making companion changes.
                    </Text>
                    <View className="mt-5 flex-row flex-wrap gap-2">
                        <View className="rounded-full bg-indigo-100 px-3 py-1">
                            <Text className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-700">
                                {content.child.streak}-day streak
                            </Text>
                        </View>
                        <View className="rounded-full bg-amber-100 px-3 py-1">
                            <Text className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-800">
                                Last active {formatRelativeDate(content.child.lastActiveAt)}
                            </Text>
                        </View>
                    </View>
                    <View className="mt-6 flex-row flex-wrap gap-3">
                        <Button
                            disabled={!can(permissions, 'can_change_companion_controls', childId)}
                            onPress={() => router.push(`/guardian/${childId}/companion`)}
                            title="Open companion controls"
                        />
                        <Button onPress={() => router.push('/guardian')} title="Back to Household" variant="secondary" />
                    </View>
                </View>

                <Tabs onValueChange={setActiveTab} value={activeTab}>
                    <TabsList>
                        <TabsTrigger value="subjects">Subjects</TabsTrigger>
                        <TabsTrigger value="sessions">Sessions</TabsTrigger>
                    </TabsList>

                    <TabsContent className="mt-4" value="subjects">
                        <View className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
                            <View className="flex-row items-center gap-2">
                                <ChartBarLineIcon color="#0F172A" size={20} strokeWidth={1.8} />
                                <Text className="text-2xl font-semibold text-slate-900">Subject comparison</Text>
                            </View>
                            <View className="mt-5 gap-4">
                                {content.progress.length ? content.progress.map((subject) => (
                                    <View className="rounded-[28px] bg-slate-50 p-4" key={subject.subjectId}>
                                        <Text className="text-lg font-semibold text-slate-900">{subject.subjectName}</Text>
                                        <Text className="mt-2 text-sm leading-6 text-slate-600">
                                            {subject.topics.length} topics • {subject.strengthLevel} level
                                        </Text>
                                        <Text className="mt-2 text-sm leading-6 text-slate-500">
                                            Last active {formatRelativeDate(subject.lastActiveAt)}
                                        </Text>
                                    </View>
                                )) : (
                                    <GuardianEmptyVisual
                                        subtitle="Subject performance cards will appear once work is completed."
                                        title="No subject progress yet"
                                    />
                                )}
                            </View>
                        </View>
                    </TabsContent>

                    <TabsContent className="mt-4" value="sessions">
                        <View className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
                            <View className="flex-row items-center gap-2">
                                <Message01Icon color="#0F172A" size={20} strokeWidth={1.8} />
                                <Text className="text-2xl font-semibold text-slate-900">Topics</Text>
                            </View>
                            <View className="mt-5 gap-4">
                                {content.progress.length ? (
                                    content.progress.flatMap((subject) =>
                                        subject.topics.map((topic) => (
                                            <View className="rounded-[28px] bg-slate-50 p-4" key={`${subject.subjectId}-${topic.topic}`}>
                                                <Text className="text-base font-semibold text-slate-900">
                                                    {subject.subjectName} • {topic.topic}
                                                </Text>
                                                <Text className="mt-1 text-sm leading-6 text-slate-600">
                                                    Confidence: {topic.level} • Score: {topic.score.toFixed(1)}%
                                                </Text>
                                                <Text className="mt-2 text-sm leading-6 text-slate-500">
                                                    Last tested {topic.lastTestedAt ? formatRelativeDate(topic.lastTestedAt) : 'never'}
                                                </Text>
                                            </View>
                                        ))
                                    )
                                ) : (
                                    <GuardianEmptyVisual
                                        subtitle="Topic details will populate as your child completes lessons and quizzes."
                                        title="No topic data yet"
                                    />
                                )}
                            </View>
                        </View>
                    </TabsContent>
                </Tabs>

                <View className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
                    <View className="flex-row items-center gap-2">
                        <BookOpen01Icon color="#0F172A" size={20} strokeWidth={1.8} />
                        <Text className="text-2xl font-semibold text-slate-900">Lernard&apos;s Read on You</Text>
                    </View>
                    <View className="mt-5 gap-4">
                        <View className="rounded-[28px] bg-sky-50 p-4">
                            <Text className="text-sm font-semibold uppercase tracking-[0.16em] text-sky-700">Strongest topic</Text>
                            <Text className="mt-2 text-lg font-semibold text-slate-900">
                                {strongestTopic ? `${strongestTopic.subject} • ${strongestTopic.topic}` : 'Waiting for more activity'}
                            </Text>
                        </View>
                        <View className="rounded-[28px] bg-amber-50 p-4">
                            <Text className="text-sm font-semibold uppercase tracking-[0.16em] text-amber-800">Growth area</Text>
                            <Text className="mt-2 text-lg font-semibold text-slate-900">
                                {growthArea ? `${growthArea.subject} • ${growthArea.topic}` : 'Waiting for scored work'}
                            </Text>
                        </View>
                    </View>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

function collectTopics(content: ChildProfileContent, mode: 'strongest' | 'growth') {
    return content.progress
        .flatMap((subject) => subject.topics.map((topic) => ({ ...topic, subject: subject.subjectName })))
        .sort((left, right) => mode === 'strongest' ? right.score - left.score : left.score - right.score);
}

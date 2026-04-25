import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@rnr/text';

import { Button } from '@/components/Button';

export default function LessonCompleteScreen() {
    const router = useRouter();
    const { lessonId, xp, topic, subject, summary: summaryRaw } = useLocalSearchParams<{
        lessonId: string;
        xp: string;
        topic: string;
        subject: string;
        summary: string;
    }>();

    const xpEarned = Number(xp ?? 0);
    let summary: string[] = [];
    try {
        summary = summaryRaw ? (JSON.parse(summaryRaw) as string[]) : [];
    } catch {
        summary = [];
    }

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top']}>
            <ScrollView className="flex-1" contentContainerClassName="px-4 pb-24 pt-12 gap-6 items-center">
                {/* Trophy */}
                <View className="h-24 w-24 items-center justify-center rounded-full bg-indigo-100">
                    <Text className="text-4xl">🎓</Text>
                </View>

                {/* Heading */}
                <View className="items-center gap-1">
                    <Text className="text-sm font-semibold uppercase tracking-widest text-indigo-500">{subject}</Text>
                    <Text className="text-center text-3xl font-semibold text-foreground">Lesson complete!</Text>
                    <Text className="text-center text-base text-muted-foreground">{topic}</Text>
                </View>

                {/* XP */}
                <View className="items-center rounded-[28px] border border-slate-200 bg-white px-10 py-5">
                    <Text className="text-sm text-muted-foreground">XP earned</Text>
                    <Text className="mt-1 text-4xl font-bold text-indigo-600">+{xpEarned}</Text>
                </View>

                {/* Takeaways */}
                {summary.length > 0 ? (
                    <View className="w-full rounded-[28px] border border-slate-200 bg-white p-5 gap-3">
                        <Text className="text-base font-semibold text-foreground">What you covered</Text>
                        {summary.map((point, i) => (
                            <View className="flex-row gap-2" key={i}>
                                <Text className="text-indigo-400">•</Text>
                                <Text className="flex-1 text-sm leading-6 text-muted-foreground">{point}</Text>
                            </View>
                        ))}
                    </View>
                ) : null}

                {/* CTAs */}
                <View className="w-full gap-3">
                    <Button
                        onPress={() => router.push(`/quiz?fromLesson=${lessonId}`)}
                        title="Take a quick quiz →"
                    />
                    <Button
                        onPress={() => router.replace('/learn')}
                        title="Back to Learn"
                        variant="secondary"
                    />
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

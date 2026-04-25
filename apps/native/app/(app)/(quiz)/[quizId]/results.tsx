import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@rnr/text';

import { Button } from '@/components/Button';

export default function QuizResultsScreen() {
    const router = useRouter();
    const { quizId, topic, subject, correct, total, xp } = useLocalSearchParams<{
        quizId: string;
        topic: string;
        subject: string;
        correct: string;
        total: string;
        xp: string;
    }>();

    const correctNum = Number(correct ?? 0);
    const totalNum = Number(total ?? 0);
    const xpEarned = Number(xp ?? 0);
    const pct = totalNum > 0 ? Math.round((correctNum / totalNum) * 100) : 0;
    const grade = pct >= 80 ? 'Strong' : pct >= 50 ? 'Good effort' : 'Keep practising';
    const icon = pct >= 80 ? '🏆' : pct >= 50 ? '📈' : '💪';

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top']}>
            <ScrollView className="flex-1" contentContainerClassName="px-4 pb-24 pt-12 gap-6 items-center">
                {/* Icon */}
                <View className="h-24 w-24 items-center justify-center rounded-full bg-indigo-100">
                    <Text className="text-4xl">{icon}</Text>
                </View>

                {/* Heading */}
                <View className="items-center gap-1">
                    <Text className="text-sm font-semibold uppercase tracking-widest text-indigo-500">{subject}</Text>
                    <Text className="text-center text-3xl font-semibold text-foreground">Quiz complete!</Text>
                    <Text className="text-center text-base text-muted-foreground">{topic}</Text>
                </View>

                {/* Score */}
                <View className="w-full items-center rounded-[28px] border border-slate-200 bg-white p-6 gap-3">
                    <View className="w-full flex-row justify-between">
                        <View>
                            <Text className="text-sm text-muted-foreground">Score</Text>
                            <Text className="text-4xl font-bold text-indigo-600">{pct}%</Text>
                        </View>
                        <View className="items-end">
                            <Text className="text-sm text-muted-foreground">XP earned</Text>
                            <Text className="text-4xl font-bold text-indigo-600">+{xpEarned}</Text>
                        </View>
                    </View>
                    <View className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
                        <View className="h-full rounded-full bg-indigo-500" style={{ width: `${pct}%` }} />
                    </View>
                    <Text className="text-sm text-muted-foreground">
                        {correctNum} out of {totalNum} correct · {grade}
                    </Text>
                </View>

                {/* CTAs */}
                <View className="w-full gap-3">
                    <Button
                        onPress={() => router.push(`/learn?topic=${encodeURIComponent(topic ?? '')}`)}
                        title="Study this topic →"
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

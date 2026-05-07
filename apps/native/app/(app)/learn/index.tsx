import { useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BookOpen01Icon, Message01Icon, SchoolBell01Icon } from 'hugeicons-react-native';

import { Text } from '@rnr/text';

import { Button } from '@/components/Button';

export default function LearnEntryScreen() {
    const router = useRouter();

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top']}>
            <ScrollView className="flex-1" contentContainerClassName="px-4 pb-24 pt-6 gap-6">
                <View className="rounded-[32px] bg-[rgb(248,251,255)] p-6 shadow-sm">
                    <View className="flex-row items-center gap-2">
                        <BookOpen01Icon color="#4F46E5" size={18} strokeWidth={1.8} />
                        <Text className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-500">Learn</Text>
                    </View>
                    <Text className="mt-3 text-3xl font-semibold text-slate-900">Pick your next learning move</Text>
                    <Text className="mt-3 text-base leading-7 text-slate-600">Start a quiz sprint or ask Lernard for a guided explanation.</Text>
                    <View className="mt-6 flex-row flex-wrap gap-3">
                        <Button
                            iconLeft={<SchoolBell01Icon color="#FFFFFF" size={16} strokeWidth={1.8} />}
                            onPress={() => router.push('/quiz/entry')}
                            title="Start quiz"
                        />
                        <Button
                            iconLeft={<Message01Icon color="#0F172A" size={16} strokeWidth={1.8} />}
                            onPress={() => router.push('/chat')}
                            title="Ask Lernard"
                            variant="secondary"
                        />
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

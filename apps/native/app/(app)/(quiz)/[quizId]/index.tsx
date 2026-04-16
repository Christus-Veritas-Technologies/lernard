import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';

export default function QuizScreen() {
    const { quizId } = useLocalSearchParams();

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top']}>
            <View className="flex-1 items-center justify-center px-6">
                <Text className="text-2xl font-bold text-foreground">Quiz</Text>
                <Text className="mt-2 text-muted-foreground">Quiz ID: {quizId}</Text>
            </View>
        </SafeAreaView>
    );
}

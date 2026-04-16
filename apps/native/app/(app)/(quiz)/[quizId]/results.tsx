import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function QuizResultsScreen() {
    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top']}>
            <View className="flex-1 items-center justify-center px-6">
                <Text className="text-2xl font-bold text-foreground">Quiz Results</Text>
                <Text className="mt-2 text-muted-foreground">Here's how you did.</Text>
            </View>
        </SafeAreaView>
    );
}

import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TopicEntryScreen() {
    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top']}>
            <View className="flex-1 items-center justify-center px-6">
                <Text className="text-2xl font-bold text-foreground">Learn</Text>
                <Text className="mt-2 text-muted-foreground">What would you like to learn about?</Text>
            </View>
        </SafeAreaView>
    );
}

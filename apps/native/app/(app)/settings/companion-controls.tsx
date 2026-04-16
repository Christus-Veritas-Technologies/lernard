import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CompanionControlsScreen() {
    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top']}>
            <View className="flex-1 px-6 pt-6">
                <Text className="text-2xl font-bold text-foreground">Companion Controls</Text>
                <Text className="mt-2 text-muted-foreground">
                    Control hints, answers, and skip options.
                </Text>
            </View>
        </SafeAreaView>
    );
}

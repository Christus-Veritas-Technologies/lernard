import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function WelcomeScreen() {
    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top']}>
            <View className="flex-1 items-center justify-center px-6">
                <Text className="text-4xl font-bold text-primary">Lernard</Text>
                <Text className="mt-2 text-center text-lg text-muted-foreground">
                    Your personal tutor. Always ready.
                </Text>
            </View>
        </SafeAreaView>
    );
}

import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProfileSetupScreen() {
    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top']}>
            <View className="flex-1 items-center justify-center px-6">
                <Text className="text-2xl font-bold text-foreground">Profile Setup</Text>
                <Text className="mt-2 text-center text-muted-foreground">
                    Tell Lernard a bit about yourself.
                </Text>
            </View>
        </SafeAreaView>
    );
}

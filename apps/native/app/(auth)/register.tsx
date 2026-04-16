import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function RegisterScreen() {
    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top']}>
            <View className="flex-1 items-center justify-center px-6">
                <Text className="text-2xl font-bold text-foreground">Create Account</Text>
                <Text className="mt-2 text-center text-muted-foreground">
                    Lernard needs to know who he's tutoring.
                </Text>
            </View>
        </SafeAreaView>
    );
}

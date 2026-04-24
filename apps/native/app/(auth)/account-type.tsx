import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@rnr/text';

export default function AccountTypeScreen() {
    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top']}>
            <View className="flex-1 items-center justify-center px-6">
                <Text className="text-2xl font-bold text-foreground">Account Type</Text>
                <Text className="mt-2 text-center text-muted-foreground">
                    Are you a student or a Guardian?
                </Text>
            </View>
        </SafeAreaView>
    );
}

import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProfileScreen() {
    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top']}>
            <View className="flex-1 px-6 pt-6">
                <Text className="text-2xl font-bold text-foreground">Profile</Text>
                <Text className="mt-2 text-muted-foreground">Edit your profile details.</Text>
            </View>
        </SafeAreaView>
    );
}

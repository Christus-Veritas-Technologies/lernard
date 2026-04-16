import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';

export default function ChildProfileScreen() {
    const { childId } = useLocalSearchParams();

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top']}>
            <ScrollView className="flex-1" contentContainerClassName="px-4 pb-24 pt-6 gap-4">
                <Text className="text-2xl font-bold text-foreground">Child Profile</Text>
                <Text className="text-muted-foreground">Child ID: {childId}</Text>
            </ScrollView>
        </SafeAreaView>
    );
}

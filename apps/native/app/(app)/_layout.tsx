import { Redirect, Tabs } from 'expo-router';

import { TabBar } from '@/components/TabBar';
import { useAuthStore } from '@/store/store';

export default function AppLayout() {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

    if (!isAuthenticated) {
        return <Redirect href="/(auth)/login" />;
    }

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                sceneStyle: {
                    backgroundColor: '#F8FAFC',
                },
            }}
            tabBar={(props) => <TabBar {...props} />}
        >
            <Tabs.Screen name="(home)" options={{ title: 'Home' }} />
            <Tabs.Screen name="(progress)" options={{ title: 'Progress' }} />
            <Tabs.Screen name="(chat)" options={{ title: 'Chat' }} />
            <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
            <Tabs.Screen name="guardian" options={{ href: null }} />
        </Tabs>
    );
}

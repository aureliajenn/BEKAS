import { Tabs } from 'expo-router';

import { BottomNav } from '@/components/BottomNav';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <BottomNav {...props} />}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="jalur" />
      <Tabs.Screen name="wallet" />
      <Tabs.Screen name="leaderboard" />
    </Tabs>
  );
}

import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useEntitlementsStore } from './src/store/useEntitlementsStore';
import { useAuthStore } from './src/store/useAuthStore';
import PaywallModal from './src/components/PaywallModal';

import HomeScreen from './src/screens/HomeScreen';
import AddPeopleScreen from './src/screens/AddPeopleScreen';
import AddItemsScreen from './src/screens/AddItemsScreen';
import ItemAssignmentScreen from './src/screens/ItemAssignmentScreen';
import TaxTipDiscountScreen from './src/screens/TaxTipDiscountScreen';
import CoverageScreen from './src/screens/CoverageScreen';
import SummaryScreen from './src/screens/SummaryScreen';
import SessionEntryScreen from './src/screens/SessionEntryScreen';
import LobbyScreen from './src/screens/LobbyScreen';
import SharedBillScreen from './src/screens/SharedBillScreen';
import PersonalBillScreen from './src/screens/PersonalBillScreen';
import LoginScreen from './src/screens/LoginScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import WalletScreen from './src/screens/WalletScreen';
import type { RootStackParamList } from './src/types';
import { COLORS, GLASS } from './src/utils/theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const loadEntitlements = useEntitlementsStore((s) => s.loadEntitlements);
  const { initialize, isInitialized } = useAuthStore();

  useEffect(() => {
    loadEntitlements();
    const unsub = initialize();
    return unsub;
  }, []);

  if (!isInitialized) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator color={COLORS.accent} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <PaywallModal />
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerStyle: { backgroundColor: GLASS.gradientBg[0] as string },
            headerTintColor: COLORS.accent,
            headerTitleStyle: { fontWeight: '700', color: COLORS.text },
            contentStyle: { backgroundColor: 'transparent' },
          }}
        >
          <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
          <Stack.Screen name="AddPeople" component={AddPeopleScreen} options={{ title: "Who's in?" }} />
          <Stack.Screen name="AddItems" component={AddItemsScreen} options={{ title: "What did y'all get?" }} />
          <Stack.Screen name="ItemAssignment" component={ItemAssignmentScreen} options={{ title: 'Assign Item' }} />
          <Stack.Screen name="TaxTipDiscount" component={TaxTipDiscountScreen} options={{ title: 'Tax, Tip & Discounts' }} />
          <Stack.Screen name="Coverage" component={CoverageScreen} options={{ title: "Who's Covering?" }} />
          <Stack.Screen name="Summary" component={SummaryScreen} options={{ title: 'Summary' }} />
          <Stack.Screen name="SessionEntry" component={SessionEntryScreen} options={{ title: 'Multiplayer' }} />
          <Stack.Screen name="Lobby" component={LobbyScreen} options={{ title: 'Waiting Room', headerBackVisible: false }} />
          <Stack.Screen name="SharedBill" component={SharedBillScreen} options={{ title: 'Shared Bill', headerBackVisible: false }} />
          <Stack.Screen name="PersonalBill" component={PersonalBillScreen} options={{ title: 'My Bill' }} />
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
          <Stack.Screen name="Wallet" component={WalletScreen} options={{ title: 'My Wallet' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: GLASS.gradientBg[2] as string,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

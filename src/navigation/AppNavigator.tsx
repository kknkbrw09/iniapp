import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, StyleSheet } from 'react-native';
import * as SplashScreenNative from 'expo-splash-screen';
import { SafeStorage } from '../utils/storage';
import { useAuth } from '../context/AuthContext';

import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import WargaScreen from '../screens/WargaScreen';
import KeuanganScreen from '../screens/KeuanganScreen';
import KegiatanScreen from '../screens/KegiatanScreen';
import IuranScreen from '../screens/IuranScreen';
import SuratScreen from '../screens/SuratScreen';
import PengumumanScreen from '../screens/PengumumanScreen';
import TermsScreen from '../screens/TermsScreen';
import SplashScreen from '../screens/SplashScreen';
import { renderTabIcon } from '../components/TabIcons';
import MenuDrawerModal from '../components/MenuDrawerModal';

SplashScreenNative.preventAutoHideAsync().catch(() => {});

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function DummyScreen() {
  return <View />;
}

function MainTabs({ onOpenDrawer }: { onOpenDrawer: () => void }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color }) => renderTabIcon(route.name, color),
        tabBarActiveTintColor: '#00216e',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: { paddingBottom: 5, paddingTop: 5, height: 60 },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Warga" component={WargaScreen} />
      <Tab.Screen name="Keuangan" component={KeuanganScreen} options={{ tabBarLabel: 'Keuangan' }} />
      <Tab.Screen
        name="Menu"
        component={DummyScreen}
        options={{ tabBarLabel: 'Menu' }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            onOpenDrawer();
          },
        }}
      />

      <Tab.Screen
        name="Kegiatan"
        component={KegiatanScreen}
        options={{ tabBarItemStyle: { display: 'none' } }}
      />
      <Tab.Screen
        name="Iuran"
        component={IuranScreen}
        options={{ tabBarItemStyle: { display: 'none' } }}
      />
      <Tab.Screen
        name="Surat"
        component={SuratScreen}
        options={{ tabBarItemStyle: { display: 'none' } }}
      />
      <Tab.Screen
        name="Pengumuman"
        component={PengumumanScreen}
        options={{ tabBarItemStyle: { display: 'none' } }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { role, isLoading } = useAuth();
  const [hasAgreedTerms, setHasAgreedTerms] = useState<boolean | null>(null);
  const [showSplash, setShowSplash] = useState(true);
  const [menuDrawerVisible, setMenuDrawerVisible] = useState(false);

  useEffect(() => {
    SafeStorage.getItem('app_terms_agreed')
      .then(val => {
        setHasAgreedTerms(val === 'true');
      })
      .catch(() => {
        setHasAgreedTerms(false);
      });
  }, []);

  const handleAgreeTerms = async () => {
    try {
      await SafeStorage.setItem('app_terms_agreed', 'true');
    } catch (e) {}
    setHasAgreedTerms(true);
  };

  useEffect(() => {
    if (!isLoading && hasAgreedTerms !== null) {
      SplashScreenNative.hideAsync().catch(() => {});
    }
  }, [isLoading, hasAgreedTerms]);

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  if (hasAgreedTerms === false) {
    return <TermsScreen onAgree={handleAgreeTerms} />;
  }

  if (isLoading || hasAgreedTerms === null) {
    return null;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!role ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <Stack.Screen name="MainFlow">
            {(props) => (
              <>
                <MainTabs onOpenDrawer={() => setMenuDrawerVisible(true)} />
                <MenuDrawerModal
                  visible={menuDrawerVisible}
                  onClose={() => setMenuDrawerVisible(false)}
                  navigation={props.navigation}
                />
              </>
            )}
          </Stack.Screen>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9f9f9' },
});

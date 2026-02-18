import 'react-native-gesture-handler';
import React, { useState, createContext, useEffect, useMemo } from 'react';
import { StatusBar, View, ActivityIndicator, AppState } from 'react-native';
import { PaperProvider, FAB, Portal, Text, useTheme } from 'react-native-paper';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';

// Navigation
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Notifications & Realm
import notifee, { EventType } from '@notifee/react-native';
import { RealmProvider, useQuery, useRealm } from '@realm/react';
import Realm from 'realm';

// Local Imports
import { Medication, Profile, MedicationLog } from './src/models/Schemas';
import { lightTheme, darkTheme } from './src/theme';
import NotificationService from './src/services/NotificationService';
import AlarmOverlay from './src/components/AlarmOverlay';

// Screens
import HomeScreen from './src/screens/HomeScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import WelcomeScreen from './src/screens/WelcomeScreen';
import AddProfileScreen from './src/screens/AddProfileScreen';

export const ThemeContext = createContext({ toggleTheme: () => {}, isDarkMode: false });

// --- SHARED LOGIC FOR SAVING LOGS ---
const performMedicationAction = async (realm, notification, actionId) => {
  const { medicationId, medicationName, scheduledAt } = notification.data;
  
  try {
    const medId = new Realm.BSON.UUID(medicationId);
    
    if (actionId === 'taken') {
      const medication = realm.objectForPrimaryKey('Medication', medId);
      const now = new Date();
      
      realm.write(() => {
        realm.create('MedicationLog', {
          _id: new Realm.BSON.UUID(),
          medicationId: medId,
          medicationName: medication ? medication.name : (medicationName || 'Medication'),
          status: 'taken',
          scheduledAt: new Date(scheduledAt),
          takenAt: now,
          delayMinutes: Math.round((now - new Date(scheduledAt)) / 60000),
        });

        if (medication && medication.isInventoryEnabled && medication.stock > 0) {
          medication.stock -= 1;
        }
      });
    } 
    
    if (actionId === 'snooze') {
      await NotificationService.snoozeMedication(notification);
    }

    await notifee.cancelNotification(notification.id);
  } catch (e) {
    console.error('[Action Handler Error]:', e);
  }
};

// --- BACKGROUND EVENT HANDLER ---
notifee.onBackgroundEvent(async ({ type, detail }) => {
  const { notification, pressAction } = detail;
  if (type === EventType.ACTION_PRESS) {
    const realm = await Realm.open({
      schema: [Medication, Profile, MedicationLog],
      schemaVersion: 2,
    });
    try {
      await performMedicationAction(realm, notification, pressAction.id);
    } finally {
      realm.close();
    }
  }
});

const Tab = createBottomTabNavigator();

function MainTabs() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator 
      screenOptions={{ 
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary, 
        tabBarInactiveTintColor: theme.dark ? '#888888' : '#666666',
        tabBarStyle: { 
          height: 65 + insets.bottom, 
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
          paddingTop: 8,
          backgroundColor: theme.colors.surface,
          borderTopWidth: 0,
        },
        tabBarLabelStyle: { 
          fontFamily: 'Geist-Medium', 
          fontSize: 12,
          marginBottom: 4 
        }
      }}
    >
      <Tab.Screen 
        name="Meds" 
        component={HomeScreen} 
        options={{ 
          tabBarLabel: 'Today', 
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="pill" color={color} size={26} /> 
        }} 
      />
      <Tab.Screen 
        name="History" 
        component={HistoryScreen} 
        options={{ 
          tabBarLabel: 'History', 
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="clipboard-text" color={color} size={26} /> 
        }} 
      />
    </Tab.Navigator>
  );
}

function AppContent() {
  const realm = useRealm();
  const profiles = useQuery(Profile);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [hasStartedOnboarding, setHasStartedOnboarding] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [activeAlarm, setActiveAlarm] = useState(null);

  useEffect(() => {
    // 1. Initial Launch check
    notifee.getInitialNotification().then(initial => {
      if (initial?.notification?.data?.isAlarm === 'true') {
        setActiveAlarm(initial.notification);
      }
    });

    // 2. Foreground events check
    const unsubscribe = notifee.onForegroundEvent(async ({ type, detail }) => {
      const { notification } = detail;

      if (notification?.data?.isAlarm === 'true') {
        setActiveAlarm(notification);
      }

      if (type === EventType.ACTION_PRESS) {
        await performMedicationAction(realm, notification, detail.pressAction.id);
        setActiveAlarm(null);
      }
    });

    const timer = setTimeout(() => setIsInitializing(false), 2000); 

    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, [realm]);

  const activeTheme = useMemo(() => (isDarkMode ? darkTheme : lightTheme), [isDarkMode]);

  if (isInitializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: activeTheme.colors.background }}>
        <ActivityIndicator size="large" color={activeTheme.colors.primary} />
        <Text style={{ marginTop: 16, color: activeTheme.colors.onSurfaceVariant, fontFamily: 'Geist-Medium' }}>
          Initializing health services...
        </Text>
      </View>
    );
  }

  return (
    <ThemeContext.Provider value={{ toggleTheme: () => setIsDarkMode(!isDarkMode), isDarkMode }}>
      <PaperProvider theme={activeTheme}>
        <NavigationContainer theme={activeTheme}>
          <View style={{ flex: 1, backgroundColor: activeTheme.colors.background }}>
            <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
            
            {/* Conditional Rendering using a pure ternary to avoid "Text string" errors */}
            {activeAlarm ? (
              <AlarmOverlay 
                isVisible={true}
                medication={activeAlarm.data}
                onTake={async () => {
                  await performMedicationAction(realm, activeAlarm, 'taken');
                  setActiveAlarm(null);
                }}
                onSnooze={async () => {
                  await performMedicationAction(realm, activeAlarm, 'snooze');
                  setActiveAlarm(null);
                }}
              />
            ) : null}

            {profiles.length > 0 ? (
              <MainTabs /> 
            ) : !hasStartedOnboarding ? (
              <WelcomeScreen onStart={() => {
                notifee.requestPermission();
                NotificationService.bootstrap();
                setHasStartedOnboarding(true);
              }} />
            ) : (
              <AddProfileScreen isFirstProfile={true} />
            )}
            
            <Portal>
              <FAB
                icon={isDarkMode ? 'weather-sunny' : 'weather-night'}
                style={{ position: 'absolute', top: 50, right: 16, backgroundColor: activeTheme.colors.surface, borderRadius: 12 }}
                onPress={() => setIsDarkMode(!isDarkMode)}
                size="small"
              />
            </Portal>
          </View>
        </NavigationContainer>
      </PaperProvider>
    </ThemeContext.Provider>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    'Geist-Regular': require('./assets/fonts/geist/Geist-Regular.ttf'),
    'Geist-Medium': require('./assets/fonts/geist/Geist-Medium.ttf'),
    'Geist-SemiBold': require('./assets/fonts/geist/Geist-SemiBold.ttf'),
    'Geist-Bold': require('./assets/fonts/geist/Geist-Bold.ttf'),
  });

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <RealmProvider 
        schema={[Medication, Profile, MedicationLog]} 
        schemaVersion={2} 
        deleteRealmIfMigrationNeeded={true}
      >
        <AppContent />
      </RealmProvider>
    </SafeAreaProvider>
  );
}
import 'react-native-gesture-handler';
import React, { useState, createContext, useEffect, useRef, useMemo } from 'react';
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
import { RealmSchemas, MedicationStatus, Profile, Medication } from './src/models/Schemas';
import { lightTheme, darkTheme } from './src/theme';
import NotificationService from './src/services/NotificationService';
import AlarmOverlay from './src/components/AlarmOverlay';

export const ThemeContext = createContext({ toggleTheme: () => {}, isDarkMode: false });

// Screens
import HomeScreen from './src/screens/HomeScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import WelcomeScreen from './src/screens/WelcomeScreen';
import AddProfileScreen from './src/screens/AddProfileScreen';

// ─────────────────────────────────────────────
// SHARED LOGIC FOR SAVING LOGS
// ─────────────────────────────────────────────

const performMedicationAction = async (realm, notification, actionId) => {
  const { medicationId, profileId, medicationName, dosageSnapshot, scheduledAt } =
    notification.data;

  try {
    const medId = new Realm.BSON.UUID(medicationId);
    const now = new Date();
    const medication = realm.objectForPrimaryKey('Medication', medId);

    realm.write(() => {
      realm.create('MedicationLog', {
        _id: new Realm.BSON.UUID(),
        medicationId: medId,
        profileId: profileId ? new Realm.BSON.UUID(profileId) : null,
        medicationName: medication?.name ?? medicationName ?? 'Medication',
        dosageSnapshot: medication 
          ? `${medication.dosage} ${medication.unit}` 
          : (dosageSnapshot ?? ''),
        status: actionId,
        scheduledAt: new Date(scheduledAt),
        takenAt: actionId === MedicationStatus.TAKEN ? now : null,
        delayMinutes: actionId === MedicationStatus.TAKEN 
          ? Math.max(0, Math.round((now - new Date(scheduledAt)) / 60000)) 
          : 0,
        note: actionId === MedicationStatus.SKIPPED ? 'Skipped by user' : null,
      });

      if (actionId === MedicationStatus.TAKEN && medication?.isInventoryEnabled && medication.stock > 0) {
        medication.stock -= 1;
      }

      if (medication && actionId !== MedicationStatus.SNOOZED) {
        medication.nextOccurrence = NotificationService.computeNextOccurrence(medication);
        medication.updatedAt = now;
      }
    });

    if (actionId === MedicationStatus.SNOOZED) {
      await NotificationService.snoozeMedication(realm, notification);
    }

    await notifee.cancelNotification(notification.id);
  } catch (e) {
    console.error('[Action Handler Error]:', e);
  }
};

// ─────────────────────────────────────────────
// BACKGROUND EVENT HANDLER
// ─────────────────────────────────────────────

notifee.onBackgroundEvent(async ({ type, detail }) => {
  const { notification, pressAction } = detail;
  if (type === EventType.ACTION_PRESS && pressAction?.id) {
    const realm = await Realm.open({ schema: RealmSchemas, schemaVersion: 2 });
    try {
      await performMedicationAction(realm, notification, pressAction.id);
    } catch (e) {
      console.error('[Background Event Error]:', e);
    } finally {
      realm.close();
    }
  }
});

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

const findDisplayedAlarm = async () => {
  try {
    const displayed = await notifee.getDisplayedNotifications();
    const alarm = displayed.find((n) => n.notification?.data?.isAlarm === 'true');
    return alarm?.notification ?? null;
  } catch (e) {
    return null;
  }
};

const checkAndHandleMissedDoses = (realm) => {
  const MISSED_THRESHOLD_MS = 2 * 60 * 60 * 1000;
  const now = new Date();

  const overdueMeds = realm.objects('Medication').filtered(
    'isActive == true && nextOccurrence != null && nextOccurrence < $0',
    new Date(now.getTime() - MISSED_THRESHOLD_MS)
  );

  if (overdueMeds.length > 0) {
    realm.write(() => {
      overdueMeds.forEach((med) => {
        realm.create('MedicationLog', {
          _id: new Realm.BSON.UUID(),
          medicationId: med._id,
          profileId: med.owner?.[0]?._id ?? null,
          medicationName: med.name,
          dosageSnapshot: `${med.dosage} ${med.unit}`,
          status: MedicationStatus.MISSED,
          scheduledAt: med.nextOccurrence,
          takenAt: null,
          delayMinutes: 0,
          note: 'Automatically marked as missed (2hr timeout)',
        });

        med.nextOccurrence = NotificationService.computeNextOccurrence(med);
        med.updatedAt = now;
      });
    });
  }
};

// ─────────────────────────────────────────────
// NAVIGATION (FIXED TABS)
// ─────────────────────────────────────────────

const Tab = createBottomTabNavigator();

function MainTabs() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant, // Ginawang muted gray para sa inactive
        tabBarLabelStyle: {
          fontFamily: 'Geist-Bold',
          fontSize: 12,
          marginBottom: 4,
        },
        tabBarStyle: {
          height: 65 + insets.bottom,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
          paddingTop: 10,
          backgroundColor: theme.colors.surface,
          borderTopWidth: 0,
          elevation: 10, // Shadow para lumutang sa dark mode
        },
      }}
    >
      <Tab.Screen
        name="Meds"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Today',
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons 
              name={focused ? "pill" : "pill"} // Pwedeng parehong pill, pero lumalaki ang size kapag focused
              color={color} 
              size={focused ? 28 : 24} 
            />
          ),
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{
          tabBarLabel: 'History',
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons 
              name={focused ? "clipboard-text" : "clipboard-text-outline"} // Solid kapag active, Outline kapag hindi
              color={color} 
              size={focused ? 28 : 24} 
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// ─────────────────────────────────────────────
// APP CONTENT
// ─────────────────────────────────────────────

function AppContent() {
  const realm = useRealm();
  const profiles = useQuery(Profile);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [hasStartedOnboarding, setHasStartedOnboarding] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [activeAlarm, setActiveAlarm] = useState(null);

  const appState = useRef(AppState.currentState);
  const activeTheme = useMemo(() => (isDarkMode ? darkTheme : lightTheme), [isDarkMode]);

  useEffect(() => {
    checkAndHandleMissedDoses(realm);

    notifee.getInitialNotification().then((initial) => {
      if (initial?.notification?.data?.isAlarm === 'true') setActiveAlarm(initial.notification);
    });

    findDisplayedAlarm().then((alarm) => {
      if (alarm) setActiveAlarm(alarm);
    });

    const unsubscribeForeground = notifee.onForegroundEvent(async ({ type, detail }) => {
      const { notification } = detail;
      if (type === EventType.DELIVERED && notification?.data?.isAlarm === 'true') {
        setActiveAlarm(notification);
      }
      if (type === EventType.ACTION_PRESS) {
        await performMedicationAction(realm, notification, detail.pressAction.id);
        setActiveAlarm(null);
      }
      if (type === EventType.DISMISSED) {
        setActiveAlarm((prev) => (prev?.id === notification?.id ? null : prev));
      }
    });

    const unsubscribeAppState = AppState.addEventListener('change', async (nextState) => {
      const wasBackground = appState.current === 'background' || appState.current === 'inactive';
      const isNowActive = nextState === 'active';

      if (wasBackground && isNowActive) {
        checkAndHandleMissedDoses(realm);
        const displayedAlarm = await findDisplayedAlarm();
        if (displayedAlarm) setActiveAlarm(displayedAlarm);
        try {
          await NotificationService.rescheduleAllAlarms(realm);
        } catch (e) {
          console.error(e);
        }
      }
      appState.current = nextState;
    });

    const timer = setTimeout(() => setIsInitializing(false), 2000);

    return () => {
      unsubscribeForeground();
      unsubscribeAppState.remove();
      clearTimeout(timer);
    };
  }, [realm]);

  if (isInitializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: activeTheme.colors.background }}>
        <ActivityIndicator size="large" color={activeTheme.colors.primary} />
      </View>
    );
  }

  return (
    <ThemeContext.Provider value={{ toggleTheme: () => setIsDarkMode((prev) => !prev), isDarkMode }}>
      <PaperProvider theme={activeTheme}>
        <NavigationContainer theme={activeTheme}>
          <View style={{ flex: 1, backgroundColor: activeTheme.colors.background }}>
            <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

            {activeAlarm && (
              <AlarmOverlay
                isVisible={true}
                medication={activeAlarm.data}
                onTake={() => performMedicationAction(realm, activeAlarm, MedicationStatus.TAKEN).then(() => setActiveAlarm(null))}
                onSnooze={() => performMedicationAction(realm, activeAlarm, MedicationStatus.SNOOZED).then(() => setActiveAlarm(null))}
                onSkip={() => performMedicationAction(realm, activeAlarm, MedicationStatus.SKIPPED).then(() => setActiveAlarm(null))}
              />
            )}

            {profiles.length > 0 ? (
              <MainTabs />
            ) : !hasStartedOnboarding ? (
              <WelcomeScreen onStart={() => { NotificationService.bootstrap(); setHasStartedOnboarding(true); }} />
            ) : (
              <AddProfileScreen isFirstProfile={true} />
            )}

            <Portal>
              <FAB
                icon={isDarkMode ? 'weather-sunny' : 'weather-night'}
                style={{ position: 'absolute', top: 50, right: 16, backgroundColor: activeTheme.colors.surface, borderRadius: 12 }}
                onPress={() => setIsDarkMode((prev) => !prev)}
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
      <RealmProvider schema={RealmSchemas} schemaVersion={2} deleteRealmIfMigrationNeeded={true}>
        <AppContent />
      </RealmProvider>
    </SafeAreaProvider>
  );
}
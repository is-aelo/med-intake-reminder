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
import { RealmSchemas, MedicationStatus, Profile } from './src/models/Schemas';
import { lightTheme, darkTheme } from './src/theme';
import NotificationService from './src/services/NotificationService';
import AlarmOverlay from './src/components/AlarmOverlay';

// Screens
import HomeScreen from './src/screens/HomeScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import WelcomeScreen from './src/screens/WelcomeScreen';
import AddProfileScreen from './src/screens/AddProfileScreen';

export const ThemeContext = createContext({ toggleTheme: () => {}, isDarkMode: false });

// ─────────────────────────────────────────────
// SHARED LOGIC FOR SAVING LOGS
// ─────────────────────────────────────────────

const performMedicationAction = async (realm, notification, actionId) => {
  const { medicationId, profileId, medicationName, dosageSnapshot, scheduledAt } =
    notification.data;

  try {
    const medId = new Realm.BSON.UUID(medicationId);
    const now = new Date();

    if (actionId === MedicationStatus.TAKEN) {
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
          status: MedicationStatus.TAKEN,
          scheduledAt: new Date(scheduledAt),
          takenAt: now,
          delayMinutes: Math.max(0, Math.round((now - new Date(scheduledAt)) / 60000)),
          note: null,
        });

        if (medication?.isInventoryEnabled && medication.stock > 0) {
          medication.stock -= 1;
          medication.updatedAt = now;
        }

        if (medication) {
          medication.nextOccurrence = NotificationService.computeNextOccurrence(medication);
          medication.updatedAt = now;
        }
      });
    }

    if (actionId === MedicationStatus.SNOOZED) {
      await NotificationService.snoozeMedication(realm, notification);
    }

    if (actionId === MedicationStatus.SKIPPED) {
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
          status: MedicationStatus.SKIPPED,
          scheduledAt: new Date(scheduledAt),
          takenAt: null,
          delayMinutes: 0,
          note: null,
        });
      });
    }

    await notifee.cancelNotification(notification.id);
  } catch (e) {
    console.error('[Action Handler Error]:', e);
  }
};

// ─────────────────────────────────────────────
// BACKGROUND EVENT HANDLER
// Must be registered before AppRegistry
// ─────────────────────────────────────────────

notifee.onBackgroundEvent(async ({ type, detail }) => {
  const { notification, pressAction } = detail;

  if (type === EventType.ACTION_PRESS && pressAction?.id) {
    const realm = await Realm.open({
      schema: RealmSchemas,
      schemaVersion: 2,
    });

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

/**
 * Checks Notifee's displayed notifications list for any active alarm
 * and returns the first one found, or null.
 *
 * This is the key fix: when the screen wakes via fullScreenAction,
 * the app goes background → active. EventType.DELIVERED never fires
 * in this case because the notification was already delivered while
 * the app was backgrounded. We must actively query displayed
 * notifications to find it.
 */
const findDisplayedAlarm = async () => {
  try {
    const displayed = await notifee.getDisplayedNotifications();
    const alarm = displayed.find((n) => n.notification?.data?.isAlarm === 'true');
    return alarm?.notification ?? null;
  } catch (e) {
    console.error('[findDisplayedAlarm] Error:', e);
    return null;
  }
};

// ─────────────────────────────────────────────
// NAVIGATION
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
          marginBottom: 4,
        },
      }}
    >
      <Tab.Screen
        name="Meds"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Today',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="pill" color={color} size={26} />
          ),
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{
          tabBarLabel: 'History',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="clipboard-text" color={color} size={26} />
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
    // ── 1. COLD START: app was fully killed ─────
    // Covers: user taps notification while app was dead
    notifee.getInitialNotification().then((initial) => {
      if (initial?.notification?.data?.isAlarm === 'true') {
        setActiveAlarm(initial.notification);
      }
    });

    // ── 2. WARM START: app was backgrounded ─────
    // Covers: screen wakes via fullScreenAction while app was alive in background.
    // EventType.DELIVERED does NOT fire here — we must query displayed notifications.
    findDisplayedAlarm().then((alarm) => {
      if (alarm) setActiveAlarm(alarm);
    });

    // ── 3. FOREGROUND EVENT HANDLER ─────────────
    const unsubscribeForeground = notifee.onForegroundEvent(async ({ type, detail }) => {
      const { notification } = detail;

      // Covers: alarm fires while the app is already open in the foreground
      if (type === EventType.DELIVERED && notification?.data?.isAlarm === 'true') {
        setActiveAlarm(notification);
      }

      // Covers: user presses action button (Taken/Snooze/Skip) from the shade
      if (type === EventType.ACTION_PRESS) {
        await performMedicationAction(realm, notification, detail.pressAction.id);
        setActiveAlarm(null);
      }

      // Covers: user swipes away the notification from the shade
      if (type === EventType.DISMISSED) {
        setActiveAlarm((prev) => (prev?.id === notification?.id ? null : prev));
      }
    });

    // ── 4. APPSTATE: background → foreground ────
    // Two jobs:
    //   a) Check for any alarm that fired while the screen was off/locked
    //      and show the overlay if one is still displayed
    //   b) Re-schedule all alarms from Realm as a safety net after reboots
    const unsubscribeAppState = AppState.addEventListener('change', async (nextState) => {
      const wasBackground =
        appState.current === 'background' || appState.current === 'inactive';
      const isNowActive = nextState === 'active';

      if (wasBackground && isNowActive) {
        // (a) Check for a displayed alarm — this is the fix for the overlay not showing
        const displayedAlarm = await findDisplayedAlarm();
        if (displayedAlarm) {
          setActiveAlarm(displayedAlarm);
        }

        // (b) Re-schedule alarms wiped by Android after reboot/force-kill
        try {
          await NotificationService.rescheduleAllAlarms(realm);
        } catch (e) {
          console.error('[AppState] rescheduleAllAlarms error:', e);
        }
      }

      appState.current = nextState;
    });

    // ── 5. INITIALIZATION DELAY ─────────────────
    const timer = setTimeout(() => setIsInitializing(false), 2000);

    return () => {
      unsubscribeForeground();
      unsubscribeAppState.remove();
      clearTimeout(timer);
    };
  }, [realm]);

  if (isInitializing) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: activeTheme.colors.background,
        }}
      >
        <ActivityIndicator size="large" color={activeTheme.colors.primary} />
        <Text
          style={{
            marginTop: 16,
            color: activeTheme.colors.onSurfaceVariant,
            fontFamily: 'Geist-Medium',
          }}
        >
          Initializing health services...
        </Text>
      </View>
    );
  }

  return (
    <ThemeContext.Provider
      value={{ toggleTheme: () => setIsDarkMode((prev) => !prev), isDarkMode }}
    >
      <PaperProvider theme={activeTheme}>
        <NavigationContainer theme={activeTheme}>
          <View style={{ flex: 1, backgroundColor: activeTheme.colors.background }}>
            <StatusBar
              barStyle={isDarkMode ? 'light-content' : 'dark-content'}
              backgroundColor="transparent"
              translucent
            />

            {/* Full-screen alarm overlay — renders above everything */}
            {activeAlarm ? (
              <AlarmOverlay
                isVisible={true}
                medication={activeAlarm.data}
                onTake={async () => {
                  await performMedicationAction(realm, activeAlarm, MedicationStatus.TAKEN);
                  setActiveAlarm(null);
                }}
                onSnooze={async () => {
                  await performMedicationAction(realm, activeAlarm, MedicationStatus.SNOOZED);
                  setActiveAlarm(null);
                }}
                onSkip={async () => {
                  await performMedicationAction(realm, activeAlarm, MedicationStatus.SKIPPED);
                  setActiveAlarm(null);
                }}
              />
            ) : null}

            {/* Screen routing */}
            {profiles.length > 0 ? (
              <MainTabs />
            ) : !hasStartedOnboarding ? (
              <WelcomeScreen
                onStart={() => {
                  NotificationService.bootstrap();
                  setHasStartedOnboarding(true);
                }}
              />
            ) : (
              <AddProfileScreen isFirstProfile={true} />
            )}

            {/* Theme toggle FAB */}
            <Portal>
              <FAB
                icon={isDarkMode ? 'weather-sunny' : 'weather-night'}
                style={{
                  position: 'absolute',
                  top: 50,
                  right: 16,
                  backgroundColor: activeTheme.colors.surface,
                  borderRadius: 12,
                }}
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

// ─────────────────────────────────────────────
// ROOT
// ─────────────────────────────────────────────

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
        schema={RealmSchemas}
        schemaVersion={2}
        deleteRealmIfMigrationNeeded={true}
      >
        <AppContent />
      </RealmProvider>
    </SafeAreaProvider>
  );
}
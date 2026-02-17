import 'react-native-gesture-handler';
import React, { useState, createContext, useMemo, useEffect } from 'react';
import { Platform, StatusBar, View, Alert } from 'react-native';
import { PaperProvider, FAB, Portal } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { registerTranslation } from 'react-native-paper-dates';

import * as Notifications from 'expo-notifications';
import notifee, { EventType, AuthorizationStatus } from '@notifee/react-native';
import { RealmProvider, useQuery, useRealm } from '@realm/react';
import * as Realm from 'realm';

import { Medication, Profile, MedicationLog } from './src/models/Schemas';
import { lightTheme, darkTheme } from './src/theme';
import NotificationService from './src/services/NotificationService';

import HomeScreen from './src/screens/HomeScreen';
import WelcomeScreen from './src/screens/WelcomeScreen';
import AddProfileScreen from './src/screens/AddProfileScreen';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const ThemeContext = createContext({
  toggleTheme: () => {},
  isDarkMode: false,
});

registerTranslation('en', {
  save: 'Save',
  selectSingle: 'Select date',
  selectMultiple: 'Select dates',
  selectRange: 'Select period',
  today: 'Today',
  confirm: 'Confirm',
  cancel: 'Cancel',
  close: 'Close',
});

function AppContent() {
  const realm = useRealm();
  const profiles = useQuery(Profile);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [hasStartedOnboarding, setHasStartedOnboarding] = useState(false);

  useEffect(() => {
    async function initializeNotifications() {
      // 1. Check current permission status
      const settings = await notifee.getNotificationSettings();

      // 2. Force request if not determined or denied
      if (settings.authorizationStatus === AuthorizationStatus.NOT_DETERMINED) {
        await notifee.requestPermission();
      }

      // 3. Always bootstrap to ensure the Sound Channel exists in System Settings
      await NotificationService.bootstrap();

      // 4. Handle button interactions
      const unsubscribe = notifee.onForegroundEvent(async ({ type, detail }) => {
        const { notification, pressAction } = detail;

        if (type === EventType.ACTION_PRESS) {
          if (pressAction.id === 'taken') {
            handleMarkAsTaken(notification);
          } else if (pressAction.id === 'snooze') {
            await NotificationService.snoozeMedication(notification);
          }
        }
      });

      return unsubscribe;
    }

    const netListener = initializeNotifications();
    return () => {
      netListener.then(unsubscribe => unsubscribe && unsubscribe());
    };
  }, []);

  const handleMarkAsTaken = (notification) => {
    const { medicationId, scheduledAt } = notification.data;

    try {
      const medUuid = new Realm.BSON.UUID(medicationId);
      const medication = realm.objectForPrimaryKey('Medication', medUuid);

      realm.write(() => {
        const now = new Date();
        const scheduledDate = new Date(scheduledAt);
        const delay = Math.round((now - scheduledDate) / 60000);

        realm.create('MedicationLog', {
          _id: new Realm.BSON.UUID(),
          medicationId: medUuid,
          medicationName: medication ? medication.name : 'Unknown Medication',
          status: 'taken',
          scheduledAt: scheduledDate,
          takenAt: now,
          delayMinutes: delay,
        });

        if (medication && medication.isInventoryEnabled && medication.stock > 0) {
          medication.stock -= 1;
        }
      });
    } catch (error) {
      console.error('[App] Failed to log medication:', error);
    } finally {
      notifee.cancelNotification(notification.id);
    }
  };

  const themeContextValue = useMemo(() => ({
    toggleTheme: () => setIsDarkMode(prev => !prev),
    isDarkMode,
  }), [isDarkMode]);

  const activeTheme = isDarkMode ? darkTheme : lightTheme;

  const renderStack = () => {
    if (profiles && profiles.length > 0) return <HomeScreen />;
    if (!hasStartedOnboarding) {
      return <WelcomeScreen onStart={() => setHasStartedOnboarding(true)} />;
    }
    return <AddProfileScreen isFirstProfile={true} />;
  };

  return (
    <ThemeContext.Provider value={themeContextValue}>
      <PaperProvider theme={activeTheme}>
        <View style={{ flex: 1, backgroundColor: activeTheme.colors.background }}>
          <StatusBar 
            barStyle={isDarkMode ? 'light-content' : 'dark-content'} 
            backgroundColor="transparent" 
            translucent 
          />
          {renderStack()}
        </View>

        <Portal>
          <FAB
            icon={isDarkMode ? 'weather-sunny' : 'weather-night'}
            style={{
              position: 'absolute',
              top: Platform.OS === 'ios' ? 60 : (StatusBar.currentHeight || 0) + 10,
              right: 16,
              borderRadius: 12,
              backgroundColor: activeTheme.colors.surface,
              borderWidth: 1,
              borderColor: activeTheme.colors.outlineVariant,
              elevation: 4,
            }}
            color={isDarkMode ? '#FFD700' : activeTheme.colors.primary}
            onPress={() => setIsDarkMode(!isDarkMode)}
            size="small"
          />
        </Portal>
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
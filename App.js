// 1. DAPAT NASA PINAKATAAS 'TO - Rule #1 ng Gesture Handler
import 'react-native-gesture-handler'; 

import React, { useState, createContext, useMemo, useEffect } from 'react';
import { Platform, StatusBar, View } from 'react-native';
import { PaperProvider, FAB, Portal } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { registerTranslation } from 'react-native-paper-dates';

// Notification Import
import * as Notifications from 'expo-notifications';

// Realm Imports
import { RealmProvider, useQuery } from '@realm/react';
import { Medication, Profile, MedicationLog } from './src/models/Schemas';

// Theme and Screen Imports
import { lightTheme, darkTheme } from './src/theme';
import HomeScreen from './src/screens/HomeScreen';
import WelcomeScreen from './src/screens/WelcomeScreen';
import AddProfileScreen from './src/screens/AddProfileScreen';

// Notification Configuration - Paano sasagot ang app sa alarm
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
  type: 'Type',
  clear: 'Clear',
  today: 'Today',
  disabled: 'Disabled',
  confirm: 'Confirm',
  cancel: 'Cancel',
  close: 'Close',
});

function AppContent() {
  const profiles = useQuery(Profile);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [hasStartedOnboarding, setHasStartedOnboarding] = useState(false);

  // LOGIC: Request Notification Permissions on Startup
  useEffect(() => {
    async function requestPermissions() {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.log('Notification permission denied!');
      }
    }
    requestPermissions();
  }, []);

  const themeContextValue = useMemo(() => ({
    toggleTheme: () => setIsDarkMode(prev => !prev),
    isDarkMode,
  }), [isDarkMode]);

  const activeTheme = isDarkMode ? darkTheme : lightTheme;

  const renderStack = () => {
    // Kung may profile na sa Realm, diretso sa Home
    if (profiles && profiles.length > 0) {
      return <HomeScreen />;
    }
    // Kung wala pa, tingnan kung nasa Welcome screen o nasa Add Profile
    if (!hasStartedOnboarding) {
      return <WelcomeScreen onStart={() => setHasStartedOnboarding(true)} />;
    }
    return <AddProfileScreen isFirstProfile={true} />;
  };

  return (
    <ThemeContext.Provider value={themeContextValue}>
      <PaperProvider theme={activeTheme}>
        <View style={{ flex: 1, backgroundColor: activeTheme.colors.background }}>
          {/* StatusBar setup para sa modern look */}
          <StatusBar 
            barStyle={isDarkMode ? 'light-content' : 'dark-content'} 
            backgroundColor="transparent" 
            translucent 
          />
          
          {renderStack()}
        </View>

        {/* Theme Toggle Button - Floating style */}
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
      {/* REALM CONFIGURATION:
          schemaVersion: 2 - Sinasabi sa Realm na nagbago ang structure (inventory fields).
          deleteRealmIfMigrationNeeded: true - Buburahin ang lumang data para hindi mag-error.
      */}
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
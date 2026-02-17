import React, { useState, createContext, useMemo } from 'react';
import { Platform, StatusBar } from 'react-native';
import { PaperProvider, FAB, Portal } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { registerTranslation } from 'react-native-paper-dates';

// Realm Imports
import { RealmProvider, useQuery } from '@realm/react';
import { Medication, Profile, MedicationLog } from './src/models/Schemas';

// Theme and Screen Imports
import { lightTheme, darkTheme } from './src/theme';
import HomeScreen from './src/screens/HomeScreen';
import WelcomeScreen from './src/screens/WelcomeScreen';
import AddProfileScreen from './src/screens/AddProfileScreen';

// Context for global theme toggling
export const ThemeContext = createContext({
  toggleTheme: () => {},
  isDarkMode: false,
});

// Initialize date picker translations
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
  
  // Local state to handle the transition from Welcome to Profile Creation
  const [hasStartedOnboarding, setHasStartedOnboarding] = useState(false);

  const themeContextValue = useMemo(() => ({
    toggleTheme: () => setIsDarkMode(prev => !prev),
    isDarkMode,
  }), [isDarkMode]);

  const activeTheme = isDarkMode ? darkTheme : lightTheme;

  /**
   * NAVIGATION LOGIC:
   * 1. If a profile exists in Realm -> User is already set up, go to HomeScreen.
   * 2. If no profile + hasn't clicked "Get Started" -> Show the WelcomeScreen.
   * 3. If no profile + clicked "Get Started" -> Show AddProfileScreen to create the first user.
   */
  const renderStack = () => {
    if (profiles && profiles.length > 0) {
      return <HomeScreen />;
    }

    if (!hasStartedOnboarding) {
      return <WelcomeScreen onStart={() => setHasStartedOnboarding(true)} />;
    }

    return <AddProfileScreen isFirstProfile={true} />;
  };

  return (
    <ThemeContext.Provider value={themeContextValue}>
      <PaperProvider theme={activeTheme}>
        
        {renderStack()}

        {/* Floating Theme Toggle - Useful for testing UI in both modes */}
        <Portal>
          <FAB
            icon={isDarkMode ? 'weather-sunny' : 'weather-night'}
            style={{
              position: 'absolute',
              top: Platform.OS === 'ios' ? 50 : (StatusBar.currentHeight || 0) + 10,
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
  // Load Geist fonts before rendering the app
  const [fontsLoaded] = useFonts({
    'Geist-Regular': require('./assets/fonts/geist/Geist-Regular.ttf'),
    'Geist-Medium': require('./assets/fonts/geist/Geist-Medium.ttf'),
    'Geist-SemiBold': require('./assets/fonts/geist/Geist-SemiBold.ttf'),
    'Geist-Bold': require('./assets/fonts/geist/Geist-Bold.ttf'),
  });

  if (!fontsLoaded) {
    return null; // Or a simple splash screen/loading spinner
  }

  return (
    <SafeAreaProvider>
      {/* The RealmProvider must wrap the content that uses Realm hooks.
        We pass our schemas here so Realm knows what the database looks like.
      */}
      <RealmProvider schema={[Medication, Profile, MedicationLog]}>
        <AppContent />
      </RealmProvider>
    </SafeAreaProvider>
  );
}
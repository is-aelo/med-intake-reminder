import React, { useState, createContext, useMemo } from 'react';
import { Platform, StatusBar } from 'react-native';
import { PaperProvider, FAB, Portal } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { registerTranslation } from 'react-native-paper-dates';

import { lightTheme, darkTheme } from './src/theme';
import HomeScreen from './src/screens/HomeScreen';

// Create Theme Context for global state management
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

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  const [fontsLoaded] = useFonts({
    'Geist-Regular': require('./assets/fonts/geist/Geist-Regular.ttf'),
    'Geist-Medium': require('./assets/fonts/geist/Geist-Medium.ttf'),
    'Geist-SemiBold': require('./assets/fonts/geist/Geist-SemiBold.ttf'),
    'Geist-Bold': require('./assets/fonts/geist/Geist-Bold.ttf'),
  });

  // Memoize context value to optimize performance
  const themeContextValue = useMemo(() => ({
    toggleTheme: () => setIsDarkMode(prev => !prev),
    isDarkMode,
  }), [isDarkMode]);

  const activeTheme = isDarkMode ? darkTheme : lightTheme;

  if (!fontsLoaded) {
    return null; 
  }

  return (
    <ThemeContext.Provider value={themeContextValue}>
      <SafeAreaProvider>
        <PaperProvider theme={activeTheme}>
          
          <HomeScreen />

          {/* Floating Theme Toggle - Positioning handled for both iOS and Android */}
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
      </SafeAreaProvider>
    </ThemeContext.Provider>
  );
}
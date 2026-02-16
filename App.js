import React from 'react';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { registerTranslation } from 'react-native-paper-dates';

// REMOVED: import 'intl'; 
// REMOVED: import 'intl/locale-data/jsonp/en';

import { theme } from './src/theme';
import HomeScreen from './src/screens/HomeScreen';

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
  const [fontsLoaded] = useFonts({
    'Geist-Regular': require('./assets/fonts/geist/Geist-Regular.ttf'),
    'Geist-Medium': require('./assets/fonts/geist/Geist-Medium.ttf'),
    'Geist-SemiBold': require('./assets/fonts/geist/Geist-SemiBold.ttf'),
    'Geist-Bold': require('./assets/fonts/geist/Geist-Bold.ttf'),
  });

  if (!fontsLoaded) {
    return null; 
  }

  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <HomeScreen />
      </PaperProvider>
    </SafeAreaProvider>
  );
}
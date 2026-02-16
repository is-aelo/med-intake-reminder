import React from 'react';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Imports mula sa src folder
import { theme } from './src/theme';
import HomeScreen from './src/screens/HomeScreen';

export default function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <HomeScreen />
      </PaperProvider>
    </SafeAreaProvider>
  );
}
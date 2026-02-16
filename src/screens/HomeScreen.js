import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Appbar, FAB, useTheme } from 'react-native-paper';

import WelcomeScreen from './WelcomeScreen';

export default function HomeScreen() {
  const [isFirstLaunch, setIsFirstLaunch] = useState(true);
  const theme = useTheme(); // Access the global theme

  if (isFirstLaunch) {
    return <WelcomeScreen onStart={() => setIsFirstLaunch(false)} />;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header style={{ backgroundColor: theme.colors.surface }}>
        <Appbar.Content 
          title="My Schedule" 
          titleStyle={{ fontFamily: theme.fonts.headlineSmall.fontFamily }} 
        />
      </Appbar.Header>

      <View style={styles.content}>
        <Text variant="headlineSmall" style={{ color: theme.colors.primary }}>
          Today's Medication
        </Text>
        <Text variant="bodyMedium" style={{ marginTop: 10, color: theme.colors.secondary }}>
          Your list is empty. Add your first medicine!
        </Text>
      </View>

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => console.log('Add Medication Pressed')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 20,
  },
});
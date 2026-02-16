import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Appbar, FAB } from 'react-native-paper';
import { theme } from '../theme';

// Import yung separate file natin
import WelcomeScreen from './WelcomeScreen';

export default function HomeScreen() {
  const [isFirstLaunch, setIsFirstLaunch] = useState(true);

  // Conditional Rendering
  if (isFirstLaunch) {
    return <WelcomeScreen onStart={() => setIsFirstLaunch(false)} />;
  }

  return (
    <View style={styles.container}>
      <Appbar.Header style={{ backgroundColor: theme.colors.primary }}>
        <Appbar.Content title="My Schedule" titleStyle={{ color: 'white' }} />
      </Appbar.Header>

      <View style={styles.content}>
        <Text variant="headlineSmall" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
          Today's Meds
        </Text>
        <Text variant="bodyMedium" style={{ marginTop: 10 }}>
          Your list is empty. Add your first medicine!
        </Text>
      </View>

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.secondary }]}
        color="white"
        onPress={() => console.log('Add Medication Pressed')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F6F6',
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
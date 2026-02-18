import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Text, Button, useTheme } from 'react-native-paper';

const { width } = Dimensions.get('window');

/**
 * WelcomeScreen - The first screen users see.
 * Triggers onStart which now includes the notification permission request in App.js.
 */
export default function WelcomeScreen({ onStart }) {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        {/* Visual Icon Section */}
        <View style={[styles.iconContainer, { backgroundColor: theme.colors.primaryContainer }]}>
           <Text style={{ fontSize: 80 }}>💊</Text>
        </View>

        <Text variant="displaySmall" style={[styles.title, { color: theme.colors.onSurface }]}>
          Never Miss a Dose
        </Text>
        
        <Text variant="bodyLarge" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
          Your simple, smart, and reliable medication reminder and tracker.
        </Text>
      </View>

      <View style={styles.footer}>
        <Button 
          mode="contained" 
          onPress={onStart} // This calls handleStartOnboarding in App.js to force permission dialog
          style={styles.button}
          contentStyle={styles.buttonContent}
          labelStyle={{ fontSize: 18, fontWeight: 'bold' }}
        >
          Get Started
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    // Add a slight elevation for a modern look
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  title: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 24,
  },
  footer: {
    paddingBottom: 40,
  },
  button: {
    borderRadius: 16,
  },
  buttonContent: {
    height: 56,
  },
});
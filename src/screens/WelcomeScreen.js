import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, useTheme } from 'react-native-paper';

export default function WelcomeScreen({ onStart }) {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.welcomeContent}>
        {/* Soft circle background for the icon to make it look premium */}
        <View style={[styles.iconCircle, { backgroundColor: theme.colors.primaryContainer }]}>
          <Text style={styles.logo}>💊</Text>
        </View>

        <Text variant="displaySmall" style={[styles.appName, { color: theme.colors.primary }]}>
          MedReminder
        </Text>
        
        <Text variant="bodyLarge" style={[styles.description, { color: theme.colors.secondary }]}>
          Your simple and reliable partner in health.{"\n"}Never miss a dose again.
        </Text>

        <Button 
          mode="contained" 
          style={styles.startButton}
          contentStyle={styles.buttonContent}
          onPress={onStart}
          // Geist Medium will automatically apply from theme labelLarge
        >
          Get Started
        </Button>

        <Text variant="labelSmall" style={[styles.footer, { color: theme.colors.outline }]}>
          Version 1.0.0
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  welcomeContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
    // Subtle elevation for modern look
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  logo: {
    fontSize: 60,
  },
  appName: {
    marginBottom: 12,
    textAlign: 'center',
    // We rely on theme.fonts.displaySmall for Geist-Bold
  },
  description: {
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 50,
    paddingHorizontal: 10,
  },
  startButton: {
    width: '100%',
    paddingVertical: 4,
    // theme.roundness (16) will apply automatically here
  },
  buttonContent: {
    height: 48,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    letterSpacing: 1,
  },
});
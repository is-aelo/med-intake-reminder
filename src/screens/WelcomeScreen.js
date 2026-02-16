import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { theme } from '../theme';

export default function WelcomeScreen({ onStart }) {
  return (
    <View style={styles.container}>
      <View style={styles.welcomeContent}>
        <Text style={styles.logo}>💊</Text>
        <Text variant="displaySmall" style={styles.appName}>
          MedReminder
        </Text>
        <Text variant="bodyLarge" style={styles.description}>
          Your simple and reliable partner in health. Never miss a dose again.
        </Text>

        <Button 
          mode="contained" 
          style={styles.startButton}
          contentStyle={styles.buttonSpacing}
          onPress={onStart}
        >
          Get Started
        </Button>

        <Text variant="labelSmall" style={styles.footer}>
          Version 1.0.0
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F6F6',
  },
  welcomeContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  logo: {
    fontSize: 80,
    marginBottom: 10,
  },
  appName: {
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 10,
  },
  description: {
    textAlign: 'center',
    color: '#4B5D4C',
    lineHeight: 24,
    marginBottom: 40,
  },
  startButton: {
    width: '100%',
    borderRadius: 30,
    backgroundColor: theme.colors.primary,
  },
  buttonSpacing: {
    paddingVertical: 8,
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    color: '#80AF81',
  },
});
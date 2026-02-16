import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Text, Button, useTheme } from 'react-native-paper';

export default function WelcomeScreen({ onStart }) {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.welcomeContent}>
        
        {/* Icon Circle with Organic Shadow */}
        <View style={[
          styles.iconCircle, 
          { 
            backgroundColor: theme.colors.primaryContainer,
            // Using primary color for shadow with low opacity for that "blur" effect
            shadowColor: theme.colors.primary, 
            elevation: 4, 
          }
        ]}>
          <Text style={styles.logo}>💊</Text>
        </View>

        <Text 
          variant="displaySmall" 
          style={[styles.appName, { color: theme.colors.primary, fontFamily: theme.fonts.displaySmall.fontFamily }]}
        >
          MedReminder
        </Text>
        
        <Text 
          variant="bodyLarge" 
          style={[styles.description, { color: theme.colors.secondary, fontFamily: theme.fonts.bodyLarge.fontFamily }]}
        >
          Your simple and reliable partner in health.{"\n"}Never miss a dose again.
        </Text>

        <Button 
          mode="contained" 
          style={[styles.startButton, { borderRadius: theme.roundness }]}
          contentStyle={styles.buttonContent}
          labelStyle={{ fontFamily: theme.fonts.labelLarge.fontFamily }}
          onPress={onStart}
        >
          Get Started
        </Button>

        <Text 
          variant="labelSmall" 
          style={[styles.footer, { color: theme.colors.outline, fontFamily: theme.fonts.labelLarge.fontFamily }]}
        >
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
    borderRadius: 70, // Keep this as circle
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
    // iOS Shadow Logic using the theme color
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
  },
  logo: {
    fontSize: 60,
  },
  appName: {
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 50,
    paddingHorizontal: 10,
  },
  startButton: {
    width: '100%',
  },
  buttonContent: {
    height: 52,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    letterSpacing: 1,
  },
});
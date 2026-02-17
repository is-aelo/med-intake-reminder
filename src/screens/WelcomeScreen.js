import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Text, Button, useTheme } from 'react-native-paper';

const { width } = Dimensions.get('window');

// Eto dapat ang laman ng WelcomeScreen. Focus lang sa UI at yung onStart button.
export default function WelcomeScreen({ onStart }) {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        {/* Visual Icon */}
        <View style={[styles.iconContainer, { backgroundColor: theme.colors.primaryContainer }]}>
           <Text style={{ fontSize: 80 }}>💊</Text>
        </View>

        <Text variant="displaySmall" style={styles.title}>
          Never Miss a Dose
        </Text>
        
        <Text variant="bodyLarge" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
          Your simple, smart, and reliable medication reminder and tracker.
        </Text>
      </View>

      <View style={styles.footer}>
        <Button 
          mode="contained" 
          onPress={onStart} 
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
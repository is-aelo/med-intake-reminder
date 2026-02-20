// src/components/ScreenHeader.js
import React from 'react';
import { View, StyleSheet, Platform, StatusBar } from 'react-native';
import { Text, IconButton, useTheme } from 'react-native-paper';

export const ScreenHeader = ({ title, onBack, rightElement, subtitle }) => {
  const theme = useTheme();
  
  const paddingTop = Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 10 : 10;

  return (
    <View style={[styles.container, { paddingTop, backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <View style={styles.leftSection}>
          {onBack && (
            <IconButton 
              icon="arrow-left" 
              size={24} 
              onPress={onBack} 
              iconColor={theme.colors.onSurface}
              style={styles.backButton}
            />
          )}
          <View>
            <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.onSurface }]}>
              {title}
            </Text>
            {subtitle && (
              <Text variant="labelMedium" style={{ color: theme.colors.secondary, marginLeft: 4, marginTop: -4 }}>
                {subtitle}
              </Text>
            )}
          </View>
        </View>
        {rightElement && <View style={styles.rightSection}>{rightElement}</View>}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 64,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginLeft: -8,
  },
  title: {
    fontFamily: 'Geist-Bold',
    marginLeft: 4,
    letterSpacing: -0.5,
  },
});
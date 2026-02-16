import React from 'react';
import { View, StyleSheet, Platform, StatusBar } from 'react-native';
import { Text, IconButton, useTheme } from 'react-native-paper';

export const ScreenHeader = ({ title, onBack, rightElement }) => {
  const theme = useTheme();
  
  // Estimate status bar height for Android, iOS is handled by Layout logic usually
  const paddingTop = Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 10;

  return (
    <View style={[styles.container, { paddingTop, backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <View style={styles.leftSection}>
          {onBack && (
            <IconButton 
              icon="arrow-left" 
              size={24} 
              onPress={onBack} 
              iconColor={theme.colors.primary}
              style={styles.backButton}
            />
          )}
          <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.primary }]}>
            {title}
          </Text>
        </View>
        {rightElement && <View>{rightElement}</View>}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    paddingBottom: 10,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    marginLeft: -4,
  },
  title: {
    fontFamily: 'Geist-Bold',
    marginLeft: 4,
  },
});
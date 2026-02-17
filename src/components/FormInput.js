import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, TextInput, useTheme } from 'react-native-paper';

/**
 * FormLabel - A consistent label for all input fields.
 * Uses the secondary color and Geist-Medium vibe.
 */
export const FormLabel = ({ label }) => {
  const theme = useTheme();
  return (
    <Text 
      variant="labelMedium" 
      style={[
        styles.inputLabel, 
        { 
          color: theme.colors.secondary,
          fontFamily: theme.fonts.labelLarge.fontFamily // Mapping to our Geist font
        }
      ]}
    >
      {label}
    </Text>
  );
};

/**
 * ModernInput - A customized React Native Paper TextInput.
 * Clean "Flat" style with no harsh outlines.
 */
export const ModernInput = (props) => {
  const theme = useTheme();
  
  return (
    <TextInput
      {...props}
      mode="flat"
      underlineColor="transparent"
      activeUnderlineColor={theme.colors.primary}
      
      // FIX PARA SA "LUHA" AT HIGHLIGHT:
      cursorColor={theme.colors.primary} // Ang blinking bar
      selectionColor={theme.colors.primaryContainer} // Ang highlight box kapag nag-select ng text
      selectionHandleColor={theme.colors.primary} // Ang "luha" handle (Android)

      // Pass all standard TextInput props (placeholder, value, onChangeText, etc.)
      style={[
        styles.modernInput, 
        { 
          backgroundColor: theme.colors.surface, 
          borderRadius: theme.roundness,
          fontFamily: theme.fonts.bodyLarge.fontFamily
        }, 
        props.style
      ]}
      contentStyle={styles.contentStyle}
    />
  );
};

const styles = StyleSheet.create({
  inputLabel: { 
    marginLeft: 4, 
    letterSpacing: 1, 
    fontWeight: '700', 
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  modernInput: { 
    height: 56, 
    fontSize: 16,
  },
  contentStyle: {
    paddingHorizontal: 16,
  }
});
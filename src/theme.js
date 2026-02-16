import { MD3LightTheme } from 'react-native-paper';

// Dito nakatira ang "Global Identity" ng app mo
export const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#1A5319',           // Dark Green (Headers/Main Buttons)
    primaryContainer: '#D6EFD8',  // Light Mint (Backgrounds)
    secondary: '#508D4E',         // Leaf Green (Accent/Actions)
    outline: '#80AF81',           // Sage Green (Borders/Dividers)
    surface: '#FBFDFB',           // Clean White-ish
  },
};
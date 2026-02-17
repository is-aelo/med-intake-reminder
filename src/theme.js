import { MD3LightTheme, configureFonts } from 'react-native-paper';

const fontConfig = {
  displaySmall: { fontFamily: 'Geist-Bold' },
  headlineSmall: { fontFamily: 'Geist-SemiBold' },
  titleMedium: { fontFamily: 'Geist-Medium' },
  bodyLarge: { fontFamily: 'Geist-Regular' },
  labelLarge: { fontFamily: 'Geist-Medium' },
};

export const theme = {
  ...MD3LightTheme,
  fonts: configureFonts({ config: fontConfig }),
  roundness: 16,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#2D5A27',           // Forest Green
    onPrimary: '#FFFFFF',
    primaryContainer: '#E8F5E9',  // Light Mint
    onPrimaryContainer: '#1B3217',
    
    secondary: '#6A977D',         // Sage
    onSecondary: '#FFFFFF',
    secondaryContainer: '#F1F5F2', 
    onSecondaryContainer: '#1D241F',

    background: '#FFFFFF',
    surface: '#F9FBF9',           
    
    // OVERRIDING THE PURPLE TINTS:
    surfaceVariant: '#F0F2F0',    // Light Grayish Green (dating purplish gray)
    onSurfaceVariant: '#444944',  // Darker Gray-Green (dating brownish purple)
    
    outline: '#E0E4E0',           
    outlineVariant: '#F0F2F0',
    
    error: '#BA1A1A',
  },
};
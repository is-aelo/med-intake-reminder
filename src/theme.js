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
  roundness: 16, // More rounded = more modern
  colors: {
    ...MD3LightTheme.colors,
    primary: '#2D5A27',           // Forest Green (Deep but muted)
    onPrimary: '#FFFFFF',
    primaryContainer: '#E8F5E9',  // Very light mint (instead of heavy green)
    onPrimaryContainer: '#1B3217',
    
    secondary: '#6A977D',         // Sage/Grey-Green (More sophisticated)
    
    background: '#FFFFFF',        // Pure white for that clean look
    surface: '#F9FBF9',           // Extremely subtle tint for cards
    
    outline: '#E0E4E0',           // Very thin, light borders
    outlineVariant: '#F0F2F0',
    
    error: '#BA1A1A',
  },
};
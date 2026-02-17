import { MD3LightTheme, MD3DarkTheme, configureFonts } from 'react-native-paper';

const fontConfig = {
  displaySmall: { fontFamily: 'Geist-Bold' },
  headlineSmall: { fontFamily: 'Geist-SemiBold' },
  titleMedium: { fontFamily: 'Geist-Medium' },
  bodyLarge: { fontFamily: 'Geist-Regular' },
  labelLarge: { fontFamily: 'Geist-Medium' },
};

// --- LIGHT THEME (Forest & Sage) ---
export const lightTheme = {
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
    surfaceVariant: '#F0F2F0',    // Neutral Greenish Gray for inputs
    onSurface: '#1B1C1B',         
    onSurfaceVariant: '#444944',  // For placeholders and icons

    outline: '#D0D5D0',           
    outlineVariant: '#E0E4E0',    
    
    error: '#BA1A1A',
    
    // In-override natin ang elevation para walang purple tint ang anino
    elevation: {
      level0: 'transparent',
      level1: '#F3F5F3',
      level2: '#EDF0ED',
      level3: '#E7EAE7',
      level4: '#E1E5E1',
      level5: '#DBE0DB',
    }
  },
};

// --- DARK THEME (Deep Forest) ---
export const darkTheme = {
  ...MD3DarkTheme,
  fonts: configureFonts({ config: fontConfig }),
  roundness: 16,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#8BC34A',           // Brighter Green para readable sa dilim
    onPrimary: '#0A1B07',
    primaryContainer: '#1B3217',
    onPrimaryContainer: '#C8E6C9',

    secondary: '#A5D6A7',         // Muted Sage
    onSecondary: '#0E1A11',
    secondaryContainer: '#2D352F',
    onSecondaryContainer: '#D1E8D5',

    background: '#0D110D',        // Deep Forest Black
    surface: '#121612',           // Dark Surface for cards
    surfaceVariant: '#242B24',    // Darker surface for inputs
    onSurface: '#E2E3E2',         // Off-white text
    onSurfaceVariant: '#BDBFBD',  // Muted gray text for labels

    outline: '#3E443E',           
    outlineVariant: '#242B24',
    
    error: '#FFB4AB',

    elevation: {
      level0: 'transparent',
      level1: '#1A211A',
      level2: '#202920',
      level3: '#263126',
      level4: '#2C3A2C',
      level5: '#324232',
    }
  },
};
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

    background: '#F8F9F8',        // Mas malinis kaysa sa pure white
    surface: '#FFFFFF',           
    surfaceVariant: '#F0F2F0',    // Neutral Greenish Gray for inputs
    onSurface: '#1B1C1B',         
    onSurfaceVariant: '#5D635D',  // Higher contrast for text

    outline: '#D0D5D0',           
    outlineVariant: '#E0E4E0',    
    
    error: '#BA1A1A',
    
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
    // Ginamit natin ang Neon Green para sa Active States
    primary: '#A7F305',           
    onPrimary: '#051000',
    primaryContainer: '#2D5A27',  
    onPrimaryContainer: '#C8E6C9',

    secondary: '#A5D6A7',         // Muted Sage
    onSecondary: '#0E1A11',
    secondaryContainer: '#1F2922',
    onSecondaryContainer: '#D1E8D5',

    background: '#080A08',        // Pitch Black (Para lumutang ang mga cards)
    surface: '#151915',           // Dark Surface na may hint ng green
    surfaceVariant: '#222922',    
    onSurface: '#F0F2F0',         // halos puti para madaling basahin
    onSurfaceVariant: '#99A199',  // Eto ang kulay ng inactive tabs

    outline: '#3E443E',           
    outlineVariant: '#2D352D',
    
    error: '#FFB4AB',

    // Overrides para sa elevations sa dark mode
    elevation: {
      level0: 'transparent',
      level1: '#1C221C',          
      level2: '#242C24',
      level3: '#2D362D',
      level4: '#364036',
      level5: '#3F4A3F',
    }
  },
};
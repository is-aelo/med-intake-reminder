import 'react-native-gesture-handler';
import React, { useState, createContext, useEffect } from 'react';
import { StatusBar, View, ActivityIndicator } from 'react-native';
import { PaperProvider, FAB, Portal, Text, useTheme } from 'react-native-paper';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';

// Navigation
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Notifications & Realm
import * as Notifications from 'expo-notifications';
import notifee, { EventType } from '@notifee/react-native';
import { RealmProvider, useQuery, useRealm } from '@realm/react';
import Realm from 'realm';

// Local Imports
import { Medication, Profile, MedicationLog } from './src/models/Schemas';
import { lightTheme, darkTheme } from './src/theme';
import NotificationService from './src/services/NotificationService';

// Screens
import HomeScreen from './src/screens/HomeScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import WelcomeScreen from './src/screens/WelcomeScreen';
import AddProfileScreen from './src/screens/AddProfileScreen';

// --- SHARED LOGIC FOR SAVING LOGS ---
/**
 * Shared helper function to process medication actions consistently.
 * Fix: Uses Realm.BSON.UUID to match the provided Schema.
 */
const performMedicationAction = async (realm, notification, actionId) => {
  const { medicationId, medicationName, scheduledAt } = notification.data;
  
  try {
    // FIX: Using UUID instead of ObjectId to match src\models\Schemas.js
    const medId = new Realm.BSON.UUID(medicationId);
    
    if (actionId === 'taken') {
      const medication = realm.objectForPrimaryKey('Medication', medId);
      const now = new Date();
      
      realm.write(() => {
        realm.create('MedicationLog', {
          _id: new Realm.BSON.UUID(), // Log ID is also a UUID
          medicationId: medId,
          medicationName: medication ? medication.name : (medicationName || 'Medication'),
          status: 'taken',
          scheduledAt: new Date(scheduledAt),
          takenAt: now,
          delayMinutes: Math.round((now - new Date(scheduledAt)) / 60000),
        });

        // Inventory management
        if (medication && medication.isInventoryEnabled && medication.stock > 0) {
          medication.stock -= 1;
        }
      });
      console.log(`[Action] Logged 'taken' for ${medicationName}`);
    } 
    
    if (actionId === 'snooze') {
      await NotificationService.snoozeMedication(notification);
      console.log(`[Action] Snoozed ${medicationName}`);
    }

    // Always dismiss the notification after an action is taken
    await notifee.cancelNotification(notification.id);
  } catch (e) {
    console.error('[Action Handler Error]:', e);
  }
};

// --- BACKGROUND EVENT HANDLER ---
/**
 * Registered outside the component to catch events when the app is closed.
 */
notifee.onBackgroundEvent(async ({ type, detail }) => {
  const { notification, pressAction } = detail;

  if (type === EventType.ACTION_PRESS) {
    try {
      const realm = await Realm.open({
        schema: [Medication, Profile, MedicationLog],
        schemaVersion: 2,
        deleteRealmIfMigrationNeeded: true, 
      });

      await performMedicationAction(realm, notification, pressAction.id);
      
      realm.close(); 
    } catch (error) {
      console.error('[Background Event Error]:', error);
    }
  }
});

const Tab = createBottomTabNavigator();

export const ThemeContext = createContext({
  toggleTheme: () => {},
  isDarkMode: false,
});

// --- BOTTOM TAB NAVIGATION COMPONENT ---
function MainTabs() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator 
      screenOptions={{ 
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary, 
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarStyle: { 
          height: 65 + insets.bottom, 
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
          paddingTop: 8,
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.outlineVariant,
          elevation: 8,
          borderTopWidth: 1,
        },
        tabBarLabelStyle: { 
          fontFamily: 'Geist-Medium', 
          fontSize: 12,
          marginBottom: insets.bottom === 0 ? 4 : 0 
        }
      }}
    >
      <Tab.Screen 
        name="Meds" 
        component={HomeScreen} 
        options={{
          tabBarLabel: 'Today',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="pill" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen 
        name="History" 
        component={HistoryScreen} 
        options={{
          tabBarLabel: 'History',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="history" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// --- MAIN CONTENT LOGIC ---
function AppContent() {
  const realm = useRealm();
  const profiles = useQuery(Profile);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [hasStartedOnboarding, setHasStartedOnboarding] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Listen for Foreground Notification Events
  useEffect(() => {
    const unsubscribe = notifee.onForegroundEvent(async ({ type, detail }) => {
      if (type === EventType.ACTION_PRESS) {
        await performMedicationAction(realm, detail.notification, detail.pressAction.id);
      }
    });

    const timer = setTimeout(() => {
      setIsInitializing(false);
    }, 2000); 

    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, [realm]);

  const handleStartOnboarding = async () => {
    try {
      await notifee.requestPermission();
      await NotificationService.bootstrap();
      setHasStartedOnboarding(true);
    } catch (e) {
      console.log('Permission error:', e);
      setHasStartedOnboarding(true);
    }
  };

  const activeTheme = isDarkMode ? darkTheme : lightTheme;

  if (isInitializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: activeTheme.colors.background }}>
        <ActivityIndicator size="large" color={activeTheme.colors.primary} />
        <Text style={{ marginTop: 16, color: activeTheme.colors.onSurfaceVariant, fontFamily: 'Geist-Medium' }}>Initializing health services...</Text>
      </View>
    );
  }

  return (
    <ThemeContext.Provider value={{ toggleTheme: () => setIsDarkMode(!isDarkMode), isDarkMode }}>
      <PaperProvider theme={activeTheme}>
        <NavigationContainer theme={activeTheme}>
          <View style={{ flex: 1, backgroundColor: activeTheme.colors.background }}>
            <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
            
            {profiles.length > 0 ? (
              <MainTabs /> 
            ) : !hasStartedOnboarding ? (
              <WelcomeScreen onStart={handleStartOnboarding} />
            ) : (
              <AddProfileScreen isFirstProfile={true} />
            )}
            
            <Portal>
              <FAB
                icon={isDarkMode ? 'weather-sunny' : 'weather-night'}
                style={{ 
                  position: 'absolute', 
                  top: 50, 
                  right: 16, 
                  backgroundColor: activeTheme.colors.surface,
                  borderRadius: 12
                }}
                onPress={() => setIsDarkMode(!isDarkMode)}
                size="small"
              />
            </Portal>
          </View>
        </NavigationContainer>
      </PaperProvider>
    </ThemeContext.Provider>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    'Geist-Regular': require('./assets/fonts/geist/Geist-Regular.ttf'),
    'Geist-Medium': require('./assets/fonts/geist/Geist-Medium.ttf'),
    'Geist-SemiBold': require('./assets/fonts/geist/Geist-SemiBold.ttf'),
    'Geist-Bold': require('./assets/fonts/geist/Geist-Bold.ttf'),
  });

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <RealmProvider 
        schema={[Medication, Profile, MedicationLog]} 
        schemaVersion={2} 
        deleteRealmIfMigrationNeeded={true}
        fallback={() => <View style={{flex:1, backgroundColor:'#fff'}}/>}
      >
        <AppContent />
      </RealmProvider>
    </SafeAreaProvider>
  );
}
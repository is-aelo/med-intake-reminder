import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, FAB, useTheme, Card, IconButton } from 'react-native-paper';

import WelcomeScreen from './WelcomeScreen';
import AddMedication from './AddMedication';

export default function HomeScreen() {
  const [isFirstLaunch, setIsFirstLaunch] = useState(true);
  const [showAddMed, setShowAddMed] = useState(false);
  const theme = useTheme();

  if (isFirstLaunch) {
    return <WelcomeScreen onStart={() => setIsFirstLaunch(false)} />;
  }

  if (showAddMed) {
    return <AddMedication onBack={() => setShowAddMed(false)} />;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Header Section */}
        <View style={styles.header}>
          <View>
            <Text 
              variant="bodyLarge" 
              style={{ color: theme.colors.secondary, fontFamily: theme.fonts.titleMedium.fontFamily }}
            >
              Good Morning! 🌿
            </Text>
            <Text 
              variant="displaySmall" 
              style={{ color: theme.colors.primary, fontFamily: theme.fonts.displaySmall.fontFamily }}
            >
              My Meds
            </Text>
          </View>
          <IconButton 
            icon="account-circle-outline" 
            iconColor={theme.colors.primary} 
            size={30} 
            onPress={() => {}} 
          />
        </View>

        {/* Empty State Card */}
        <Card 
          style={[
            styles.emptyCard, 
            { 
              backgroundColor: theme.colors.surface, 
              borderColor: theme.colors.outlineVariant,
              borderRadius: theme.roundness * 1.5 // Consistent with theme
            }
          ]} 
          mode="contained"
        >
          <Card.Content style={styles.centerItems}>
            <Text style={styles.emptyIcon}>🍃</Text>
            <Text 
              variant="titleMedium" 
              style={{ 
                fontFamily: theme.fonts.headlineSmall.fontFamily, 
                color: theme.colors.primary 
              }}
            >
              All clear for now
            </Text>
            <Text 
              variant="bodyMedium" 
              style={[styles.emptyText, { color: theme.colors.secondary }]}
            >
              Your schedule is empty. Tap the plus button to add your medications.
            </Text>
          </Card.Content>
        </Card>

      </ScrollView>

      {/* FAB - Using theme colors strictly */}
      <FAB
        icon="plus"
        label="Add Medication"
        extended={true}
        style={[styles.fab, { backgroundColor: theme.colors.primaryContainer, borderRadius: theme.roundness }]}
        color={theme.colors.primary}
        onPress={() => setShowAddMed(true)} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1 
  },
  scrollContent: { 
    padding: 24, 
    paddingTop: 60 
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  emptyCard: {
    padding: 20,
    borderWidth: 1,
    elevation: 0,
  },
  centerItems: { 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  emptyIcon: { 
    fontSize: 40, 
    marginBottom: 10 
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 8,
    opacity: 0.7,
    lineHeight: 20,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 8,
    bottom: 24,
    elevation: 4,
  },
});
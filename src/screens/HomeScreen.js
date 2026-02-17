import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, FAB, useTheme, Card, IconButton, Surface, TouchableRipple } from 'react-native-paper';

// Realm Imports
import { useQuery } from '@realm/react';
import { Medication } from '../models/Schemas';

import WelcomeScreen from './WelcomeScreen';
import AddMedication from './AddMedication';

export default function HomeScreen() {
  const [isFirstLaunch, setIsFirstLaunch] = useState(false); // Set to false since App.js handles onboarding
  const [showAddMed, setShowAddMed] = useState(false);
  const theme = useTheme();

  // 1. Kuhanin ang listahan ng gamot mula sa Realm
  // Ang useQuery ay "live" - pag nag-save ka sa kabilang screen, mag-uupdate ito agad dito.
  const medications = useQuery(Medication);

  if (showAddMed) {
    return <AddMedication onBack={() => setShowAddMed(false)} />;
  }

  // Helper para sa format ng oras (e.g. 08:00 AM)
  const formatTime = (date) => {
    if (!date) return "--:--";
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Header Section */}
        <View style={styles.header}>
          <View>
            <Text 
              variant="bodyLarge" 
              style={{ color: theme.colors.secondary, fontWeight: '500' }}
            >
              Good Morning! 🌿
            </Text>
            <Text 
              variant="displaySmall" 
              style={{ color: theme.colors.primary, fontWeight: 'bold' }}
            >
              My Meds
            </Text>
          </View>
          <IconButton 
            icon="account-circle-outline" 
            iconColor={theme.colors.primary} 
            size={32} 
            onPress={() => {}} 
          />
        </View>

        {/* CONDITION: Kung walang gamot, ipakita ang Empty State. Kung meron, ipakita ang List. */}
        {medications.length === 0 ? (
          <Card 
            style={[
              styles.emptyCard, 
              { 
                backgroundColor: theme.colors.surface, 
                borderColor: theme.colors.outlineVariant,
                borderRadius: 24
              }
            ]} 
            mode="contained"
          >
            <Card.Content style={styles.centerItems}>
              <Text style={styles.emptyIcon}>🍃</Text>
              <Text 
                variant="titleMedium" 
                style={{ color: theme.colors.primary, fontWeight: 'bold' }}
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
        ) : (
          <View style={styles.listContainer}>
            <Text variant="labelLarge" style={styles.sectionTitle}>TODAY'S SCHEDULE</Text>
            
            {medications.map((med) => (
              <Surface key={med._id.toString()} style={[styles.medCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
                <TouchableRipple onPress={() => {}} style={{ borderRadius: 16 }}>
                  <View style={styles.cardInner}>
                    <View style={[styles.timeContainer, { backgroundColor: theme.colors.primaryContainer }]}>
                      <Text variant="titleMedium" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
                        {formatTime(med.reminderTime)}
                      </Text>
                    </View>

                    <View style={styles.infoContainer}>
                      <Text variant="titleLarge" style={styles.medName}>{med.name}</Text>
                      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                        {med.dosage} {med.unit} • {med.category}
                      </Text>
                    </View>

                    <IconButton 
                      icon="chevron-right" 
                      iconColor={theme.colors.outline} 
                      onPress={() => {}} 
                    />
                  </View>
                </TouchableRipple>
              </Surface>
            ))}
          </View>
        )}

      </ScrollView>

      {/* Floating Action Button */}
      <FAB
        icon="plus"
        label="Add Medication"
        extended={true}
        style={[styles.fab, { backgroundColor: theme.colors.primaryContainer, borderRadius: 16 }]}
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
    paddingTop: 60,
    paddingBottom: 100 // Space para hindi matakpan ng FAB
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
    marginTop: 20,
  },
  centerItems: { 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  emptyIcon: { 
    fontSize: 48, 
    marginBottom: 16 
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 8,
    opacity: 0.7,
    lineHeight: 22,
  },
  listContainer: {
    gap: 12,
  },
  sectionTitle: {
    letterSpacing: 1,
    marginBottom: 8,
    opacity: 0.6,
    fontWeight: 'bold',
  },
  medCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  timeContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  infoContainer: {
    flex: 1,
    marginLeft: 16,
  },
  medName: {
    fontWeight: 'bold',
    fontSize: 18,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 8,
    bottom: 24,
    elevation: 6,
  },
});
import React, { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Alert, Animated } from 'react-native';
import { Text, FAB, useTheme, Card, IconButton, Surface, Avatar, ProgressBar, Badge } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Swipeable, GestureHandlerRootView } from 'react-native-gesture-handler';

// Realm Imports
import { useRealm, useQuery } from '@realm/react';
import { Medication, Profile, MedicationLog } from '../models/Schemas';

// Components
import AddMedication from './AddMedication';

export default function HomeScreen() {
  const [showAddMed, setShowAddMed] = useState(false);
  
  const realm = useRealm();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  // DYNAMIC DATA
  const medications = useQuery(Medication);
  const profiles = useQuery(Profile);
  const logs = useQuery(MedicationLog);
  
  const mainProfile = useMemo(() => {
    return profiles.filtered('isMain == true')[0] || profiles[0];
  }, [profiles]);

  // 1. DATE LOGIC (The "Walang date HAHAHA" fix)
  const today = new Date().toLocaleDateString('en-PH', { 
    weekday: 'long', 
    month: 'short', 
    day: 'numeric' 
  });

  // 2. LOGIC: Calculate Progress
  const stats = useMemo(() => {
    const total = medications.length;
    const taken = logs.filtered('status == "taken"').length; 
    const progress = total > 0 ? taken / total : 0;
    return { total, taken, progress };
  }, [medications, logs]);

  // 3. LOGIC: Find the Next Medication
  const nextMed = useMemo(() => {
    if (medications.length === 0) return null;
    const now = new Date();
    const sorted = [...medications].sort((a, b) => {
      const timeA = new Date(a.reminderTime).setFullYear(now.getFullYear(), now.getMonth(), now.getDate());
      const timeB = new Date(b.reminderTime).setFullYear(now.getFullYear(), now.getMonth(), now.getDate());
      return timeA - timeB;
    });
    return sorted.find(m => {
      const medTime = new Date(m.reminderTime);
      return medTime.getHours() > now.getHours() || (medTime.getHours() === now.getHours() && medTime.getMinutes() > now.getMinutes());
    }) || sorted[0];
  }, [medications]);

  // ACTIONS
  const handleTakeMedication = (med) => {
    realm.write(() => {
      realm.create('MedicationLog', {
        _id: new Realm.BSON.UUID(),
        medicationId: med._id,
        medicationName: med.name,
        takenAt: new Date(),
        status: 'taken',
      });

      if (med.isInventoryEnabled && med.stock > 0) {
        med.stock -= 1;
      }
    });

    if (med.isInventoryEnabled && med.stock <= med.reorderLevel) {
      Alert.alert("Low Stock", `Paubos na ang ${med.name}! (${med.stock} left)`);
    }
  };

  const deleteMed = (med) => {
    Alert.alert("Delete", `Sigurado ka bang tatanggalin ang ${med.name}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => {
        realm.write(() => { realm.delete(med); });
      }}
    ]);
  };

  const renderRightActions = (med) => (
    <View style={styles.swipeActions}>
      <IconButton 
        icon="pencil" 
        mode="contained"
        containerColor={theme.colors.primaryContainer}
        iconColor={theme.colors.primary}
        onPress={() => console.log('Edit', med.name)} 
      />
      <IconButton 
        icon="delete" 
        mode="contained"
        containerColor="#FFEBEE"
        iconColor={theme.colors.error}
        onPress={() => deleteMed(med)} 
      />
    </View>
  );

  const formatTime = (date) => {
    if (!date) return "--:--";
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  if (showAddMed) return <AddMedication onBack={() => setShowAddMed(false)} />;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        
        {/* TOP HEADER */}
        <View style={[styles.profileHeader, { paddingTop: insets.top + 10 }]}>
          <View>
            <Text variant="labelLarge" style={{ color: theme.colors.secondary, letterSpacing: 1 }}>{today.toUpperCase()}</Text>
            <Text variant="headlineSmall" style={styles.userName}>
              Hi, {mainProfile?.firstName || 'User'}!
            </Text>
          </View>
          <Avatar.Icon 
            size={45} 
            icon={mainProfile?.icon || "account"} 
            style={{ backgroundColor: mainProfile?.color || theme.colors.primary }}
            color="white"
          />
        </View>

        <ScrollView 
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]} 
          showsVerticalScrollIndicator={false}
        >
          
          {/* PROGRESS CARD */}
          <Surface style={styles.statsCard} elevation={0}>
            <View style={styles.statsRow}>
              <View>
                <Text variant="titleMedium" style={styles.statsTitle}>Daily Progress</Text>
                <Text variant="bodySmall" style={{ color: theme.colors.secondary }}>
                  {stats.taken} of {stats.total} taken today
                </Text>
              </View>
              <Text variant="headlineSmall" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
                {Math.round(stats.progress * 100)}%
              </Text>
            </View>
            <ProgressBar progress={stats.progress} color={theme.colors.primary} style={styles.progressBar} />
          </Surface>

          {/* NEXT DOSE FOCUS */}
          {nextMed && (
            <View style={styles.section}>
              <Text variant="titleMedium" style={styles.sectionLabel}>Next Medication</Text>
              <Card style={[styles.nextCard, { backgroundColor: theme.colors.primaryContainer }]} mode="contained">
                <Card.Content style={styles.nextCardContent}>
                  <View style={styles.nextInfo}>
                    <Text variant="labelLarge" style={{ color: theme.colors.primary }}>{formatTime(nextMed.reminderTime)}</Text>
                    <Text variant="headlineSmall" style={styles.nextMedName}>{nextMed.name}</Text>
                    <Text variant="bodyMedium">{nextMed.dosage} {nextMed.unit} • {nextMed.category}</Text>
                  </View>
                  <IconButton icon="bell-ring" mode="contained" containerColor={theme.colors.primary} iconColor="white" size={30} />
                </Card.Content>
              </Card>
            </View>
          )}

          {/* FULL SCHEDULE LIST */}
          <View style={styles.section}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text variant="titleMedium" style={styles.sectionLabel}>Today's Schedule</Text>
                <Text variant="labelSmall" style={{ opacity: 0.5 }}>Swipe left to edit</Text>
            </View>
            
            {medications.length === 0 ? (
              <Text style={styles.emptyMsg}>Walang gamot sa listahan.</Text>
            ) : (
              [...medications].sort((a,b) => new Date(a.reminderTime) - new Date(b.reminderTime)).map((med) => (
                <Swipeable key={med._id.toString()} renderRightActions={() => renderRightActions(med)}>
                  <Surface style={styles.medItem} elevation={0}>
                    <View style={styles.timeLine}>
                       <Text variant="labelMedium" style={styles.timeLabel}>{formatTime(med.reminderTime)}</Text>
                    </View>
                    <View style={styles.medDetails}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text variant="titleMedium" style={styles.medNameText}>{med.name}</Text>
                        {med.isInventoryEnabled && med.stock <= med.reorderLevel && (
                          <Badge size={8} style={{ marginLeft: 6, backgroundColor: theme.colors.error }} />
                        )}
                      </View>
                      <Text variant="bodySmall" style={{ color: theme.colors.secondary }}>
                        {med.dosage} {med.unit} • {med.isInventoryEnabled ? `${med.stock} left` : med.category}
                      </Text>
                    </View>
                    <IconButton 
                      icon="check-circle-outline" 
                      iconColor={theme.colors.primary} 
                      onPress={() => handleTakeMedication(med)}
                    />
                  </Surface>
                </Swipeable>
              ))
            )}
          </View>
        </ScrollView>

        <FAB
          icon="plus"
          label="Add Medicine"
          extended
          style={[styles.fab, { backgroundColor: theme.colors.primary, bottom: insets.bottom + 20 }]}
          color="white"
          onPress={() => setShowAddMed(true)} 
        />
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  profileHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 20 },
  userName: { fontWeight: 'bold' },
  scrollContent: { paddingHorizontal: 20 },
  statsCard: { padding: 20, borderRadius: 24, backgroundColor: '#F7F9FB', marginBottom: 25, borderWidth: 1, borderColor: '#F0F0F0' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  statsTitle: { fontWeight: 'bold' },
  progressBar: { height: 8, borderRadius: 4 },
  section: { marginBottom: 25 },
  sectionLabel: { marginBottom: 12, fontWeight: 'bold', opacity: 0.7 },
  nextCard: { borderRadius: 24 },
  nextCardContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nextMedName: { fontWeight: 'bold', marginVertical: 2 },
  nextInfo: { flex: 1 },
  medItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 20, backgroundColor: '#FFFFFF', marginBottom: 10, borderWidth: 1, borderColor: '#F0F0F0' },
  timeLine: { width: 75 },
  timeLabel: { fontWeight: 'bold', opacity: 0.6 },
  medDetails: { flex: 1 },
  medNameText: { fontWeight: 'bold' },
  emptyMsg: { textAlign: 'center', opacity: 0.5, marginTop: 20 },
  swipeActions: { flexDirection: 'row', alignItems: 'center', paddingLeft: 10, marginBottom: 10 },
  fab: { position: 'absolute', right: 20, borderRadius: 16, elevation: 4 },
});
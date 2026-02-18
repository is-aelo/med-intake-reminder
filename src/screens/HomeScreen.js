import React, { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity, StatusBar, Platform } from 'react-native';
import { Text, FAB, useTheme, Card, IconButton, Surface, Avatar, ProgressBar, Button } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Swipeable, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useRealm, useQuery } from '@realm/react';
import * as Realm from 'realm';

// Realm Models
import { Medication, Profile, MedicationLog } from '../models/Schemas';

// Services
import NotificationService from '../services/NotificationService';

// Components
import MedicationForm from './MedicationForm';
import MedicineCabinet from './MedicineCabinet';

export default function HomeScreen() {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [viewCabinet, setViewCabinet] = useState(false);

  const realm = useRealm();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  // Queries
  const allMedications = useQuery(Medication);
  const profiles = useQuery(Profile);
  const logs = useQuery(MedicationLog);

  const mainProfile = useMemo(() => {
    // FIXED: Removed .filtered() for safety, used JS .find()
    return profiles.find(p => p.isMain === true) || profiles[0];
  }, [profiles]);

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrowStart = new Date(todayStart.getTime() + 86400000);

  const todayString = now.toLocaleDateString('en-PH', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  // FIXED: Pure JavaScript filtering to avoid 'isValid()' predicate error
  const todayMedications = useMemo(() => {
    const validMedications = allMedications.filter(med => med.isValid());

    const filtered = validMedications.filter(med => {
      if (!med.isActive) return false;
      const start = new Date(med.startDate);
      const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      if (startDay > todayStart) return false;

      const matchesFrequency = () => {
        if (med.frequency === 'daily') return true;
        if (med.frequency === 'interval') {
          const interval = Number(med.intervalValue) || 1;
          const diffDays = Math.floor((todayStart.getTime() - startDay.getTime()) / 86400000);
          return diffDays % interval === 0;
        }
        return true;
      };

      if (med.isPermanent) return matchesFrequency();
      const durationDays = Number(med.duration) || 0;
      const endDay = new Date(startDay);
      endDay.setDate(endDay.getDate() + durationDays - 1);
      return todayStart <= endDay && matchesFrequency();
    });

    return filtered.map(med => ({
      _id: med._id,
      idString: med._id.toHexString(),
      name: med.name,
      reminderTime: med.reminderTime,
      dosage: med.dosage,
      unit: med.unit,
      category: med.category,
      isInventoryEnabled: med.isInventoryEnabled,
      stock: med.stock,
      reorderLevel: med.reorderLevel,
    }));
  }, [allMedications, todayStart]);

  const getDoseStatus = (medId) => {
    // FIXED: Used JS filter instead of .filtered() string
    const dayLogs = logs.filter(l => 
      l.isValid() &&
      l.medicationId.equals(medId) && 
      l.takenAt >= todayStart && 
      l.takenAt < tomorrowStart
    );

    if (dayLogs.length > 0) {
      const sortedLogs = dayLogs.sort((a, b) => b.takenAt - a.takenAt);
      return sortedLogs[0].status;
    }
    
    const med = allMedications.find(m => m.isValid() && m._id.equals(medId));
    if (!med) return 'pending';

    const reminder = new Date(med.reminderTime);
    reminder.setFullYear(todayStart.getFullYear(), todayStart.getMonth(), todayStart.getDate());
    return now > reminder ? 'missed' : 'pending';
  };

  const stats = useMemo(() => {
    const total = todayMedications.length;
    const takenTodayCount = todayMedications.reduce((count, med) => {
      const isTaken = logs.filter(l => 
        l.isValid() &&
        l.medicationId.equals(med._id) && 
        l.status === "taken" && 
        l.takenAt >= todayStart && 
        l.takenAt < tomorrowStart
      ).length > 0;
      return isTaken ? count + 1 : count;
    }, 0);

    return {
      total,
      taken: takenTodayCount,
      progress: total > 0 ? takenTodayCount / total : 0,
      grandTotal: allMedications.filter(m => m.isValid()).length,
    };
  }, [todayMedications, logs, todayStart, tomorrowStart, allMedications]);

  const nextMed = useMemo(() => {
    const pending = todayMedications.filter(m => getDoseStatus(m._id) === 'pending');
    if (pending.length === 0) return null;
    const sorted = [...pending].sort((a, b) => {
      const ta = new Date(a.reminderTime);
      const tb = new Date(b.reminderTime);
      return (ta.getHours() * 60 + ta.getMinutes()) - (tb.getHours() * 60 + tb.getMinutes());
    });
    const currentMin = now.getHours() * 60 + now.getMinutes();
    return sorted.find(m => (new Date(m.reminderTime).getHours() * 60 + new Date(m.reminderTime).getMinutes()) > currentMin) || sorted[0];
  }, [todayMedications, now]);

  const handleTakeMedication = (med) => {
    if (getDoseStatus(med._id) === 'taken') return;
    try {
      NotificationService.cancelNotification(med._id);

      realm.write(() => {
        const liveMed = realm.objectForPrimaryKey('Medication', med._id);
        if (!liveMed || !liveMed.isValid()) return;

        const currentTime = new Date();
        const scheduledDate = new Date(liveMed.reminderTime);
        scheduledDate.setFullYear(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate());
        
        const delay = Math.round((currentTime - scheduledDate) / 60000);

        realm.create('MedicationLog', {
          _id: new Realm.BSON.UUID(),
          medicationId: liveMed._id,
          medicationName: liveMed.name,
          status: 'taken',
          scheduledAt: scheduledDate,
          takenAt: currentTime,
          delayMinutes: delay,
        });

        if (liveMed.isInventoryEnabled && liveMed.stock > 0) {
          liveMed.stock -= 1;
        }
      });

      if (med.isInventoryEnabled && (med.stock - 1) <= med.reorderLevel) {
        Alert.alert('Low Stock', `Paubos na ang ${med.name}! (${med.stock - 1} left)`);
      }
    } catch (error) {
      console.error("HomeScreen Error:", error);
      Alert.alert('Error', 'Hindi ma-save ang pag-inom ng gamot.');
    }
  };

  const renderRightActions = (med) => (
    <View style={styles.swipeActions}>
      <IconButton
        icon="pencil"
        mode="contained"
        onPress={() => {
          setEditingId(med._id);
          setShowForm(true);
        }}
      />
      <IconButton
        icon="delete"
        mode="contained"
        containerColor={theme.colors.errorContainer}
        onPress={() => {
          Alert.alert('Delete', `Remove ${med.name}?`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => {
                realm.write(() => {
                    const liveMed = realm.objectForPrimaryKey('Medication', med._id);
                    if (liveMed && liveMed.isValid()) realm.delete(liveMed);
                });
            }},
          ]);
        }}
      />
    </View>
  );

  const formatTime = (date) => new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

  if (showForm) {
    return <MedicationForm onBack={() => { setShowForm(false); setEditingId(null); }} medicationId={editingId} />;
  }

  if (viewCabinet) {
    return <MedicineCabinet onBack={() => setViewCabinet(false)} onEditMedication={(id) => { setEditingId(id); setShowForm(true); setViewCabinet(false); }} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <StatusBar barStyle={theme.dark ? "light-content" : "dark-content"} translucent backgroundColor="transparent" />
        
        <View style={[styles.profileHeader, { paddingTop: insets.top + 10 }]}>
          <View>
            <Text variant="labelLarge" style={{ color: theme.colors.secondary, letterSpacing: 1 }}>
              {todayString.toUpperCase()}
            </Text>
            <Text variant="headlineSmall" style={styles.userName}>
              Hi, {mainProfile?.firstName || 'User'}!
            </Text>
          </View>
          <Avatar.Icon size={45} icon="account-heart" />
        </View>

        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: 150 }]} showsVerticalScrollIndicator={false}>
          <View style={styles.summaryRow}>
            <Surface style={[styles.summaryCard, { flex: 1.5 }]} elevation={1}>
              <Text variant="labelMedium">Today's Progress</Text>
              <Text variant="headlineSmall" style={{ fontWeight: 'bold' }}>{Math.round(stats.progress * 100)}%</Text>
              <ProgressBar progress={stats.progress} color={theme.colors.primary} style={{ height: 8, borderRadius: 4, marginTop: 8 }} />
            </Surface>

            <TouchableOpacity style={{ flex: 1 }} onPress={() => setViewCabinet(true)}>
              <Surface style={[styles.summaryCard, { backgroundColor: theme.colors.secondaryContainer }]} elevation={1}>
                <Text variant="labelMedium">Cabinet</Text>
                <Text variant="headlineSmall" style={{ fontWeight: 'bold' }}>{stats.grandTotal}</Text>
                <Text variant="bodySmall">View All</Text>
              </Surface>
            </TouchableOpacity>
          </View>

          {nextMed && (
            <View style={styles.section}>
              <Text variant="titleMedium" style={styles.sectionLabel}>Next Dose</Text>
              <Card style={{ borderRadius: 24, backgroundColor: theme.colors.primary }} mode="contained">
                <Card.Content style={styles.nextCardContent}>
                  <View style={{ flex: 1 }}>
                    <Text variant="labelLarge" style={{ color: theme.colors.onPrimary }}>{formatTime(nextMed.reminderTime)}</Text>
                    <Text variant="headlineSmall" style={{ color: theme.colors.onPrimary, fontWeight: 'bold' }}>{nextMed.name}</Text>
                  </View>
                  <IconButton icon="clock-fast" containerColor={theme.colors.onPrimary} iconColor={theme.colors.primary} />
                </Card.Content>
              </Card>
            </View>
          )}

          <View style={styles.section}>
            <Text variant="titleMedium" style={styles.sectionLabel}>Today's Schedule</Text>
            {todayMedications.length === 0 ? (
              <Surface style={styles.emptyCard} elevation={0}>
                <Text>No medications scheduled.</Text>
                <Button onPress={() => setShowForm(true)}>Add Medicine</Button>
              </Surface>
            ) : (
              [...todayMedications].sort((a,b) => new Date(a.reminderTime) - new Date(b.reminderTime)).map((med) => {
                const status = getDoseStatus(med._id);
                const isTaken = status === 'taken';
                return (
                  <Swipeable key={med.idString} renderRightActions={() => renderRightActions(med)}>
                    <Surface style={[styles.medItem, { opacity: isTaken ? 0.6 : 1 }]} elevation={1}>
                      <View style={styles.timeLine}>
                        <Text variant="titleMedium" style={styles.timeLabel}>{formatTime(med.reminderTime)}</Text>
                      </View>
                      <View style={styles.medDetails}>
                        <Text variant="titleMedium" style={{ textDecorationLine: isTaken ? 'line-through' : 'none' }}>{med.name}</Text>
                        <Text variant="bodySmall">{med.dosage} {med.unit}</Text>
                      </View>
                      <IconButton 
                        icon={isTaken ? 'check-circle' : 'checkbox-blank-circle-outline'} 
                        disabled={isTaken} 
                        onPress={() => handleTakeMedication(med)} 
                      />
                    </Surface>
                  </Swipeable>
                );
              })
            )}
          </View>
        </ScrollView>

        <FAB icon="plus" label="New Medicine" extended style={[styles.fab, { bottom: insets.bottom + 16 }]} onPress={() => setShowForm(true)} />
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  profileHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 15 },
  userName: { fontWeight: 'bold' },
  scrollContent: { paddingHorizontal: 20 },
  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 25 },
  summaryCard: { padding: 16, borderRadius: 24, gap: 4 },
  section: { marginBottom: 25 },
  sectionLabel: { marginBottom: 12, fontWeight: 'bold', opacity: 0.8 },
  nextCardContent: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  medItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 20, marginBottom: 10, borderWidth: 1, borderColor: '#eee' },
  timeLine: { width: 85 },
  timeLabel: { fontWeight: 'bold' },
  medDetails: { flex: 1 },
  emptyCard: { padding: 30, alignItems: 'center', borderRadius: 24 },
  swipeActions: { flexDirection: 'row', alignItems: 'center', paddingLeft: 10 },
  fab: { position: 'absolute', right: 20, borderRadius: 16 }
});
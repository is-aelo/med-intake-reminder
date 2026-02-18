// src/screens/HomeScreen.js
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
    return profiles.filtered('isMain == true')[0] || profiles[0];
  }, [profiles]);

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrowStart = new Date(todayStart.getTime() + 86400000);

  const todayString = now.toLocaleDateString('en-PH', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  // Logic to filter today's medications
  const todayMedications = useMemo(() => {
    return allMedications.filter(med => {
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
  }, [allMedications, todayStart]);

  const getDoseStatus = (med) => {
    const dayLogs = logs.filtered(
      'medicationId == $0 AND takenAt >= $1 AND takenAt < $2',
      med._id,
      todayStart,
      tomorrowStart
    );
    if (dayLogs.length > 0) return dayLogs.sorted('takenAt', true)[0].status;
    const reminder = new Date(med.reminderTime);
    reminder.setFullYear(todayStart.getFullYear(), todayStart.getMonth(), todayStart.getDate());
    return now > reminder ? 'missed' : 'pending';
  };

  const stats = useMemo(() => {
    const total = todayMedications.length;
    const takenTodayCount = todayMedications.reduce((count, med) => {
      const isTaken = logs.filtered(
        'medicationId == $0 AND status == "taken" AND takenAt >= $1 AND takenAt < $2',
        med._id,
        todayStart,
        tomorrowStart
      ).length > 0;
      return isTaken ? count + 1 : count;
    }, 0);

    return {
      total,
      taken: takenTodayCount,
      progress: total > 0 ? takenTodayCount / total : 0,
      grandTotal: allMedications.length,
    };
  }, [todayMedications, logs, todayStart, tomorrowStart, allMedications]);

  const nextMed = useMemo(() => {
    const pending = todayMedications.filter(m => getDoseStatus(m) === 'pending');
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
    if (getDoseStatus(med) === 'taken') return;
    try {
      // 1. Cancel the notification banner if it exists
      NotificationService.cancelNotification(med._id);

      // 2. Log the medication as taken
      realm.write(() => {
        const currentTime = new Date();
        const scheduledDate = new Date(med.reminderTime);
        scheduledDate.setFullYear(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate());
        
        const delay = Math.round((currentTime - scheduledDate) / 60000);

        realm.create('MedicationLog', {
          _id: new Realm.BSON.UUID(),
          medicationId: med._id,
          medicationName: med.name,
          status: 'taken',
          scheduledAt: scheduledDate,
          takenAt: currentTime,
          delayMinutes: delay,
        });

        if (med.isInventoryEnabled && med.stock > 0) {
          med.stock -= 1;
        }
      });

      if (med.isInventoryEnabled && med.stock <= med.reorderLevel) {
        Alert.alert('Low Stock', `Paubos na ang ${med.name}! (${med.stock} left)`);
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
        containerColor={theme.colors.secondaryContainer}
        iconColor={theme.colors.onSecondaryContainer}
        onPress={() => {
          setEditingId(med._id);
          setShowForm(true);
        }}
      />
      <IconButton
        icon="delete"
        mode="contained"
        containerColor={theme.colors.errorContainer}
        iconColor={theme.colors.onErrorContainer}
        onPress={() => {
          Alert.alert('Delete', `Remove ${med.name}?`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => realm.write(() => realm.delete(med)) },
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
    return (
      <MedicineCabinet 
        onBack={() => setViewCabinet(false)} 
        onEditMedication={(id) => {
          setEditingId(id);
          setShowForm(true);
          setViewCabinet(false);
        }}
      />
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <StatusBar barStyle={theme.dark ? "light-content" : "dark-content"} translucent backgroundColor="transparent" />
        
        <View style={[styles.profileHeader, { paddingTop: insets.top + 10 }]}>
          <View>
            <Text variant="labelLarge" style={{ color: theme.colors.secondary, letterSpacing: 1, fontFamily: 'Geist-Bold' }}>
              {todayString.toUpperCase()}
            </Text>
            <Text variant="headlineSmall" style={[styles.userName, { color: theme.colors.onSurface, fontFamily: 'Geist-Bold' }]}>
              Hi, {mainProfile?.firstName || 'User'}!
            </Text>
          </View>
          <Avatar.Icon
            size={45}
            icon="account-heart"
            style={{ backgroundColor: theme.colors.primaryContainer }}
            color={theme.colors.primary}
          />
        </View>

        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 150 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.summaryRow}>
            <Surface style={[styles.summaryCard, { flex: 1.5, backgroundColor: theme.colors.elevation.level1 }]} elevation={1}>
              <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'Geist-Medium' }}>Today's Progress</Text>
              <Text variant="headlineSmall" style={{ fontWeight: 'bold', color: theme.colors.onSurface, fontFamily: 'Geist-Bold' }}>
                {Math.round(stats.progress * 100)}%
              </Text>
              <ProgressBar
                progress={stats.progress}
                color={theme.colors.primary}
                style={{ height: 8, borderRadius: 4, marginTop: 8 }}
              />
            </Surface>

            <TouchableOpacity style={{ flex: 1 }} onPress={() => setViewCabinet(true)}>
              <Surface
                style={[styles.summaryCard, { backgroundColor: theme.colors.secondaryContainer }]}
                elevation={1}
              >
                <Text variant="labelMedium" style={{ color: theme.colors.onSecondaryContainer, opacity: 0.7, fontFamily: 'Geist-Medium' }}>Cabinet</Text>
                <Text variant="headlineSmall" style={{ fontWeight: 'bold', color: theme.colors.onSecondaryContainer, fontFamily: 'Geist-Bold' }}>
                  {stats.grandTotal}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSecondaryContainer, fontFamily: 'Geist-Regular' }}>View All</Text>
              </Surface>
            </TouchableOpacity>
          </View>

          {nextMed && (
            <View style={styles.section}>
              <Text variant="titleMedium" style={[styles.sectionLabel, { color: theme.colors.onSurface, fontFamily: 'Geist-SemiBold' }]}>Next Dose</Text>
              <Card style={{ borderRadius: 24, backgroundColor: theme.colors.primary }} mode="contained">
                <Card.Content style={styles.nextCardContent}>
                  <View style={{ flex: 1 }}>
                    <Text variant="labelLarge" style={{ color: theme.colors.onPrimary, opacity: 0.8, fontFamily: 'Geist-Bold' }}>
                      {formatTime(nextMed.reminderTime)}
                    </Text>
                    <Text variant="headlineSmall" style={{ color: theme.colors.onPrimary, fontWeight: 'bold', fontFamily: 'Geist-Bold' }}>
                      {nextMed.name}
                    </Text>
                    <Text variant="bodyMedium" style={{ color: theme.colors.onPrimary, fontFamily: 'Geist-Regular' }}>
                      {nextMed.dosage} {nextMed.unit} • {nextMed.category}
                    </Text>
                  </View>
                  <IconButton icon="clock-fast" containerColor={theme.colors.onPrimary} iconColor={theme.colors.primary} size={28} />
                </Card.Content>
              </Card>
            </View>
          )}

          <View style={styles.section}>
            <Text variant="titleMedium" style={[styles.sectionLabel, { color: theme.colors.onSurface, fontFamily: 'Geist-SemiBold' }]}>Today's Schedule</Text>

            {todayMedications.length === 0 ? (
              <Surface style={[styles.emptyCard, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outline }]} elevation={0}>
                <IconButton icon="pill-off" size={40} style={{ opacity: 0.5 }} iconColor={theme.colors.onSurfaceVariant} />
                <Text style={[styles.emptyMsg, { color: theme.colors.onSurfaceVariant, fontFamily: 'Geist-Regular' }]}>No medications scheduled.</Text>
                <Button mode="text" onPress={() => setShowForm(true)} textColor={theme.colors.primary}>Add Medicine</Button>
              </Surface>
            ) : (
              [...todayMedications]
                .sort((a, b) => {
                  const ta = new Date(a.reminderTime);
                  const tb = new Date(b.reminderTime);
                  return (ta.getHours() * 60 + ta.getMinutes()) - (tb.getHours() * 60 + tb.getMinutes());
                })
                .map((med) => {
                  const status = getDoseStatus(med);
                  const isTaken = status === 'taken';
                  let icon = isTaken ? 'check-circle' : (status === 'missed' ? 'alert-circle' : 'checkbox-blank-circle-outline');
                  let iconColor = isTaken ? theme.colors.primary : (status === 'missed' ? theme.colors.error : theme.colors.primary);

                  return (
                    <Swipeable key={med._id.toHexString()} renderRightActions={() => renderRightActions(med)}>
                      <Surface 
                        style={[styles.medItem, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant, opacity: isTaken ? 0.7 : 1 }]} 
                        elevation={1}
                      >
                        <View style={styles.timeLine}>
                          <Text variant="titleMedium" style={[styles.timeLabel, { color: theme.colors.onSurfaceVariant, fontFamily: 'Geist-Bold' }]}>{formatTime(med.reminderTime)}</Text>
                        </View>
                        <View style={styles.medDetails}>
                          <Text variant="titleMedium" style={[styles.medNameText, { color: theme.colors.onSurface, textDecorationLine: isTaken ? 'line-through' : 'none', fontFamily: 'Geist-SemiBold' }]}>{med.name}</Text>
                          <Text variant="bodySmall" style={{ color: theme.colors.secondary, fontFamily: 'Geist-Regular' }}>{med.dosage} {med.unit} • {med.isInventoryEnabled ? `${med.stock} left` : med.category}</Text>
                        </View>
                        <IconButton icon={icon} iconColor={iconColor} size={28} disabled={isTaken} onPress={() => handleTakeMedication(med)} />
                      </Surface>
                    </Swipeable>
                  );
                })
            )}
          </View>
        </ScrollView>

        <FAB
          icon="plus"
          label="New Medicine"
          extended
          style={[styles.fab, { backgroundColor: theme.colors.primary, bottom: insets.bottom + 16 }]}
          color={theme.colors.onPrimary}
          onPress={() => { setEditingId(null); setShowForm(true); }}
        />
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
  medItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 20, marginBottom: 10, borderWidth: 1 },
  timeLine: { width: 85 },
  timeLabel: { fontWeight: 'bold' },
  medDetails: { flex: 1 },
  medNameText: { fontWeight: 'bold' },
  emptyCard: { padding: 30, alignItems: 'center', borderRadius: 24, borderStyle: 'dashed', borderWidth: 1 },
  emptyMsg: { textAlign: 'center', marginBottom: 10 },
  swipeActions: { flexDirection: 'row', alignItems: 'center', paddingLeft: 10, gap: 4 },
  fab: { position: 'absolute', right: 20, borderRadius: 16 }
});
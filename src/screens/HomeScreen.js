// src/screens/HomeScreen.js
import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import {
  Text,
  FAB,
  useTheme,
  Card,
  IconButton,
  Surface,
  Avatar,
  ProgressBar,
  Button,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Swipeable, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useRealm, useQuery } from '@realm/react';
import Realm from 'realm';

// Realm Models & Constants
import { Medication, Profile, MedicationLog, Frequency, MedicationStatus } from '../models/Schemas';

// Services
import NotificationService from '../services/NotificationService';

// Screens
import MedicationForm from './MedicationForm';
import MedicineCabinet from './MedicineCabinet';

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

const formatTime = (hour, minute) => {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
};

/**
 * Returns the earliest Schedule slot for today as a { hour, minute } object,
 * or null if the medication has no active schedules.
 */
const getEarliestSchedule = (medication) => {
  if (!medication.schedules || medication.schedules.length === 0) return null;
  return medication.schedules
    .filter((s) => s.isActive)
    .slice()
    .sort((a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute))[0] ?? null;
};

/**
 * Returns the next upcoming Schedule slot relative to now,
 * or falls back to the earliest slot if all have passed.
 */
const getNextScheduleSlot = (medication) => {
  if (!medication.schedules || medication.schedules.length === 0) return null;

  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  const active = medication.schedules
    .filter((s) => s.isActive)
    .slice()
    .sort((a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute));

  return active.find((s) => s.hour * 60 + s.minute > nowMinutes) ?? active[0] ?? null;
};

/**
 * Checks whether a medication is scheduled for today based on
 * its frequency, startDate, endDate, and intervalHours.
 */
const isMedicationScheduledToday = (med, todayStart) => {
  if (!med.isActive || !med.isValid()) return false;

  const startDay = new Date(med.startDate);
  startDay.setHours(0, 0, 0, 0);

  if (startDay > todayStart) return false;

  // Check endDate (non-permanent medications)
  if (!med.isPermanent && med.endDate) {
    const endDay = new Date(med.endDate);
    endDay.setHours(23, 59, 59, 999);
    if (todayStart > endDay) return false;
  }

  switch (med.frequency) {
    case Frequency.DAILY:
      return true;

    case Frequency.SPECIFIC_DAYS: {
      const intervalDays = med.intervalHours
        ? Math.round(med.intervalHours / 24)
        : parseInt(med.intervalValue) || 1;
      const diffDays = Math.floor(
        (todayStart.getTime() - startDay.getTime()) / 86400000,
      );
      return diffDays % intervalDays === 0;
    }

    case Frequency.EVERY_X_HOURS:
      // Always show for today — the exact fire time is handled by Notifee
      return true;

    case Frequency.AS_NEEDED:
      return true;

    default:
      return true;
  }
};

// ─────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────

export default function HomeScreen() {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [viewCabinet, setViewCabinet] = useState(false);

  const realm = useRealm();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const allMedications = useQuery(Medication);
  const profiles = useQuery(Profile);
  const logs = useQuery(MedicationLog);

  const now = new Date();
  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const tomorrowStart = useMemo(
    () => new Date(todayStart.getTime() + 86400000),
    [todayStart],
  );

  const todayString = now.toLocaleDateString('en-PH', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  const mainProfile = useMemo(
    () => profiles.find((p) => p.isMain === true) ?? profiles[0],
    [profiles],
  );

  // ── TODAY'S MEDICATIONS ─────────────────────

  const todayMedications = useMemo(() => {
    return allMedications
      .filter((med) => isMedicationScheduledToday(med, todayStart))
      .map((med) => ({
        // Snapshot plain values off the Realm object for safe use in render
        _id: med._id,
        idString: med._id.toHexString(),
        name: med.name,
        dosage: med.dosage,
        unit: med.unit,
        category: med.category,
        frequency: med.frequency,
        intervalHours: med.intervalHours,
        isInventoryEnabled: med.isInventoryEnabled,
        stock: med.stock,
        reorderLevel: med.reorderLevel,
        nextOccurrence: med.nextOccurrence ? new Date(med.nextOccurrence) : null,
        // Earliest schedule slot for display
        scheduleSlot: getEarliestSchedule(med),
        // All active schedule slots for multi-dose display
        schedules: med.schedules
          .filter((s) => s.isActive)
          .map((s) => ({ hour: s.hour, minute: s.minute, notificationId: s.notificationId })),
      }));
  }, [allMedications, todayStart]);

  // ── DOSE STATUS ─────────────────────────────

  /**
   * Returns the status of a dose for today.
   * Checks scheduledAt (not takenAt, since takenAt is nullable for skipped/missed).
   */
  const getDoseStatus = useCallback(
    (medId, scheduleHour, scheduleMinute) => {
      // Check if there's a log for this specific dose slot today
      const slotLogs = logs.filter((l) => {
        if (!l.isValid() || !l.medicationId.equals(medId)) return false;
        const scheduled = new Date(l.scheduledAt);
        return (
          scheduled >= todayStart &&
          scheduled < tomorrowStart &&
          scheduled.getHours() === scheduleHour &&
          scheduled.getMinutes() === scheduleMinute
        );
      });

      if (slotLogs.length > 0) {
        // Return the most recent status for this slot
        return slotLogs.sort((a, b) => new Date(b.scheduledAt) - new Date(a.scheduledAt))[0].status;
      }

      // No log yet — determine if it's pending or missed
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      const slotMinutes = scheduleHour * 60 + scheduleMinute;
      return slotMinutes < nowMinutes ? MedicationStatus.MISSED : 'pending';
    },
    [logs, todayStart, tomorrowStart, now],
  );

  // ── STATS ───────────────────────────────────

  const stats = useMemo(() => {
    const total = todayMedications.reduce((acc, med) => acc + med.schedules.length, 0);

    const taken = todayMedications.reduce((acc, med) => {
      const takenSlots = med.schedules.filter((s) => {
        const slotLogs = logs.filter(
          (l) =>
            l.isValid() &&
            l.medicationId.equals(med._id) &&
            l.status === MedicationStatus.TAKEN &&
            new Date(l.scheduledAt) >= todayStart &&
            new Date(l.scheduledAt) < tomorrowStart &&
            new Date(l.scheduledAt).getHours() === s.hour &&
            new Date(l.scheduledAt).getMinutes() === s.minute,
        );
        return slotLogs.length > 0;
      });
      return acc + takenSlots.length;
    }, 0);

    return {
      total,
      taken,
      progress: total > 0 ? taken / total : 0,
      grandTotal: allMedications.filter((m) => m.isValid()).length,
    };
  }, [todayMedications, logs, todayStart, tomorrowStart, allMedications]);

  // ── NEXT DOSE ───────────────────────────────

  const nextMed = useMemo(() => {
    // Prefer nextOccurrence stored by NotificationService
    const withNext = todayMedications
      .filter((m) => m.nextOccurrence && m.nextOccurrence > now)
      .sort((a, b) => a.nextOccurrence - b.nextOccurrence);

    if (withNext.length > 0) return withNext[0];

    // Fallback: find the next pending schedule slot across all today's meds
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const pending = todayMedications.flatMap((med) =>
      med.schedules
        .filter((s) => {
          const status = getDoseStatus(med._id, s.hour, s.minute);
          return status === 'pending';
        })
        .map((s) => ({ ...med, slotHour: s.hour, slotMinute: s.minute })),
    );

    pending.sort(
      (a, b) => a.slotHour * 60 + a.slotMinute - (b.slotHour * 60 + b.slotMinute),
    );

    return (
      pending.find((m) => m.slotHour * 60 + m.slotMinute > nowMinutes) ?? pending[0] ?? null
    );
  }, [todayMedications, now, getDoseStatus]);

  // ── TAKE MEDICATION ─────────────────────────

  const handleTakeMedication = useCallback(
    async (med, scheduleHour, scheduleMinute) => {
      if (getDoseStatus(med._id, scheduleHour, scheduleMinute) === MedicationStatus.TAKEN) return;

      try {
        const now = new Date();
        const scheduledAt = new Date(todayStart);
        scheduledAt.setHours(scheduleHour, scheduleMinute, 0, 0);
        const delayMinutes = Math.max(0, Math.round((now - scheduledAt) / 60000));

        realm.write(() => {
          const liveMed = realm.objectForPrimaryKey('Medication', med._id);
          if (!liveMed?.isValid()) return;

          realm.create('MedicationLog', {
            _id: new Realm.BSON.UUID(),
            medicationId: liveMed._id,
            profileId: mainProfile?._id ?? null,
            medicationName: liveMed.name,
            dosageSnapshot: `${liveMed.dosage} ${liveMed.unit}`,
            status: MedicationStatus.TAKEN,
            scheduledAt,
            takenAt: now,
            delayMinutes,
            note: null,
          });

          if (liveMed.isInventoryEnabled && liveMed.stock > 0) {
            liveMed.stock -= 1;
          }

          liveMed.nextOccurrence = NotificationService.computeNextOccurrence(liveMed);
          liveMed.updatedAt = now;
        });

        // Cancel just this slot's notification
        const slot = med.schedules.find(
          (s) => s.hour === scheduleHour && s.minute === scheduleMinute,
        );
        if (slot?.notificationId) {
          await NotificationService.cancelNotification(slot.notificationId);
        }

        // Warn if inventory is low
        if (med.isInventoryEnabled && med.stock - 1 <= med.reorderLevel) {
          Alert.alert(
            '⚠️ Low Stock',
            `${med.name} is running low! Only ${med.stock - 1} left.`,
          );
        }
      } catch (error) {
        console.error('[HomeScreen] handleTakeMedication error:', error);
        Alert.alert('Error', 'Could not save medication log. Please try again.');
      }
    },
    [realm, todayStart, mainProfile, getDoseStatus],
  );

  // ── DELETE MEDICATION ───────────────────────

  const handleDelete = useCallback(
    async (med) => {
      Alert.alert('Delete Medication', `Remove ${med.name}?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Cancel all Notifee alarms for this medication first
              const liveMed = realm.objectForPrimaryKey('Medication', med._id);
              if (liveMed?.isValid()) {
                await NotificationService.cancelMedicationAlarms(liveMed);
              }

              realm.write(() => {
                const toDelete = realm.objectForPrimaryKey('Medication', med._id);
                if (toDelete?.isValid()) realm.delete(toDelete);
              });
            } catch (e) {
              console.error('[HomeScreen] handleDelete error:', e);
            }
          },
        },
      ]);
    },
    [realm],
  );

  // ── SWIPE ACTIONS ───────────────────────────

  const renderRightActions = useCallback(
    (med) => (
      <View style={styles.swipeActions}>
        <IconButton
          icon="pencil"
          mode="contained"
          onPress={() => {
            setEditingId(med.idString);
            setShowForm(true);
          }}
        />
        <IconButton
          icon="delete"
          mode="contained"
          containerColor={theme.colors.errorContainer}
          onPress={() => handleDelete(med)}
        />
      </View>
    ),
    [theme, handleDelete],
  );

  // ── NAVIGATION GUARDS ───────────────────────

  if (showForm) {
    return (
      <MedicationForm
        onBack={() => { setShowForm(false); setEditingId(null); }}
        medicationId={editingId}
      />
    );
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

  // ── RENDER ──────────────────────────────────

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <StatusBar
          barStyle={theme.dark ? 'light-content' : 'dark-content'}
          translucent
          backgroundColor="transparent"
        />

        {/* Header */}
        <View style={[styles.profileHeader, { paddingTop: insets.top + 10 }]}>
          <View>
            <Text variant="labelLarge" style={{ color: theme.colors.secondary, letterSpacing: 1 }}>
              {todayString.toUpperCase()}
            </Text>
            <Text variant="headlineSmall" style={styles.userName}>
              Hi, {mainProfile?.firstName ?? 'User'}!
            </Text>
          </View>
          <Avatar.Icon size={45} icon="account-heart" />
        </View>

        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 150 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Stats Row */}
          <View style={styles.summaryRow}>
            <Surface style={[styles.summaryCard, { flex: 1.5 }]} elevation={1}>
              <Text variant="labelMedium">Today's Progress</Text>
              <Text variant="headlineSmall" style={{ fontWeight: 'bold' }}>
                {stats.taken}/{stats.total}
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
                <Text variant="labelMedium">Cabinet</Text>
                <Text variant="headlineSmall" style={{ fontWeight: 'bold' }}>
                  {stats.grandTotal}
                </Text>
                <Text variant="bodySmall">View All</Text>
              </Surface>
            </TouchableOpacity>
          </View>

          {/* Next Dose Banner */}
          {nextMed && (
            <View style={styles.section}>
              <Text variant="titleMedium" style={styles.sectionLabel}>Next Dose</Text>
              <Card
                style={{ borderRadius: 24, backgroundColor: theme.colors.primary }}
                mode="contained"
              >
                <Card.Content style={styles.nextCardContent}>
                  <View style={{ flex: 1 }}>
                    <Text variant="labelLarge" style={{ color: theme.colors.onPrimary }}>
                      {nextMed.nextOccurrence
                        ? nextMed.nextOccurrence.toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true,
                          })
                        : formatTime(nextMed.slotHour ?? nextMed.scheduleSlot?.hour ?? 0,
                                     nextMed.slotMinute ?? nextMed.scheduleSlot?.minute ?? 0)}
                    </Text>
                    <Text
                      variant="headlineSmall"
                      style={{ color: theme.colors.onPrimary, fontWeight: 'bold' }}
                    >
                      {nextMed.name}
                    </Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onPrimary, opacity: 0.8 }}>
                      {nextMed.dosage} {nextMed.unit}
                    </Text>
                  </View>
                  <IconButton
                    icon="clock-fast"
                    containerColor={theme.colors.onPrimary}
                    iconColor={theme.colors.primary}
                  />
                </Card.Content>
              </Card>
            </View>
          )}

          {/* Today's Schedule */}
          <View style={styles.section}>
            <Text variant="titleMedium" style={styles.sectionLabel}>Today's Schedule</Text>

            {todayMedications.length === 0 ? (
              <Surface style={styles.emptyCard} elevation={0}>
                <Text>No medications scheduled for today.</Text>
                <Button onPress={() => setShowForm(true)}>Add Medicine</Button>
              </Surface>
            ) : (
              todayMedications
                .slice()
                .sort((a, b) => {
                  const aMin = a.scheduleSlot ? a.scheduleSlot.hour * 60 + a.scheduleSlot.minute : 0;
                  const bMin = b.scheduleSlot ? b.scheduleSlot.hour * 60 + b.scheduleSlot.minute : 0;
                  return aMin - bMin;
                })
                .map((med) =>
                  // Render one row per schedule slot so multi-dose meds show all times
                  med.schedules.map((slot, slotIndex) => {
                    const status = getDoseStatus(med._id, slot.hour, slot.minute);
                    const isTaken = status === MedicationStatus.TAKEN;
                    const isMissed = status === MedicationStatus.MISSED;

                    return (
                      <Swipeable
                        key={`${med.idString}_${slot.hour}_${slot.minute}`}
                        renderRightActions={() => renderRightActions(med)}
                      >
                        <Surface
                          style={[
                            styles.medItem,
                            {
                              opacity: isTaken ? 0.55 : 1,
                              borderColor: isMissed
                                ? theme.colors.error
                                : theme.colors.outlineVariant,
                            },
                          ]}
                          elevation={1}
                        >
                          {/* Time */}
                          <View style={styles.timeLine}>
                            <Text
                              variant="titleMedium"
                              style={[
                                styles.timeLabel,
                                { color: isMissed ? theme.colors.error : theme.colors.onSurface },
                              ]}
                            >
                              {formatTime(slot.hour, slot.minute)}
                            </Text>
                            {isMissed && (
                              <Text variant="labelSmall" style={{ color: theme.colors.error }}>
                                Missed
                              </Text>
                            )}
                          </View>

                          {/* Med info */}
                          <View style={styles.medDetails}>
                            <Text
                              variant="titleMedium"
                              style={{
                                textDecorationLine: isTaken ? 'line-through' : 'none',
                              }}
                            >
                              {med.name}
                            </Text>
                            <Text variant="bodySmall">
                              {med.dosage} {med.unit}
                            </Text>
                            {/* Show dose count if multiple slots */}
                            {med.schedules.length > 1 && (
                              <Text variant="labelSmall" style={{ color: theme.colors.secondary }}>
                                Dose {slotIndex + 1} of {med.schedules.length}
                              </Text>
                            )}
                          </View>

                          {/* Take button */}
                          <IconButton
                            icon={
                              isTaken
                                ? 'check-circle'
                                : isMissed
                                ? 'alert-circle-outline'
                                : 'checkbox-blank-circle-outline'
                            }
                            iconColor={
                              isTaken
                                ? theme.colors.primary
                                : isMissed
                                ? theme.colors.error
                                : theme.colors.onSurfaceVariant
                            }
                            disabled={isTaken}
                            onPress={() => handleTakeMedication(med, slot.hour, slot.minute)}
                          />
                        </Surface>
                      </Swipeable>
                    );
                  }),
                )
            )}
          </View>
        </ScrollView>

        <FAB
          icon="plus"
          label="New Medicine"
          extended
          style={[styles.fab, { bottom: insets.bottom + 16 }]}
          onPress={() => setShowForm(true)}
        />
      </View>
    </GestureHandlerRootView>
  );
}

// ─────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  profileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  userName: { fontWeight: 'bold' },
  scrollContent: { paddingHorizontal: 20 },
  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 25 },
  summaryCard: { padding: 16, borderRadius: 24, gap: 4 },
  section: { marginBottom: 25 },
  sectionLabel: { marginBottom: 12, fontWeight: 'bold', opacity: 0.8 },
  nextCardContent: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  medItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 20,
    marginBottom: 10,
    borderWidth: 1,
  },
  timeLine: { width: 85 },
  timeLabel: { fontWeight: 'bold' },
  medDetails: { flex: 1 },
  emptyCard: { padding: 30, alignItems: 'center', borderRadius: 24 },
  swipeActions: { flexDirection: 'row', alignItems: 'center', paddingLeft: 10 },
  fab: { position: 'absolute', right: 20, borderRadius: 16 },
});
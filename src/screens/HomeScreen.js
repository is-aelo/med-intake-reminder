// src/screens/HomeScreen.js
import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  StatusBar,
  LayoutAnimation,
  Platform,
  UIManager,
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
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Realm Models & Constants
import { Medication, Profile, MedicationLog, Frequency, MedicationStatus } from '../models/Schemas';

// Services
import NotificationService from '../services/NotificationService';

// Screens
import MedicationForm from './MedicationForm';
import MedicineCabinet from './MedicineCabinet';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

const formatTime = (hour, minute) => {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
};

/**
 * Checks whether a medication is scheduled for today based on
 * frequency, startDate, endDate, and intervalValue.
 *
 * Key rules:
 * - DAILY / EVERY_X_HOURS / AS_NEEDED → always show if within date range
 * - SPECIFIC_DAYS → only show on days that match the interval cadence from startDate
 */
const isMedicationScheduledToday = (med, todayStart) => {
  if (!med.isActive || !med.isValid()) return false;

  const startDay = new Date(med.startDate);
  startDay.setHours(0, 0, 0, 0);

  // Not started yet
  if (startDay > todayStart) return false;

  // Expired course — endDate is inclusive (set to end of day in computeEndDate)
  if (!med.isPermanent && med.endDate) {
    const endDay = new Date(med.endDate);
    endDay.setHours(23, 59, 59, 999);
    if (todayStart > endDay) return false;
  }

  switch (med.frequency) {
    case Frequency.DAILY:
    case Frequency.EVERY_X_HOURS:
    case Frequency.AS_NEEDED:
      return true;

    case Frequency.SPECIFIC_DAYS: {
      // Use intervalValue (days) directly — more reliable than intervalHours / 24
      const intervalDays = parseInt(med.intervalValue) || 1;
      const diffDays = Math.floor(
        (todayStart.getTime() - startDay.getTime()) / 86400000,
      );
      return diffDays % intervalDays === 0;
    }

    default:
      return true;
  }
};

/**
 * Returns the logged status of a specific dose slot for today.
 * Falls back to 'pending' or MISSED based on whether the slot time has passed.
 */
const getDoseStatusForSlot = (logs, medId, scheduleHour, scheduleMinute, todayStart, tomorrowStart) => {
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
    return slotLogs.sort((a, b) => new Date(b.scheduledAt) - new Date(a.scheduledAt))[0].status;
  }

  // No log — derive status from current time
  const now = new Date();
  const slotMinutes = scheduleHour * 60 + scheduleMinute;
  const nowMinutes  = now.getHours() * 60 + now.getMinutes();
  return slotMinutes < nowMinutes ? MedicationStatus.MISSED : 'pending';
};

// ─────────────────────────────────────────────
// COLLAPSIBLE MED CARD
// ─────────────────────────────────────────────

const MedCard = ({ med, logs, todayStart, tomorrowStart, onTake, onEdit, onDelete, theme }) => {
  const [expanded, setExpanded] = useState(false);

  // Sort slots chronologically
  const slots = med.schedules
    .slice()
    .sort((a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute));

  const slotsWithStatus = slots.map((slot) => ({
    ...slot,
    status: getDoseStatusForSlot(logs, med._id, slot.hour, slot.minute, todayStart, tomorrowStart),
  }));

  // Compute `now` fresh per render so it doesn't go stale
  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();

  // Next upcoming pending slot
  const nextSlot =
    slotsWithStatus.find(
      (s) => s.status === 'pending' && s.hour * 60 + s.minute > nowMinutes,
    ) ??
    slotsWithStatus.find((s) => s.status === 'pending') ??
    slotsWithStatus[0];

  const takenCount  = slotsWithStatus.filter((s) => s.status === MedicationStatus.TAKEN).length;
  const missedCount = slotsWithStatus.filter((s) => s.status === MedicationStatus.MISSED).length;
  const allTaken    = takenCount === slotsWithStatus.length;

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => !prev);
  };

  // ── Status pill ──────────────────────────────
  const getStatusChip = () => {
    if (allTaken)
      return { label: 'All done', icon: 'check-circle', color: theme.colors.primary, bg: theme.colors.primaryContainer };
    if (missedCount > 0)
      return { label: `${missedCount} missed`, icon: 'alert-circle', color: theme.colors.error, bg: theme.colors.errorContainer ?? theme.colors.error + '20' };
    if (takenCount > 0)
      return { label: `${takenCount}/${slotsWithStatus.length} taken`, icon: 'check-circle-outline', color: theme.colors.primary, bg: theme.colors.primaryContainer };
    return null;
  };

  const statusChip = getStatusChip();

  // ── Per-slot take button ─────────────────────
  const SlotIcon = ({ slot }) => {
    const isTaken  = slot.status === MedicationStatus.TAKEN;
    const isMissed = slot.status === MedicationStatus.MISSED;
    return (
      <IconButton
        icon={isTaken ? 'check-circle' : isMissed ? 'alert-circle-outline' : 'checkbox-blank-circle-outline'}
        iconColor={isTaken ? theme.colors.primary : isMissed ? theme.colors.error : theme.colors.onSurfaceVariant}
        size={22}
        disabled={isTaken}
        onPress={() => !isTaken && onTake(med, slot.hour, slot.minute)}
      />
    );
  };

  return (
    <Swipeable
      renderRightActions={() => (
        <View style={styles.swipeActions}>
          <IconButton icon="pencil" mode="contained" onPress={() => onEdit(med.idString)} />
          <IconButton
            icon="delete"
            mode="contained"
            containerColor={theme.colors.errorContainer ?? theme.colors.error + '20'}
            onPress={() => onDelete(med)}
          />
        </View>
      )}
    >
      <Surface
        style={[
          styles.medCard,
          {
            backgroundColor: theme.colors.surface,
            borderColor: allTaken
              ? theme.colors.primaryContainer
              : missedCount > 0
              ? theme.colors.error + '33'
              : theme.colors.outlineVariant,
            opacity: allTaken ? 0.7 : 1,
          },
        ]}
        elevation={1}
      >
        {/* ── Collapsed header (always visible) ── */}
        <TouchableOpacity onPress={toggleExpand} activeOpacity={0.7} style={styles.cardHeader}>
          <View style={[styles.categoryDot, { backgroundColor: theme.colors.primaryContainer }]}>
            <MaterialCommunityIcons
              name={allTaken ? 'check' : 'pill'}
              size={16}
              color={theme.colors.primary}
            />
          </View>

          <View style={styles.cardTitleBlock}>
            <Text
              variant="titleMedium"
              style={[styles.medName, {
                color: theme.colors.onSurface,
                textDecorationLine: allTaken ? 'line-through' : 'none',
              }]}
              numberOfLines={1}
            >
              {med.name}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {med.dosage} {med.unit}
              {nextSlot && !allTaken
                ? `  ·  Next: ${formatTime(nextSlot.hour, nextSlot.minute)}`
                : ''}
            </Text>
          </View>

          <View style={styles.cardRight}>
            {statusChip && (
              <View style={[styles.statusPill, { backgroundColor: statusChip.bg }]}>
                <MaterialCommunityIcons name={statusChip.icon} size={11} color={statusChip.color} />
                <Text style={[styles.statusPillText, { color: statusChip.color }]}>
                  {statusChip.label}
                </Text>
              </View>
            )}
            <MaterialCommunityIcons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={theme.colors.onSurfaceVariant}
            />
          </View>
        </TouchableOpacity>

        {/* ── Expanded slot list ── */}
        {expanded && (
          <View style={[styles.slotList, { borderTopColor: theme.colors.outlineVariant }]}>
            {slotsWithStatus.map((slot, i) => {
              const isTaken  = slot.status === MedicationStatus.TAKEN;
              const isMissed = slot.status === MedicationStatus.MISSED;

              return (
                <View
                  key={`${slot.hour}_${slot.minute}`}
                  style={[
                    styles.slotRow,
                    {
                      backgroundColor: isMissed
                        ? theme.colors.error + '10'
                        : isTaken
                        ? theme.colors.primaryContainer + '60'
                        : 'transparent',
                      borderRadius: 12,
                    },
                  ]}
                >
                  <View style={[styles.doseNumWrap, { backgroundColor: theme.colors.surfaceVariant }]}>
                    <Text style={[styles.doseNum, { color: theme.colors.onSurfaceVariant }]}>
                      {i + 1}
                    </Text>
                  </View>

                  <Text
                    variant="bodyMedium"
                    style={[styles.slotTime, {
                      color: isMissed
                        ? theme.colors.error
                        : isTaken
                        ? theme.colors.primary
                        : theme.colors.onSurface,
                      textDecorationLine: isTaken ? 'line-through' : 'none',
                    }]}
                  >
                    {formatTime(slot.hour, slot.minute)}
                  </Text>

                  <Text
                    variant="labelSmall"
                    style={{
                      flex: 1,
                      color: isMissed
                        ? theme.colors.error
                        : isTaken
                        ? theme.colors.primary
                        : theme.colors.onSurfaceVariant,
                    }}
                  >
                    {isTaken ? 'Taken' : isMissed ? 'Missed' : 'Upcoming'}
                  </Text>

                  <SlotIcon slot={slot} />
                </View>
              );
            })}
          </View>
        )}
      </Surface>
    </Swipeable>
  );
};

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────

export default function HomeScreen() {
  const [showForm, setShowForm]       = useState(false);
  const [editingId, setEditingId]     = useState(null);
  const [viewCabinet, setViewCabinet] = useState(false);

  const realm  = useRealm();
  const theme  = useTheme();
  const insets = useSafeAreaInsets();

  const allMedications = useQuery(Medication);
  const profiles       = useQuery(Profile);
  const logs           = useQuery(MedicationLog);

  // ── Day boundaries (stable for the lifetime of this render day) ──
  const todayStart = useMemo(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d;
  }, []);

  const tomorrowStart = useMemo(
    () => new Date(todayStart.getTime() + 86400000),
    [todayStart],
  );

  const todayString = new Date().toLocaleDateString('en-PH', {
    weekday: 'long', month: 'short', day: 'numeric',
  });

  const mainProfile = useMemo(
    () => profiles.find((p) => p.isMain === true) ?? profiles[0],
    [profiles],
  );

  // ── TODAY'S MEDICATIONS ─────────────────────
  // Only medications whose schedule falls on today's calendar date.
  // Schedules stored in Realm already contain only today's slots (daysOffset === 0)
  // — next-day slots are re-derived each day at notification time.

  const todayMedications = useMemo(() => {
    return allMedications
      .filter((med) => isMedicationScheduledToday(med, todayStart))
      .map((med) => ({
        _id:                med._id,
        idString:           med._id.toHexString(),
        name:               med.name,
        dosage:             med.dosage,
        unit:               med.unit,
        category:           med.category,
        frequency:          med.frequency,
        intervalValue:      med.intervalValue,
        intervalHours:      med.intervalHours,
        isInventoryEnabled: med.isInventoryEnabled,
        stock:              med.stock,
        reorderLevel:       med.reorderLevel,
        nextOccurrence:     med.nextOccurrence ? new Date(med.nextOccurrence) : null,
        // Only active schedules — already today-only since we save getTodaySlots()
        schedules: med.schedules
          .filter((s) => s.isActive)
          .map((s) => ({ hour: s.hour, minute: s.minute, notificationId: s.notificationId }))
          .sort((a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute)), // sort chronologically
      }))
      .sort((a, b) => {
        // Sort meds by their earliest slot
        const aMin = a.schedules[0] ? a.schedules[0].hour * 60 + a.schedules[0].minute : 0;
        const bMin = b.schedules[0] ? b.schedules[0].hour * 60 + b.schedules[0].minute : 0;
        return aMin - bMin;
      });
  }, [allMedications, todayStart]);

  // ── STATS ───────────────────────────────────

  const stats = useMemo(() => {
    let total = 0, taken = 0;

    todayMedications.forEach((med) => {
      med.schedules.forEach((s) => {
        total++;
        const status = getDoseStatusForSlot(logs, med._id, s.hour, s.minute, todayStart, tomorrowStart);
        if (status === MedicationStatus.TAKEN) taken++;
      });
    });

    return {
      total,
      taken,
      progress: total > 0 ? taken / total : 0,
      grandTotal: allMedications.filter((m) => m.isValid()).length,
    };
  }, [todayMedications, logs, todayStart, tomorrowStart, allMedications]);

  // ── NEXT DOSE ───────────────────────────────
  // Fresh `nowMinutes` computed inside useMemo so it reflects the actual current time.

  const nextMed = useMemo(() => {
    const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();

    const candidates = todayMedications.flatMap((med) =>
      med.schedules
        .map((s) => ({
          ...med,
          slotHour:   s.hour,
          slotMinute: s.minute,
          status: getDoseStatusForSlot(logs, med._id, s.hour, s.minute, todayStart, tomorrowStart),
        }))
        .filter((s) => s.status === 'pending'),
    );

    candidates.sort((a, b) => a.slotHour * 60 + a.slotMinute - (b.slotHour * 60 + b.slotMinute));

    // Prefer the next upcoming slot; fall back to first pending if all are "past pending"
    return (
      candidates.find((m) => m.slotHour * 60 + m.slotMinute > nowMinutes) ??
      candidates[0] ??
      null
    );
  }, [todayMedications, logs, todayStart, tomorrowStart]);

  // ── TAKE MEDICATION ─────────────────────────

  const handleTakeMedication = useCallback(
    async (med, scheduleHour, scheduleMinute) => {
      const currentStatus = getDoseStatusForSlot(
        logs, med._id, scheduleHour, scheduleMinute, todayStart, tomorrowStart,
      );
      if (currentStatus === MedicationStatus.TAKEN) return;

      try {
        const now = new Date();
        const scheduledAt = new Date(todayStart);
        scheduledAt.setHours(scheduleHour, scheduleMinute, 0, 0);
        const delayMinutes = Math.max(0, Math.round((now - scheduledAt) / 60000));

        realm.write(() => {
          const liveMed = realm.objectForPrimaryKey('Medication', med._id);
          if (!liveMed?.isValid()) return;

          realm.create('MedicationLog', {
            _id:              new Realm.BSON.UUID(),
            medicationId:     liveMed._id,
            profileId:        mainProfile?._id ?? null,
            medicationName:   liveMed.name,
            dosageSnapshot:   `${liveMed.dosage} ${liveMed.unit}`,
            status:           MedicationStatus.TAKEN,
            scheduledAt,
            takenAt:          now,
            delayMinutes,
            note:             null,
          });

          if (liveMed.isInventoryEnabled && liveMed.stock > 0) liveMed.stock -= 1;
          liveMed.nextOccurrence = NotificationService.computeNextOccurrence(liveMed);
          liveMed.updatedAt = now;
        });

        const slot = med.schedules.find(
          (s) => s.hour === scheduleHour && s.minute === scheduleMinute,
        );
        if (slot?.notificationId) {
          await NotificationService.cancelNotification(slot.notificationId);
        }

        if (med.isInventoryEnabled && med.stock - 1 <= med.reorderLevel) {
          Alert.alert('⚠️ Low Stock', `${med.name} is running low! Only ${med.stock - 1} left.`);
        }
      } catch (error) {
        console.error('[HomeScreen] handleTakeMedication error:', error);
        Alert.alert('Error', 'Could not save medication log. Please try again.');
      }
    },
    [realm, todayStart, tomorrowStart, mainProfile, logs],
  );

  // ── DELETE ──────────────────────────────────

  const handleDelete = useCallback(
    async (med) => {
      Alert.alert('Delete Medication', `Remove ${med.name}?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const liveMed = realm.objectForPrimaryKey('Medication', med._id);
              if (liveMed?.isValid()) await NotificationService.cancelMedicationAlarms(liveMed);
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
        onEditMedication={(id) => { setEditingId(id); setShowForm(true); setViewCabinet(false); }}
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

        {/* ── Header ── */}
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
          {/* ── Stats Row ── */}
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
                <Text variant="headlineSmall" style={{ fontWeight: 'bold' }}>{stats.grandTotal}</Text>
                <Text variant="bodySmall">View All</Text>
              </Surface>
            </TouchableOpacity>
          </View>

          {/* ── Next Dose Banner ── */}
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
                      {formatTime(nextMed.slotHour, nextMed.slotMinute)}
                    </Text>
                    <Text variant="headlineSmall" style={{ color: theme.colors.onPrimary, fontWeight: 'bold' }}>
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

          {/* ── Today's Schedule ── */}
          <View style={styles.section}>
            <Text variant="titleMedium" style={styles.sectionLabel}>Today's Schedule</Text>

            {todayMedications.length === 0 ? (
              <Surface style={styles.emptyCard} elevation={0}>
                <Text style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12 }}>
                  No medications scheduled for today.
                </Text>
                <Button onPress={() => setShowForm(true)}>Add Medicine</Button>
              </Surface>
            ) : (
              todayMedications.map((med) => (
                <MedCard
                  key={med.idString}
                  med={med}
                  logs={logs}
                  todayStart={todayStart}
                  tomorrowStart={tomorrowStart}
                  onTake={handleTakeMedication}
                  onEdit={(id) => { setEditingId(id); setShowForm(true); }}
                  onDelete={handleDelete}
                  theme={theme}
                />
              ))
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
  container:       { flex: 1 },
  profileHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 15 },
  userName:        { fontWeight: 'bold' },
  scrollContent:   { paddingHorizontal: 20 },
  summaryRow:      { flexDirection: 'row', gap: 12, marginBottom: 25 },
  summaryCard:     { padding: 16, borderRadius: 24, gap: 4 },
  section:         { marginBottom: 25 },
  sectionLabel:    { marginBottom: 12, fontWeight: 'bold', opacity: 0.8 },
  nextCardContent: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  emptyCard:       { padding: 30, alignItems: 'center', borderRadius: 24 },
  swipeActions:    { flexDirection: 'row', alignItems: 'center', paddingLeft: 10 },
  fab:             { position: 'absolute', right: 20, borderRadius: 16 },

  // ── Med card ──────────────────────────────
  medCard: {
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 10,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  categoryDot: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitleBlock: { flex: 1, gap: 2 },
  medName:        { fontWeight: 'bold' },
  cardRight:      { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusPillText: { fontSize: 11, fontFamily: 'Geist-Medium' },

  // ── Slot rows ─────────────────────────────
  slotList: {
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
  },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    gap: 10,
  },
  doseNumWrap: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doseNum:  { fontSize: 11, fontFamily: 'Geist-Bold' },
  slotTime: { width: 80, fontFamily: 'Geist-Medium' },
});
// src/screens/HomeScreen.js
import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
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
  TouchableRipple,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Swipeable, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useRealm, useQuery } from '@realm/react';
import Realm from 'realm';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Medication, Profile, MedicationLog, Frequency, MedicationStatus } from '../models/Schemas';
import NotificationService from '../services/NotificationService';
import { useMedicationActions } from '../hooks/useMedicationActions';
import { ConfirmationModal } from '../components/ConfirmationModal';
import MedicationForm from './MedicationForm';
import MedicineCabinet from './MedicineCabinet';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const formatTime = (hour, minute) => {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
};

const isMedicationScheduledToday = (med, todayStart) => {
  if (!med.isActive || !med.isValid()) return false;
  const startDay = new Date(med.startDate);
  startDay.setHours(0, 0, 0, 0);
  if (startDay > todayStart) return false;
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
      const intervalDays = parseInt(med.intervalValue) || 1;
      const diffDays = Math.floor((todayStart.getTime() - startDay.getTime()) / 86400000);
      return diffDays % intervalDays === 0;
    }
    default:
      return true;
  }
};

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
    const latest = slotLogs.sort((a, b) => new Date(b.scheduledAt) - new Date(a.scheduledAt))[0];
    return latest.status;
  }

  const now = new Date();
  const slotMinutes = scheduleHour * 60 + scheduleMinute;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const twoHoursInMinutes = 120;
  if (slotMinutes < (nowMinutes - twoHoursInMinutes)) return MedicationStatus.MISSED;
  
  return 'pending';
};

const MedCard = ({ med, logs, todayStart, tomorrowStart, onTake, onEdit, onDelete, theme }) => {
  const [expanded, setExpanded] = useState(false);

  const slots = med.schedules
    .slice()
    .sort((a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute));

  const slotsWithStatus = slots.map((slot) => ({
    ...slot,
    status: getDoseStatusForSlot(logs, med._id, slot.hour, slot.minute, todayStart, tomorrowStart),
  }));

  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();

  const nextSlot =
    slotsWithStatus.find((s) => s.status === 'pending' && s.hour * 60 + s.minute > nowMinutes) ??
    slotsWithStatus.find((s) => s.status === 'pending') ??
    slotsWithStatus[0];

  const takenCount = slotsWithStatus.filter((s) => s.status === MedicationStatus.TAKEN).length;
  const missedCount = slotsWithStatus.filter((s) => s.status === MedicationStatus.MISSED).length;
  const skippedCount = slotsWithStatus.filter((s) => s.status === MedicationStatus.SKIPPED).length;
  
  const allTaken = takenCount === slotsWithStatus.length;
  const dayFinished = (takenCount + skippedCount + missedCount) === slotsWithStatus.length;

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => !prev);
  };

  const getStatusChip = () => {
    if (allTaken) return { label: 'Completed', icon: 'check-circle', color: theme.colors.primary, bg: theme.colors.primaryContainer };
    if (missedCount > 0 && dayFinished) return { label: 'Missed', icon: 'alert-circle', color: theme.colors.error, bg: theme.colors.errorContainer ?? theme.colors.error + '20' };
    if (skippedCount > 0 && dayFinished) return { label: 'Skipped', icon: 'skip-next-circle', color: theme.colors.secondary, bg: theme.colors.secondaryContainer };
    if (takenCount > 0) return { label: `${takenCount}/${slotsWithStatus.length} taken`, icon: 'check-circle-outline', color: theme.colors.primary, bg: theme.colors.primaryContainer };
    return null;
  };

  const statusChip = getStatusChip();

  const SlotIcon = ({ slot }) => {
    const isTaken = slot.status === MedicationStatus.TAKEN;
    const isMissed = slot.status === MedicationStatus.MISSED;
    const isSkipped = slot.status === MedicationStatus.SKIPPED;
    const isPending = slot.status === 'pending';

    let iconName = 'checkbox-blank-circle-outline';
    let iconColor = theme.colors.onSurfaceVariant;

    if (isTaken) { iconName = 'check-circle'; iconColor = theme.colors.primary; }
    else if (isMissed) { iconName = 'alert-circle-outline'; iconColor = theme.colors.error; }
    else if (isSkipped) { iconName = 'close-circle-outline'; iconColor = theme.colors.secondary; }

    return (
      <IconButton
        icon={iconName}
        iconColor={iconColor}
        size={22}
        disabled={!isPending}
        onPress={() => isPending && onTake(med, slot.hour, slot.minute)}
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
            borderColor: dayFinished ? theme.colors.outlineVariant : theme.colors.outlineVariant,
            opacity: dayFinished && !allTaken ? 0.9 : 1,
          },
        ]}
        elevation={0}
      >
        <TouchableOpacity onPress={toggleExpand} activeOpacity={0.7} style={styles.cardHeader}>
          <View style={[styles.categoryDot, { backgroundColor: theme.colors.surfaceVariant }]}>
            <MaterialCommunityIcons
              name="pill"
              size={18}
              color={theme.colors.onSurfaceVariant}
            />
          </View>

          <View style={styles.cardTitleBlock}>
            <Text variant="titleMedium" style={[styles.medName, { color: theme.colors.onSurface }]} numberOfLines={1}>
              {med.name}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {med.dosage} {med.unit}
              {nextSlot && !dayFinished ? `  ·  Next: ${formatTime(nextSlot.hour, nextSlot.minute)}` : ''}
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

        {expanded && (
          <View style={[styles.slotList, { borderTopColor: theme.colors.outlineVariant }]}>
            {slotsWithStatus.map((slot, i) => {
              const isTaken = slot.status === MedicationStatus.TAKEN;
              const isMissed = slot.status === MedicationStatus.MISSED;
              const isSkipped = slot.status === MedicationStatus.SKIPPED;
              
              let rowBg = 'transparent';
              let statusLabel = 'Upcoming';
              let labelColor = theme.colors.onSurfaceVariant;

              if (isTaken) { 
                rowBg = theme.colors.primaryContainer + '30'; 
                statusLabel = 'Taken'; 
                labelColor = theme.colors.primary; 
              } else if (isMissed) { 
                rowBg = theme.colors.errorContainer + '30'; 
                statusLabel = 'Missed'; 
                labelColor = theme.colors.error; 
              } else if (isSkipped) { 
                rowBg = theme.colors.secondaryContainer + '30'; 
                statusLabel = 'Skipped'; 
                labelColor = theme.colors.secondary; 
              }

              return (
                <View key={`${slot.hour}_${slot.minute}`} style={[styles.slotRow, { backgroundColor: rowBg, borderRadius: 12 }]}>
                  <View style={[styles.doseNumWrap, { backgroundColor: theme.colors.surfaceVariant }]}>
                    <Text style={[styles.doseNum, { color: theme.colors.onSurfaceVariant, fontFamily: 'Geist-Bold' }]}>{i + 1}</Text>
                  </View>
                  <Text variant="bodyMedium" style={[styles.slotTime, { color: labelColor, fontFamily: 'Geist-SemiBold' }]}>
                    {formatTime(slot.hour, slot.minute)}
                  </Text>
                  <Text variant="labelSmall" style={{ flex: 1, color: labelColor, fontFamily: 'Geist-Medium' }}>
                    {statusLabel}
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

export default function HomeScreen() {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [viewCabinet, setViewCabinet] = useState(false);
  const [selectedMed, setSelectedMed] = useState(null);
  const [isDeleteVisible, setIsDeleteVisible] = useState(false);

  const realm = useRealm();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const allMedications = useQuery(Medication);
  const profiles = useQuery(Profile);
  const logs = useQuery(MedicationLog);

  const { deleteMedication, isDeleting } = useMedicationActions(() => {
    setIsDeleteVisible(false);
    setSelectedMed(null);
  });

  const todayStart = useMemo(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d;
  }, []);

  const tomorrowStart = useMemo(() => new Date(todayStart.getTime() + 86400000), [todayStart]);

  const todayString = new Date().toLocaleDateString('en-PH', {
    weekday: 'long', month: 'short', day: 'numeric',
  });

  const mainProfile = useMemo(() => profiles.find((p) => p.isMain === true) ?? profiles[0], [profiles]);

  const todayMedications = useMemo(() => {
    const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();

    return allMedications
      .filter((med) => isMedicationScheduledToday(med, todayStart))
      .map((med) => {
        const schedules = med.schedules
          .filter((s) => s.isActive)
          .map((s) => ({ hour: s.hour, minute: s.minute, notificationId: s.notificationId }));
        
        const pendingSchedules = schedules
          .filter(s => {
            const status = getDoseStatusForSlot(logs, med._id, s.hour, s.minute, todayStart, tomorrowStart);
            return status === 'pending';
          })
          .sort((a, b) => (a.hour * 60 + a.minute) - (b.hour * 60 + b.minute));

        const upcomingDose = pendingSchedules.find(s => (s.hour * 60 + s.minute) >= nowMinutes) 
                            || pendingSchedules[0] 
                            || schedules[0];

        const dayFinished = schedules.every(s => {
          const status = getDoseStatusForSlot(logs, med._id, s.hour, s.minute, todayStart, tomorrowStart);
          return status !== 'pending';
        });

        return {
          _id: med._id,
          idString: med._id.toHexString(),
          name: med.name,
          dosage: med.dosage,
          unit: med.unit,
          schedules,
          sortTime: upcomingDose ? (upcomingDose.hour * 60 + upcomingDose.minute) : 9999,
          dayFinished
        };
      })
      .sort((a, b) => {
        if (a.dayFinished && !b.dayFinished) return 1;
        if (!a.dayFinished && b.dayFinished) return -1;
        return a.sortTime - b.sortTime;
      });
  }, [allMedications, todayStart, logs, tomorrowStart]);

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
      total, taken,
      progress: total > 0 ? taken / total : 0,
      grandTotal: allMedications.filter((m) => m.isValid()).length,
    };
  }, [todayMedications, logs, todayStart, tomorrowStart, allMedications]);

  const handleTakeMedication = useCallback(async (med, scheduleHour, scheduleMinute) => {
    const currentStatus = getDoseStatusForSlot(logs, med._id, scheduleHour, scheduleMinute, todayStart, tomorrowStart);
    if (currentStatus !== 'pending') return;
    try {
      const now = new Date();
      const scheduledAt = new Date(todayStart);
      scheduledAt.setHours(scheduleHour, scheduleMinute, 0, 0);

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
          delayMinutes: Math.max(0, Math.round((now - scheduledAt) / 60000)),
          note: null,
        });
        if (liveMed.isInventoryEnabled && liveMed.stock > 0) liveMed.stock -= 1;
        liveMed.nextOccurrence = NotificationService.computeNextOccurrence(liveMed);
        liveMed.updatedAt = now;
      });

      const slot = med.schedules.find((s) => s.hour === scheduleHour && s.minute === scheduleMinute);
      if (slot?.notificationId) await NotificationService.cancelNotification(slot.notificationId);
    } catch (error) {
      console.error('[HomeScreen] handleTakeMedication error:', error);
    }
  }, [realm, todayStart, mainProfile, logs, tomorrowStart]);

  if (showForm) return <MedicationForm onBack={() => { setShowForm(false); setEditingId(null); }} medicationId={editingId} />;
  if (viewCabinet) return <MedicineCabinet onBack={() => setViewCabinet(false)} onEditMedication={(id) => { setEditingId(id); setShowForm(true); setViewCabinet(false); }} />;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />

        <View style={[styles.profileHeader, { paddingTop: insets.top + 10 }]}>
          <View>
            <Text variant="labelLarge" style={{ color: theme.colors.secondary, letterSpacing: 1, fontFamily: 'Geist-Bold' }}>{todayString.toUpperCase()}</Text>
            <Text variant="headlineSmall" style={[styles.userName, { color: theme.colors.onSurface, fontFamily: 'Geist-Black' }]}>Hi, {mainProfile?.firstName ?? 'eloi'}!</Text>
          </View>
          <Avatar.Icon size={48} icon="account-heart" style={{ backgroundColor: theme.colors.surfaceVariant }} color={theme.colors.primary} />
        </View>

        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: 150 }]} showsVerticalScrollIndicator={false}>
          <View style={styles.summaryRow}>
            <Surface style={[styles.summaryCard, { flex: 1.5, backgroundColor: theme.colors.surface }]} elevation={1}>
              <View style={{ padding: 18 }}>
                <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'Geist-Medium' }}>Today's Progress</Text>
                <Text variant="headlineSmall" style={{ fontFamily: 'Geist-Bold', color: theme.colors.onSurface }}>{stats.taken}/{stats.total}</Text>
                <ProgressBar progress={stats.progress} color={theme.colors.primary} style={{ height: 8, borderRadius: 4, marginTop: 10 }} />
              </View>
            </Surface>

            <View style={{ flex: 1 }}>
              <Surface style={[styles.summaryCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
                <TouchableRipple onPress={() => setViewCabinet(true)} style={{ padding: 18 }} borderless>
                  <View>
                    <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'Geist-Medium' }}>Cabinet</Text>
                    <Text variant="headlineSmall" style={{ fontFamily: 'Geist-Bold', color: theme.colors.onSurface }}>{stats.grandTotal}</Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.primary, fontFamily: 'Geist-Bold' }}>View All</Text>
                  </View>
                </TouchableRipple>
              </Surface>
            </View>
          </View>

          <View style={styles.section}>
            <Text variant="titleMedium" style={[styles.sectionLabel, { color: theme.colors.onSurface }]}>Today's Schedule</Text>
            {todayMedications.length === 0 ? (
              <Surface style={styles.emptyCard} elevation={0}>
                <MaterialCommunityIcons name="pill-off" size={48} color={theme.colors.outline} style={{ marginBottom: 12 }} />
                <Text style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>No medications scheduled for today.</Text>
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
                  onDelete={(m) => { setSelectedMed(m); setIsDeleteVisible(true); }}
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
          style={[styles.fab, { bottom: insets.bottom + 16, backgroundColor: theme.colors.primaryContainer }]} 
          onPress={() => setShowForm(true)} 
          color={theme.colors.primary}
        />

        <ConfirmationModal
          visible={isDeleteVisible}
          title="Delete Medication"
          message={`Are you sure you want to remove ${selectedMed?.name}?`}
          confirmLabel="Delete"
          onConfirm={() => deleteMedication(selectedMed?._id)}
          onDismiss={() => { setIsDeleteVisible(false); setSelectedMed(null); }}
          loading={isDeleting}
          danger
        />
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  profileHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 15 },
  userName: { letterSpacing: -0.5 },
  scrollContent: { paddingHorizontal: 20 },
  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 25 },
  summaryCard: { borderRadius: 20, overflow: 'hidden' },
  section: { marginBottom: 25 },
  sectionLabel: { marginBottom: 12, fontFamily: 'Geist-Bold', opacity: 0.9 },
  emptyCard: { padding: 40, alignItems: 'center', borderRadius: 24, backgroundColor: 'transparent', borderWidth: 1, borderStyle: 'dashed', borderColor: '#ccc' },
  swipeActions: { flexDirection: 'row', alignItems: 'center', paddingLeft: 10 },
  fab: { position: 'absolute', right: 20, borderRadius: 16 },
  medCard: { borderRadius: 24, borderWidth: 1, marginBottom: 12, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  categoryDot: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardTitleBlock: { flex: 1, gap: 2 },
  medName: { fontFamily: 'Geist-Bold', fontSize: 17 },
  cardRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  statusPillText: { fontSize: 11, fontFamily: 'Geist-Bold' },
  slotList: { borderTopWidth: 1, paddingHorizontal: 14, paddingVertical: 10, gap: 6 },
  slotRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 10, gap: 12 },
  doseNumWrap: { width: 26, height: 26, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  doseNum: { fontSize: 12 },
  slotTime: { width: 85, fontSize: 15 },
});
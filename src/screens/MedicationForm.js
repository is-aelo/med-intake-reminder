// src/screens/MedicationForm.js
import React, { useState, useEffect, useMemo } from 'react';
import {
  View, StyleSheet, ScrollView, KeyboardAvoidingView,
  Platform, StatusBar,
} from 'react-native';
import {
  Text, Button, useTheme, IconButton, TouchableRipple,
  SegmentedButtons, Surface, Switch, Chip,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Realm
import { useRealm, useQuery } from '@realm/react';
import Realm from 'realm';
import { Profile, Medication } from '../models/Schemas';

// Service
import NotificationService from '../services/NotificationService';

// Components
import { FormLabel, ModernInput } from '../components/FormInput';
import { SelectionMenu } from '../components/SelectionMenu';
import { TimeSelector, DateSelector } from '../components/TimeSelector';
import { StatusModal } from '../components/StatusModal';
import { ScreenHeader } from '../components/ScreenHeader';

// Constants & Helpers
import {
  UNITS, CATEGORIES, HOURLY_OPTIONS, DEFAULT_TIME, defaultForm,
  slotToDate, generateHourlySlots, getTodaySlots, computeEndDate,
  toFrequencyConstant, fromFrequencyConstant,
  getFilteredDayOptions, getScheduleSummary, formatDate, formatTime, formatSlotLabel,
  validateInventoryLevels, isSlotPassedToday,
} from '../constants/medicationOptions';

// ─────────────────────────────────────────────
// INLINE ERROR
// ─────────────────────────────────────────────

const InlineError = ({ message, theme }) => (
  <View style={styles.inlineErrorRow}>
    <MaterialCommunityIcons name="alert-circle-outline" size={14} color={theme.colors.error} />
    <Text style={[styles.inlineErrorText, { color: theme.colors.error }]}>{message}</Text>
  </View>
);

// ─────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────

export default function MedicationForm({ onBack, medicationId = null }) {
  const theme   = useTheme();
  const realm   = useRealm();
  const profiles = useQuery(Profile);
  const mainProfile = profiles.filtered('isMain == true')[0];
  const medications = useQuery(Medication);

  const existingMed = useMemo(() => {
    if (!medicationId) return null;
    try {
      const targetId =
        typeof medicationId === 'string'
          ? new Realm.BSON.UUID(medicationId)
          : medicationId;
      return medications.filtered('_id == $0', targetId)[0];
    } catch { return null; }
  }, [medicationId, medications]);

  const isEditMode = !!existingMed;

  const [form, setForm]                         = useState(defaultForm);
  const [hourlyStartTime, setHourlyStartTime]   = useState(DEFAULT_TIME);
  const [timePickerValue, setTimePickerValue]   = useState(slotToDate(DEFAULT_TIME));
  const [editingSlotIndex, setEditingSlotIndex] = useState(-1);
  const [timePickerMode, setTimePickerMode]     = useState('slot');
  const [menuVisible, setMenuVisible]           = useState({ unit: false, category: false, interval: false });
  const [pickerVisible, setPickerVisible]       = useState({ time: false, date: false });
  const [modalType, setModalType]               = useState(null);
  const [isSaving, setIsSaving]                 = useState(false);

  // ── Field-level errors (shown inline, not via modal) ──
  const [fieldErrors, setFieldErrors] = useState({});

  const inputThemeProps = {
    cursorColor: theme.colors.primary,
    selectionColor: theme.colors.primaryContainer,
    selectionHandleColor: theme.colors.primary,
  };

  // ── ALL slots in cycle (for preview, includes next-day with daysOffset > 0) ─
  const generatedHourlySlots = useMemo(() => {
    if (form.frequency !== 'hourly') return [];
    return generateHourlySlots(
      hourlyStartTime.hour,
      hourlyStartTime.minute,
      parseInt(form.intervalValue) || 8,
    );
  }, [form.frequency, form.intervalValue, hourlyStartTime]);

  // ── TODAY-only slots (daysOffset === 0, used for saving & summary) ──────────
  const todayHourlySlots = useMemo(
    () => generatedHourlySlots.filter((s) => s.daysOffset === 0),
    [generatedHourlySlots],
  );

  // ── POPULATE FORM IN EDIT MODE ──────────────
  useEffect(() => {
    if (!existingMed) return;
    const freq = fromFrequencyConstant(existingMed.frequency);
    const existingTimes = existingMed.schedules.map((s) => ({ hour: s.hour, minute: s.minute }));

    setForm({
      name:               existingMed.name ?? '',
      dosage:             String(existingMed.dosage ?? ''),
      unit:               existingMed.unit ?? 'mg',
      category:           existingMed.category ?? 'Tablet',
      instructions:       existingMed.instructions ?? '',
      isPermanent:        existingMed.isPermanent ?? true,
      duration:           existingMed.duration ? String(existingMed.duration) : '7',
      frequency:          freq,
      intervalValue:      existingMed.intervalHours ? String(existingMed.intervalHours) : '8',
      startDate:          new Date(existingMed.startDate),
      isInventoryEnabled: existingMed.isInventoryEnabled ?? false,
      stock:              String(existingMed.stock ?? '0'),
      reorderLevel:       String(existingMed.reorderLevel ?? '5'),
      isAdjustable:       existingMed.isAdjustable ?? false,
      times:              existingTimes,
    });

    if (freq === 'hourly' && existingTimes.length > 0) {
      setHourlyStartTime(existingTimes[0]);
    }
  }, [existingMed]);

  // ── FORM HELPERS ────────────────────────────
  const updateForm   = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const clearError   = (key) => setFieldErrors((prev) => { const n = { ...prev }; delete n[key]; return n; });
  const toggleMenu   = (key, isOpen) => setMenuVisible((prev) => ({ ...prev, [key]: isOpen }));
  const togglePicker = (key, isOpen) => setPickerVisible((prev) => ({ ...prev, [key]: isOpen }));

  // ── DURATION ────────────────────────────────
  const handleDurationChange = (val) => {
    updateForm('duration', val);
    const parsed = parseInt(val);
    if (!val || !parsed || parsed < 1) {
      setFieldErrors((prev) => ({ ...prev, duration: 'Minimum is 1 day.' }));
    } else {
      clearError('duration');
    }
  };

  const handleDurationBlur = () => {
    const parsed = parseInt(form.duration);
    if (!parsed || parsed < 1) {
      updateForm('duration', '1');
      clearError('duration'); // snapped to valid, error no longer needed
    }
  };

  // ── INVENTORY ───────────────────────────────
  const handleStockChange = (val) => {
    updateForm('stock', val);
    if (validateInventoryLevels(val, form.reorderLevel)) clearError('stock');
  };

  const handleReorderChange = (val) => {
    updateForm('reorderLevel', val);
    if (validateInventoryLevels(form.stock, val)) clearError('stock');
  };

  // ── TIME PICKER OPENERS ─────────────────────
  const openHourlyStartPicker = () => {
    setTimePickerMode('hourly_start');
    setTimePickerValue(slotToDate(hourlyStartTime));
    togglePicker('time', true);
  };

  const openAddTimePicker = () => {
    setTimePickerMode('slot');
    setEditingSlotIndex(-1);
    setTimePickerValue(slotToDate(DEFAULT_TIME));
    togglePicker('time', true);
  };

  const openEditTimePicker = (index) => {
    setTimePickerMode('slot');
    setEditingSlotIndex(index);
    setTimePickerValue(slotToDate(form.times[index]));
    togglePicker('time', true);
  };

  // ── TIME PICKER CONFIRM ─────────────────────
  const handleTimeConfirm = (date) => {
    if (!date) return;

    if (timePickerMode === 'hourly_start') {
      setHourlyStartTime({ hour: date.getHours(), minute: date.getMinutes() });
      return;
    }

    const slot = { hour: date.getHours(), minute: date.getMinutes() };
    const isDuplicate = form.times.some(
      (t, i) => i !== editingSlotIndex && t.hour === slot.hour && t.minute === slot.minute,
    );
    if (isDuplicate) return;

    if (editingSlotIndex >= 0) {
      const updated = [...form.times];
      updated[editingSlotIndex] = slot;
      updateForm('times', updated);
    } else {
      updateForm('times', [...form.times, slot]);
    }
    setEditingSlotIndex(-1);
  };

  const removeTimeSlot = (index) =>
    updateForm('times', form.times.filter((_, i) => i !== index));

  // ── VALIDATION ──────────────────────────────
  const validate = () => {
    const errors = {};

    // These stay as modals — they block the whole form, not a single field
    if (!form.name.trim() || !form.dosage || parseFloat(form.dosage) <= 0) {
      setModalType('emptyFields'); return false;
    }
    if (form.frequency !== 'hourly' && form.times.length === 0) {
      setModalType('noTimes'); return false;
    }

    // Duration — clamp silently and never block
    if (!form.isPermanent) {
      const parsed = parseInt(form.duration);
      if (!parsed || parsed < 1) updateForm('duration', '1');
    }

    // Inventory — inline error, block save
    if (form.isInventoryEnabled && !validateInventoryLevels(form.stock, form.reorderLevel)) {
      errors.stock = 'Total stock must be greater than the low stock alert.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return false;
    }

    if (!mainProfile) { console.error('[MedicationForm] No main profile found.'); return false; }
    return true;
  };

  // ── SAVE ────────────────────────────────────
  const handleSave = async () => {
    if (!validate()) return;
    setIsSaving(true);

    try {
      const frequencyConstant = toFrequencyConstant(form.frequency);
      const intervalHours     = form.frequency === 'hourly' ? parseInt(form.intervalValue) || 8 : null;
      const endDate           = computeEndDate(form.startDate, form.duration, form.isPermanent);
      const now               = new Date();

      const finalTimes = form.frequency === 'hourly' ? todayHourlySlots : form.times;

      const scheduleData = finalTimes.map((t) => ({
        hour: t.hour, minute: t.minute, notificationId: '', days: [], isActive: true,
      }));

      let savedMedication = null;

      realm.write(() => {
        const medData = {
          name:               form.name.trim(),
          dosage:             form.dosage,
          unit:               form.unit,
          category:           form.category,
          instructions:       form.instructions.trim() || null,
          isPermanent:        form.isPermanent,
          duration:           form.isPermanent ? null : Math.max(1, parseInt(form.duration) || 1),
          frequency:          frequencyConstant,
          intervalHours,
          intervalValue:      form.intervalValue,
          startDate:          form.startDate,
          endDate,
          isActive:           true,
          isInventoryEnabled: form.isInventoryEnabled,
          stock:              parseInt(form.stock) || 0,
          reorderLevel:       parseInt(form.reorderLevel) || 5,
          isAdjustable:       form.isAdjustable,
          updatedAt:          now,
        };

        if (isEditMode) {
          Object.assign(existingMed, medData);
          existingMed.schedules = scheduleData;
          savedMedication = existingMed;
        } else {
          savedMedication = realm.create('Medication', {
            _id: new Realm.BSON.UUID(), ...medData,
            schedules: scheduleData, nextOccurrence: null, createdAt: now,
          });
          mainProfile.medications.push(savedMedication);
        }
      });

      if (isEditMode) await NotificationService.cancelMedicationAlarms(existingMed);
      await NotificationService.scheduleMedicationAlarms(realm, savedMedication);

      const nextOccurrence = NotificationService.computeNextOccurrence(savedMedication);
      if (nextOccurrence) {
        realm.write(() => { savedMedication.nextOccurrence = nextOccurrence; });
      }

      onBack();
    } catch (error) {
      console.error('[MedicationForm] Save failed:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <ScreenHeader title={isEditMode ? 'Edit Medication' : 'New Medication'} onBack={onBack} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* ── MEDICINE DETAILS ── */}
          <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
            <View style={styles.cardHeader}>
              <IconButton icon="pill" size={20} iconColor={theme.colors.primary} />
              <Text variant="titleMedium" style={styles.cardTitle}>Medicine Details</Text>
            </View>

            <View style={styles.group}>
              <FormLabel label="Medicine Name" />
              <ModernInput {...inputThemeProps} placeholder="e.g. Amoxicillin" value={form.name} onChangeText={(val) => updateForm('name', val)} />
            </View>

            <View style={styles.row}>
              <View style={{ flex: 1.2 }}>
                <FormLabel label="Dose Amount" />
                <ModernInput {...inputThemeProps} placeholder="500" keyboardType="numeric" value={form.dosage} onChangeText={(val) => updateForm('dosage', val)} />
              </View>
              <View style={{ flex: 1 }}>
                <FormLabel label="Unit" />
                <SelectionMenu
                  visible={menuVisible.unit}
                  onOpen={() => toggleMenu('unit', true)}
                  onDismiss={(val) => { toggleMenu('unit', false); if (val) updateForm('unit', val); }}
                  value={form.unit} options={UNITS}
                />
              </View>
            </View>

            <View style={styles.group}>
              <FormLabel label="Category" />
              <SelectionMenu
                visible={menuVisible.category}
                onOpen={() => toggleMenu('category', true)}
                onDismiss={(val) => { toggleMenu('category', false); if (val) updateForm('category', val); }}
                value={form.category} options={CATEGORIES}
              />
            </View>

            <View style={styles.group}>
              <FormLabel label="Instructions (optional)" />
              <ModernInput {...inputThemeProps} placeholder="e.g. Take with food" value={form.instructions} onChangeText={(val) => updateForm('instructions', val)} />
            </View>
          </Surface>

          {/* ── SCHEDULE ── */}
          <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
            <View style={styles.cardHeader}>
              <IconButton icon="calendar-clock" size={20} iconColor={theme.colors.primary} />
              <Text variant="titleMedium" style={styles.cardTitle}>Schedule</Text>
            </View>

            <View style={styles.group}>
              <FormLabel label="Treatment Duration" />
              <SegmentedButtons
                value={form.isPermanent ? 'perm' : 'course'}
                onValueChange={(val) => updateForm('isPermanent', val === 'perm')}
                theme={{ colors: { secondaryContainer: theme.colors.primaryContainer, onSecondaryContainer: theme.colors.primary } }}
                buttons={[
                  { value: 'perm',   label: 'Maintenance', icon: 'infinity' },
                  { value: 'course', label: 'Set Days',    icon: 'calendar-check' },
                ]}
              />
              {!form.isPermanent && (
                <View style={styles.dynamicField}>
                  <FormLabel label="How many days?" />
                  <ModernInput
                    {...inputThemeProps}
                    placeholder="7"
                    keyboardType="numeric"
                    value={form.duration}
                    onChangeText={handleDurationChange}
                    onBlur={handleDurationBlur}
                  />
                  {fieldErrors.duration && <InlineError message={fieldErrors.duration} theme={theme} />}
                </View>
              )}
            </View>

            <View style={styles.group}>
              <FormLabel label="Frequency" />
              <SegmentedButtons
                value={form.frequency}
                onValueChange={(val) => {
                  updateForm('frequency', val);
                  updateForm('intervalValue', val === 'hourly' ? '8' : '1');
                  if (val !== 'hourly' && form.frequency === 'hourly') updateForm('times', [DEFAULT_TIME]);
                }}
                theme={{ colors: { secondaryContainer: theme.colors.primaryContainer, onSecondaryContainer: theme.colors.primary } }}
                buttons={[
                  { value: 'daily',    label: 'Daily' },
                  { value: 'hourly',   label: 'Hourly' },
                  { value: 'interval', label: 'Days' },
                ]}
              />
              {form.frequency !== 'daily' && (
                <View style={styles.dynamicField}>
                  <FormLabel label={form.frequency === 'hourly' ? 'Every how many hours?' : 'Every how many days?'} />
                  <SelectionMenu
                    visible={menuVisible.interval}
                    onOpen={() => toggleMenu('interval', true)}
                    onDismiss={(val) => { toggleMenu('interval', false); if (val) updateForm('intervalValue', val); }}
                    value={form.intervalValue}
                    options={form.frequency === 'hourly' ? HOURLY_OPTIONS : getFilteredDayOptions(form.duration)}
                  />
                </View>
              )}
            </View>
          </Surface>

          {/* ── REMINDER TIMES (daily / interval mode) ── */}
          {form.frequency !== 'hourly' && (
            <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
              <View style={styles.cardHeader}>
                <IconButton icon="bell-ring-outline" size={20} iconColor={theme.colors.primary} />
                <Text variant="titleMedium" style={styles.cardTitle}>Reminder Times</Text>
              </View>

              {form.times.length > 0 && (
                <View style={styles.chipRow}>
                  {form.times
                    .slice()
                    .sort((a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute))
                    .map((slot, index) => {
                      const isPast = isSlotPassedToday(slot, form.startDate);
                      return (
                        <View key={index} style={styles.chipWrapper}>
                          <Chip
                            onPress={() => openEditTimePicker(index)}
                            onClose={() => removeTimeSlot(index)}
                            closeIcon="close-circle"
                            style={[styles.timeChip, { backgroundColor: theme.colors.primaryContainer }]}
                            textStyle={{ color: theme.colors.primary, fontFamily: 'Geist-Medium' }}
                            icon="clock-outline"
                          >
                            {formatTime(slotToDate(slot))}
                          </Chip>
                          {isPast && (
                            <Text style={[styles.startsTomorrowLabel, { color: theme.colors.secondary }]}>
                              starts tomorrow
                            </Text>
                          )}
                        </View>
                      );
                    })}
                </View>
              )}

              <TouchableRipple onPress={openAddTimePicker} style={[styles.addTimeButton, { borderColor: theme.colors.primary }]} borderless>
                <View style={styles.addTimeInner}>
                  <MaterialCommunityIcons name="plus-circle-outline" size={20} color={theme.colors.primary} />
                  <Text style={[styles.addTimeLabel, { color: theme.colors.primary }]}>
                    {form.times.length === 0 ? 'Add Reminder Time' : 'Add Another Time'}
                  </Text>
                </View>
              </TouchableRipple>

              <View style={[styles.dateTimeContainer, { borderTopColor: theme.colors.outlineVariant }]}>
                <TouchableRipple onPress={() => togglePicker('date', true)} style={styles.flex1} borderless>
                  <View style={styles.dateTimeBox}>
                    <Text variant="labelSmall" style={{ color: theme.colors.secondary }}>START DATE</Text>
                    <Text variant="bodyLarge" style={styles.boldText}>{formatDate(form.startDate)}</Text>
                  </View>
                </TouchableRipple>
              </View>
            </Surface>
          )}

          {/* ── REMINDER TIMES (hourly mode) ── */}
          {form.frequency === 'hourly' && (
            <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
              <View style={styles.cardHeader}>
                <IconButton icon="bell-ring-outline" size={20} iconColor={theme.colors.primary} />
                <Text variant="titleMedium" style={styles.cardTitle}>Reminder Times</Text>
              </View>

              <View style={styles.group}>
                <FormLabel label="First dose time" />
                <TouchableRipple
                  onPress={openHourlyStartPicker}
                  style={[styles.startTimeButton, { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryContainer }]}
                  borderless
                >
                  <View style={styles.startTimeInner}>
                    <MaterialCommunityIcons name="clock-edit-outline" size={22} color={theme.colors.primary} />
                    <Text style={[styles.startTimeLabel, { color: theme.colors.primary }]}>
                      {formatTime(slotToDate(hourlyStartTime))}
                    </Text>
                    <Text style={[styles.startTimeHint, { color: theme.colors.primary }]}>tap to change</Text>
                  </View>
                </TouchableRipple>
              </View>

              {generatedHourlySlots.length > 0 && (
                <View style={styles.group}>
                  <FormLabel label={`Auto-generated (every ${form.intervalValue}h)`} />

                  {form.isPermanent ? (
                    <>
                      <View style={styles.chipRow}>
                        {generatedHourlySlots.map((slot, index) => (
                          <Chip
                            key={index}
                            style={[styles.timeChip, {
                              backgroundColor: index === 0
                                ? theme.colors.primaryContainer
                                : theme.colors.surfaceVariant,
                            }]}
                            textStyle={{
                              color: index === 0 ? theme.colors.primary : theme.colors.onSurfaceVariant,
                              fontFamily: 'Geist-Medium',
                              fontSize: 12,
                            }}
                            icon={index === 0 ? 'clock-start' : 'clock-outline'}
                          >
                            {formatTime(slotToDate(slot))}{index === 0 ? ' (start)' : ''}
                          </Chip>
                        ))}
                      </View>
                      <Text variant="bodySmall" style={styles.helperText}>
                        Only the first dose time is editable.
                      </Text>
                    </>
                  ) : (
                    (() => {
                      const endDate    = computeEndDate(form.startDate, form.duration, false);
                      const startLabel = formatDate(form.startDate);
                      const endLabel   = endDate ? formatDate(endDate) : '—';

                      return (
                        <View style={[styles.courseSlotContainer, { borderColor: theme.colors.outlineVariant, backgroundColor: theme.colors.surfaceVariant }]}>
                          <View style={[styles.courseRangeBanner, { backgroundColor: theme.colors.primaryContainer }]}>
                            <MaterialCommunityIcons name="calendar-range" size={14} color={theme.colors.primary} />
                            <Text style={[styles.courseRangeText, { color: theme.colors.primary }]}>{startLabel}</Text>
                            <MaterialCommunityIcons name="arrow-right" size={12} color={theme.colors.primary} style={{ opacity: 0.6 }} />
                            <Text style={[styles.courseRangeText, { color: theme.colors.primary }]}>{endLabel}</Text>
                            <Text style={[styles.courseRangeDuration, { color: theme.colors.primary }]}>· {form.duration}d</Text>
                          </View>

                          {generatedHourlySlots.map((slot, index) => {
                            const isStart   = index === 0;
                            const isNextDay = slot.daysOffset > 0;
                            const slotDate  = new Date(form.startDate);
                            slotDate.setDate(slotDate.getDate() + slot.daysOffset);
                            const slotDateLabel = slotDate.toLocaleDateString([], { month: 'short', day: 'numeric' });

                            return (
                              <View
                                key={index}
                                style={[
                                  styles.courseSlotRow,
                                  index < generatedHourlySlots.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.colors.outlineVariant },
                                ]}
                              >
                                <View style={styles.courseSlotDateCol}>
                                  <Text style={[styles.courseSlotDate, { color: isNextDay ? theme.colors.secondary : theme.colors.onSurfaceVariant }]}>
                                    {isNextDay ? slotDateLabel : 'Start date'}
                                  </Text>
                                  {isNextDay && (
                                    <Text style={[styles.courseSlotNextTag, { color: theme.colors.secondary }]}>next day</Text>
                                  )}
                                </View>
                                <View style={styles.courseSlotTimeCol}>
                                  <MaterialCommunityIcons
                                    name={isStart ? 'clock-start' : 'clock-outline'}
                                    size={14}
                                    color={isStart ? theme.colors.primary : theme.colors.onSurfaceVariant}
                                    style={{ marginRight: 5 }}
                                  />
                                  <Text style={[styles.courseSlotTime, { color: isStart ? theme.colors.primary : theme.colors.onSurface }]}>
                                    {formatTime(slotToDate(slot))}
                                  </Text>
                                  {isStart && (
                                    <Text style={[styles.courseSlotStartTag, { color: theme.colors.primary, backgroundColor: theme.colors.primaryContainer }]}>
                                      start
                                    </Text>
                                  )}
                                </View>
                              </View>
                            );
                          })}
                        </View>
                      );
                    })()
                  )}
                </View>
              )}

              <View style={[styles.dateTimeContainer, { borderTopColor: theme.colors.outlineVariant }]}>
                <TouchableRipple onPress={() => togglePicker('date', true)} style={styles.flex1} borderless>
                  <View style={styles.dateTimeBox}>
                    <Text variant="labelSmall" style={{ color: theme.colors.secondary }}>START DATE</Text>
                    <Text variant="bodyLarge" style={styles.boldText}>{formatDate(form.startDate)}</Text>
                  </View>
                </TouchableRipple>
              </View>
            </Surface>
          )}

          {/* ── SMART ADHERENCE ── */}
          <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
            <View style={styles.inventoryHeader}>
              <View style={styles.cardHeader}>
                <IconButton icon="brain" size={20} iconColor={theme.colors.primary} />
                <Text variant="titleMedium" style={styles.cardTitle}>Smart Adherence</Text>
              </View>
              <Switch value={form.isAdjustable} onValueChange={(val) => updateForm('isAdjustable', val)} color={theme.colors.primary} />
            </View>
            <Text variant="bodySmall" style={styles.helperText}>
              Automatically suggest adjusting the next dose if this one is taken late.
            </Text>
          </Surface>

          {/* ── INVENTORY ── */}
          <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
            <View style={styles.inventoryHeader}>
              <View style={styles.cardHeader}>
                <IconButton icon="package-variant-closed" size={20} iconColor={theme.colors.primary} />
                <Text variant="titleMedium" style={styles.cardTitle}>Inventory Tracking</Text>
              </View>
              <Switch value={form.isInventoryEnabled} onValueChange={(val) => updateForm('isInventoryEnabled', val)} color={theme.colors.primary} />
            </View>
            {form.isInventoryEnabled && (
              <View style={styles.dynamicField}>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <FormLabel label="Total Stock" />
                    <ModernInput
                      {...inputThemeProps}
                      placeholder="e.g. 30"
                      keyboardType="numeric"
                      value={form.stock}
                      onChangeText={handleStockChange}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <FormLabel label="Low Stock Alert" />
                    <ModernInput
                      {...inputThemeProps}
                      placeholder="e.g. 5"
                      keyboardType="numeric"
                      value={form.reorderLevel}
                      onChangeText={handleReorderChange}
                    />
                  </View>
                </View>
                {fieldErrors.stock && <InlineError message={fieldErrors.stock} theme={theme} />}
              </View>
            )}
          </Surface>

          {/* ── SCHEDULE SUMMARY ── */}
          <View style={[styles.summaryBox, { backgroundColor: theme.colors.primaryContainer, borderColor: theme.colors.primary }]}>
            <Text variant="bodyMedium" style={{ color: theme.colors.onPrimaryContainer, lineHeight: 20 }}>
              {getScheduleSummary({
                ...form,
                schedules: form.frequency === 'hourly' ? todayHourlySlots : form.times,
              })}
            </Text>
          </View>

          {/* ── SAVE BUTTON ── */}
          <Button
            mode="contained"
            onPress={handleSave}
            loading={isSaving}
            disabled={isSaving}
            style={styles.saveButton}
            contentStyle={{ height: 56 }}
            labelStyle={{ fontSize: 16, fontFamily: 'Geist-Bold' }}
          >
            {isEditMode ? 'Update Medication' : 'Confirm & Save'}
          </Button>

          {/* ── MODALS (only for blocking form-level errors) ── */}
          <StatusModal
            visible={modalType !== null}
            onDismiss={() => setModalType(null)}
            title={modalType === 'noTimes' ? 'No Reminder Times' : 'Missing Info'}
            message={
              modalType === 'noTimes'
                ? 'Please add at least one reminder time.'
                : 'Please enter a medicine name and a valid dosage.'
            }
            type="warning"
          />

          <TimeSelector
            show={pickerVisible.time}
            value={timePickerValue}
            startDate={form.startDate}
            onChange={(e, date) => { if (date) handleTimeConfirm(date); togglePicker('time', false); }}
            onCancel={() => { setEditingSlotIndex(-1); togglePicker('time', false); }}
          />

          <DateSelector
            show={pickerVisible.date}
            value={form.startDate}
            onChange={(date) => { updateForm('startDate', new Date(date)); togglePicker('date', false); }}
            onCancel={() => togglePicker('date', false)}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────

const styles = StyleSheet.create({
  container:         { flex: 1 },
  scrollContent:     { padding: 16, gap: 16 },
  card:              { padding: 16, gap: 16, borderRadius: 24 },
  cardHeader:        { flexDirection: 'row', alignItems: 'center', marginLeft: -12, marginBottom: -8 },
  cardTitle:         { fontWeight: 'bold' },
  inventoryHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  group:             { gap: 8 },
  row:               { flexDirection: 'row', gap: 12 },
  dynamicField:      { marginTop: 4, gap: 8 },
  helperText:        { opacity: 0.7, fontStyle: 'italic', paddingLeft: 4, fontSize: 12, marginTop: -4 },
  dateTimeContainer: { flexDirection: 'row', borderTopWidth: 1, paddingTop: 16, marginTop: 8 },
  flex1:             { flex: 1 },
  dateTimeBox:       { alignItems: 'center', gap: 4, paddingVertical: 8 },
  boldText:          { fontWeight: 'bold' },
  summaryBox:        { padding: 16, borderRadius: 20, borderStyle: 'dashed', borderWidth: 1 },
  saveButton:        { marginTop: 8, marginBottom: 50, borderRadius: 16 },
  chipRow:           { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timeChip:          { borderRadius: 20 },
  addTimeButton:     { borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 16 },
  addTimeInner:      { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' },
  addTimeLabel:      { fontFamily: 'Geist-Medium', fontSize: 14 },
  startTimeButton:   { borderWidth: 1.5, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 20 },
  startTimeInner:    { flexDirection: 'row', alignItems: 'center', gap: 12 },
  startTimeLabel:    { fontFamily: 'Geist-Bold', fontSize: 22, flex: 1 },
  startTimeHint:     { fontFamily: 'Geist-Regular', fontSize: 12, opacity: 0.7 },

  // Inline field error
  inlineErrorRow:      { flexDirection: 'row', alignItems: 'center', gap: 5 },
  inlineErrorText:     { fontFamily: 'Geist-Regular', fontSize: 12 },

  // Chip with "starts tomorrow" label underneath
  chipWrapper:         { alignItems: 'center', gap: 3 },
  startsTomorrowLabel: { fontFamily: 'Geist-Regular', fontSize: 10, opacity: 0.8 },

  // ── Course (Set Days) slot list ──
  courseSlotContainer: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  courseRangeBanner:   { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10 },
  courseRangeText:     { fontFamily: 'Geist-SemiBold', fontSize: 13 },
  courseRangeDuration: { fontFamily: 'Geist-Regular', fontSize: 12, opacity: 0.7 },
  courseSlotRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 11 },
  courseSlotDateCol:   { flex: 1, gap: 1 },
  courseSlotDate:      { fontFamily: 'Geist-Medium', fontSize: 13 },
  courseSlotNextTag:   { fontFamily: 'Geist-Regular', fontSize: 11, opacity: 0.75 },
  courseSlotTimeCol:   { flexDirection: 'row', alignItems: 'center' },
  courseSlotTime:      { fontFamily: 'Geist-SemiBold', fontSize: 15 },
  courseSlotStartTag:  { fontFamily: 'Geist-Medium', fontSize: 10, marginLeft: 8, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
});
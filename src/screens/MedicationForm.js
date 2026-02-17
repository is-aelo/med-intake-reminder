import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, StatusBar } from 'react-native';
import { Text, Button, useTheme, IconButton, TouchableRipple, SegmentedButtons, Surface, Switch } from 'react-native-paper';

// Realm Imports
import { useRealm, useQuery } from '@realm/react';
import { Profile, Medication } from '../models/Schemas';
import * as Realm from 'realm';

// Service Import
import NotificationService from '../services/NotificationService';

// Components
import { FormLabel, ModernInput } from '../components/FormInput';
import { SelectionMenu } from '../components/SelectionMenu';
import { TimeSelector, DateSelector } from '../components/TimeSelector'; 
import { StatusModal } from '../components/StatusModal';
import { ScreenHeader } from '../components/ScreenHeader';

// Constants & Helpers
import { 
  UNITS, 
  CATEGORIES, 
  HOURLY_OPTIONS, 
  getFilteredDayOptions, 
  getScheduleSummary,
  formatDate,
  formatTime 
} from '../constants/medicationOptions';

export default function AddMedication({ onBack, medicationId = null }) {
  const theme = useTheme();
  const realm = useRealm();
  const profiles = useQuery(Profile);
  const mainProfile = profiles.filtered('isMain == true')[0];

  const medications = useQuery(Medication);
  const existingMed = useMemo(() => {
    if (!medicationId) return null;
    try {
      const targetId = typeof medicationId === 'string' ? new Realm.BSON.UUID(medicationId) : medicationId;
      return medications.filtered('_id == $0', targetId)[0];
    } catch (e) {
      return null;
    }
  }, [medicationId, medications]);

  const [form, setForm] = useState({
    name: '',
    dosage: '',
    unit: 'mg',
    category: 'Tablet',
    isPermanent: true, 
    duration: '7',     
    frequency: 'daily', 
    intervalValue: '1', 
    startDate: new Date(), 
    time: new Date(),
    isInventoryEnabled: false,
    stock: '0',        
    reorderLevel: '5',
    isAdjustable: false, // New Smart Logic field
  });

  const [menuVisible, setMenuVisible] = useState({ unit: false, category: false, interval: false });
  const [pickerVisible, setPickerVisible] = useState({ time: false, date: false });
  const [modalType, setModalType] = useState(null); 

  const inputThemeProps = {
    cursorColor: theme.colors.primary,
    selectionColor: theme.colors.primaryContainer,
    selectionHandleColor: theme.colors.primary,
  };

  useEffect(() => {
    if (existingMed) {
      setForm({
        name: existingMed.name || '',
        dosage: String(existingMed.dosage || ''),
        unit: existingMed.unit || 'mg',
        category: existingMed.category || 'Tablet',
        isPermanent: existingMed.isPermanent ?? true,
        duration: existingMed.duration ? String(existingMed.duration) : '7',
        frequency: String(existingMed.frequency || 'daily').toLowerCase(),
        intervalValue: existingMed.intervalValue ? String(existingMed.intervalValue) : '1',
        startDate: new Date(existingMed.startDate),
        time: new Date(existingMed.reminderTime),
        isInventoryEnabled: existingMed.isInventoryEnabled || false,
        stock: String(existingMed.stock || '0'),
        reorderLevel: String(existingMed.reorderLevel || '5'),
        isAdjustable: existingMed.isAdjustable || false,
      });
    }
  }, [existingMed]);

  const updateForm = (key, value) => setForm(prev => ({ ...prev, [key]: value }));
  const toggleMenu = (key, isOpen) => setMenuVisible(prev => ({ ...prev, [key]: isOpen }));
  const togglePicker = (key, isOpen) => setPickerVisible(prev => ({ ...prev, [key]: isOpen }));

  const handleSave = async () => {
    if (form.name.trim() === '' || !form.dosage || parseFloat(form.dosage) <= 0) {
      setModalType('emptyFields');
      return;
    }
    if (!mainProfile) return;

    try {
      let savedId;
      let finalReminderTime = new Date(form.startDate);
      finalReminderTime.setHours(form.time.getHours(), form.time.getMinutes(), 0, 0);

      realm.write(() => {
        const medData = {
          name: form.name,
          dosage: form.dosage,
          unit: form.unit,
          category: form.category,
          isPermanent: form.isPermanent,
          duration: form.isPermanent ? null : form.duration,
          frequency: form.frequency,
          intervalValue: form.intervalValue,
          startDate: form.startDate,
          reminderTime: finalReminderTime,
          isActive: true,
          isInventoryEnabled: form.isInventoryEnabled,
          stock: parseInt(form.stock) || 0,
          reorderLevel: parseInt(form.reorderLevel) || 5,
          isAdjustable: form.isAdjustable,
        };

        if (existingMed) {
          savedId = existingMed._id.toHexString();
          Object.assign(existingMed, medData);
        } else {
          const newMedication = realm.create('Medication', {
            _id: new Realm.BSON.UUID(),
            ...medData,
            createdAt: new Date(),
          });
          savedId = newMedication._id.toHexString();
          mainProfile.medications.push(newMedication);
        }
      });

      if (existingMed) {
        await NotificationService.cancelNotification(savedId);
      }
      
      await NotificationService.scheduleMedication(
        savedId,
        form.name,
        `${form.dosage} ${form.unit}`,
        finalReminderTime
      );

      onBack();
    } catch (error) {
      console.error("Failed to save and schedule:", error);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <ScreenHeader title={medicationId ? "Edit Medication" : "New Medication"} onBack={onBack} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* Medicine Details Card */}
          <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
            <View style={styles.cardHeader}>
               <IconButton icon="pill" size={20} iconColor={theme.colors.primary} />
               <Text variant="titleMedium" style={styles.cardTitle}>Medicine Details</Text>
            </View>
            
            <View style={styles.group}>
              <FormLabel label="Medicine Name" />
              <ModernInput 
                {...inputThemeProps}
                placeholder="e.g. Tempra Syrup" 
                value={form.name} 
                onChangeText={(val) => updateForm('name', val)} 
              />
            </View>

            <View style={styles.row}>
              <View style={{ flex: 1.2 }}>
                <FormLabel label="Dose Amount" />
                <ModernInput 
                  {...inputThemeProps}
                  placeholder="5" 
                  keyboardType="numeric" 
                  value={form.dosage} 
                  onChangeText={(val) => updateForm('dosage', val)} 
                />
              </View>
              <View style={{ flex: 1 }}>
                <FormLabel label="Unit" />
                <SelectionMenu 
                  visible={menuVisible.unit}
                  onOpen={() => toggleMenu('unit', true)}
                  onDismiss={(val) => { toggleMenu('unit', false); if(val) updateForm('unit', val); }}
                  value={form.unit}
                  options={UNITS}
                />
              </View>
            </View>

            <View style={styles.group}>
              <FormLabel label="Medicine Category" />
              <SelectionMenu 
                visible={menuVisible.category}
                onOpen={() => toggleMenu('category', true)}
                onDismiss={(val) => { toggleMenu('category', false); if(val) updateForm('category', val); }}
                value={form.category}
                options={CATEGORIES}
              />
            </View>
          </Surface>

          {/* Adherence & Smart Adjustments Card */}
          <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
            <View style={styles.inventoryHeader}>
              <View style={styles.cardHeader}>
                <IconButton icon="brain" size={20} iconColor={theme.colors.primary} />
                <Text variant="titleMedium" style={styles.cardTitle}>Smart Adherence</Text>
              </View>
              <Switch 
                value={form.isAdjustable} 
                onValueChange={(val) => updateForm('isAdjustable', val)}
                color={theme.colors.primary}
              />
            </View>
            <Text variant="bodySmall" style={styles.helperText}>
              Automatically suggest adjusting the next dose if this one is taken late.
            </Text>
          </Surface>

          {/* Inventory Tracking Card */}
          <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
            <View style={styles.inventoryHeader}>
              <View style={styles.cardHeader}>
                <IconButton icon="package-variant-closed" size={20} iconColor={theme.colors.primary} />
                <Text variant="titleMedium" style={styles.cardTitle}>Inventory Tracking</Text>
              </View>
              <Switch 
                value={form.isInventoryEnabled} 
                onValueChange={(val) => updateForm('isInventoryEnabled', val)}
                color={theme.colors.primary}
              />
            </View>

            {form.isInventoryEnabled && (
              <View style={styles.dynamicField}>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <FormLabel label="Total Stock" />
                    <ModernInput 
                      {...inputThemeProps}
                      placeholder="e.g. 12" 
                      keyboardType="numeric" 
                      value={form.stock} 
                      onChangeText={(val) => updateForm('stock', val)} 
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <FormLabel label="Low Stock Alert" />
                    <ModernInput 
                      {...inputThemeProps}
                      placeholder="e.g. 2" 
                      keyboardType="numeric" 
                      value={form.reorderLevel} 
                      onChangeText={(val) => updateForm('reorderLevel', val)} 
                    />
                  </View>
                </View>
              </View>
            )}
          </Surface>

          {/* Schedule Card */}
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
                theme={{ colors: { secondaryContainer: theme.colors.primaryContainer, onSecondaryContainer: theme.colors.primary }}}
                buttons={[
                  { value: 'perm', label: 'Maintenance', icon: 'infinity' },
                  { value: 'course', label: 'Set Days', icon: 'calendar-check' },
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
                    onChangeText={(val) => updateForm('duration', val)} 
                  />
                </View>
              )}
            </View>

            <View style={styles.group}>
              <FormLabel label="Frequency" />
              <SegmentedButtons
                value={['daily', 'hourly', 'interval'].includes(form.frequency) ? form.frequency : 'daily'}
                onValueChange={(val) => {
                  updateForm('frequency', val);
                  updateForm('intervalValue', '1');
                }}
                theme={{ colors: { secondaryContainer: theme.colors.primaryContainer, onSecondaryContainer: theme.colors.primary }}}
                buttons={[
                  { value: 'daily', label: 'Daily' },
                  { value: 'hourly', label: 'Hourly' },
                  { value: 'interval', label: 'Days' },
                ]}
              />
              {form.frequency !== 'daily' && (
                <View style={styles.dynamicField}>
                  <FormLabel label={form.frequency === 'hourly' ? "Every how many hours?" : "Every how many days?"} />
                  <SelectionMenu 
                    visible={menuVisible.interval}
                    onOpen={() => toggleMenu('interval', true)}
                    onDismiss={(val) => { 
                      toggleMenu('interval', false); 
                      if(val) updateForm('intervalValue', val); 
                    }}
                    value={form.intervalValue}
                    options={form.frequency === 'hourly' ? HOURLY_OPTIONS : getFilteredDayOptions(form.duration)}
                  />
                </View>
              )}
            </View>
          </Surface>

          {/* Reminders Card */}
          <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
            <View style={styles.cardHeader}>
               <IconButton icon="bell-ring-outline" size={20} iconColor={theme.colors.primary} />
               <Text variant="titleMedium" style={styles.cardTitle}>Reminders</Text>
            </View>
            <View style={[styles.dateTimeContainer, { borderTopColor: theme.colors.outlineVariant }]}>
               <TouchableRipple onPress={() => togglePicker('date', true)} style={styles.flex1} borderless>
                  <View style={styles.dateTimeBox}>
                     <Text variant="labelSmall" style={{ color: theme.colors.secondary }}>START DATE</Text>
                     <Text variant="bodyLarge" style={styles.boldText}>{formatDate(form.startDate)}</Text>
                  </View>
               </TouchableRipple>
               <View style={[styles.verticalDivider, { backgroundColor: theme.colors.outlineVariant }]} />
               <TouchableRipple onPress={() => togglePicker('time', true)} style={styles.flex1} borderless>
                  <View style={styles.dateTimeBox}>
                     <Text variant="labelSmall" style={{ color: theme.colors.secondary }}>REMINDER TIME</Text>
                     <Text variant="bodyLarge" style={styles.boldText}>{formatTime(form.time)}</Text>
                  </View>
               </TouchableRipple>
            </View>
          </Surface>

          <View style={[styles.summaryBox, { backgroundColor: theme.colors.primaryContainer, borderColor: theme.colors.primary }]}>
              <Text variant="bodyMedium" style={{ color: theme.colors.onPrimaryContainer, lineHeight: 20 }}>
                {getScheduleSummary(form)}
              </Text>
          </View>

          <Button 
            mode="contained" 
            onPress={handleSave} 
            style={styles.saveButton}
            contentStyle={{ height: 56 }}
            labelStyle={{ fontSize: 16, fontWeight: 'bold' }}
          >
            {medicationId ? "Update Medication" : "Confirm & Save"}
          </Button>

          <StatusModal 
            visible={modalType !== null}
            onDismiss={() => setModalType(null)}
            title={modalType === 'pastTime' ? "Invalid Time" : "Missing Info"}
            message={
              modalType === 'pastTime' 
                ? "Reminders cannot be set in the past." 
                : "Please enter a medicine name and a valid dosage."
            }
            type="warning"
          />

          <TimeSelector 
            show={pickerVisible.time} 
            value={form.time} 
            startDate={form.startDate} 
            onInvalidTime={() => {
                setTimeout(() => setModalType('pastTime'), 400);
            }}
            onChange={(e, date) => {
                if(date) { 
                  const newDate = new Date(form.startDate);
                  newDate.setHours(date.getHours(), date.getMinutes(), 0, 0);
                  updateForm('time', newDate); 
                }
                togglePicker('time', false);
            }}
            onCancel={() => togglePicker('time', false)}
          />

          <DateSelector 
            show={pickerVisible.date}
            value={form.startDate}
            onChange={(date) => {
              const updated = new Date(date);
              updated.setHours(form.time.getHours(), form.time.getMinutes());
              updateForm('startDate', updated);
              togglePicker('date', false);
            }}
            onCancel={() => togglePicker('date', false)}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, gap: 16 },
  card: { padding: 16, gap: 16, borderRadius: 24 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginLeft: -12, marginBottom: -8 },
  cardTitle: { fontWeight: 'bold' },
  inventoryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  group: { gap: 8 },
  row: { flexDirection: 'row', gap: 12 },
  dynamicField: { marginTop: 4, gap: 8 },
  helperText: { opacity: 0.7, fontStyle: 'italic', paddingLeft: 4, fontSize: 12, marginTop: -8 },
  dateTimeContainer: { flexDirection: 'row', borderTopWidth: 1, paddingTop: 16, marginTop: 8 },
  flex1: { flex: 1 },
  dateTimeBox: { alignItems: 'center', gap: 4, paddingVertical: 8 },
  verticalDivider: { width: 1 },
  boldText: { fontWeight: 'bold' },
  summaryBox: { padding: 16, borderRadius: 20, borderStyle: 'dashed', borderWidth: 1 },
  saveButton: { marginTop: 8, marginBottom: 50, borderRadius: 16 },
});
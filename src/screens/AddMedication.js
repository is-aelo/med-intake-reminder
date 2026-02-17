import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, StatusBar } from 'react-native';
import { Text, Button, useTheme, IconButton, TouchableRipple, SegmentedButtons, Surface, Switch } from 'react-native-paper';

// Realm Imports
import { useRealm, useQuery } from '@realm/react';
import { Profile, Medication } from '../models/Schemas';

import { FormLabel, ModernInput } from '../components/FormInput';
import { SelectionMenu } from '../components/SelectionMenu';
import { TimeSelector, DateSelector } from '../components/TimeSelector'; 
import { StatusModal } from '../components/StatusModal';
import { ScreenHeader } from '../components/ScreenHeader';

export default function AddMedication({ onBack }) {
  const theme = useTheme();
  
  const realm = useRealm();
  const profiles = useQuery(Profile);
  const mainProfile = profiles.filtered('isMain == true')[0];

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
    stock: '0',        // Total Doses/Pieces
    reorderLevel: '5',
  });

  const [menuVisible, setMenuVisible] = useState({ unit: false, category: false, interval: false });
  const [pickerVisible, setPickerVisible] = useState({ time: false, date: false });
  const [modalType, setModalType] = useState(null); 

  const units = ['mg', 'mcg', 'g', 'ml', 'IU', 'Drops', 'Puffs', 'Pills', 'Capsules', 'Sachets', 'Units'];
  const categories = ['Tablet', 'Capsule', 'Liquid/Syrup', 'Injection', 'Cream/Ointment', 'Inhaler', 'Drops', 'Spray', 'Patch', 'Suppository', 'Powder'];
  const hourlyOptions = ['1', '2', '3', '4', '6', '8', '12', '24'];
  const dayOptions = ['1', '2', '3', '4', '5', '6', '7', '14', '30'];

  // Logic to sync cursor/handle colors globally if the component allows
  const inputThemeProps = {
    cursorColor: theme.colors.primary,
    selectionColor: theme.colors.primaryContainer,
    selectionHandleColor: theme.colors.primary,
  };

  useEffect(() => {
    if (!form.isPermanent && form.frequency === 'interval') {
      const durationNum = parseInt(form.duration) || 0;
      const intervalNum = parseInt(form.intervalValue) || 0;
      if (intervalNum > durationNum && durationNum > 0) {
        updateForm('intervalValue', '1');
      }
    }
  }, [form.duration, form.isPermanent]);

  const updateForm = (key, value) => setForm(prev => ({ ...prev, [key]: value }));
  const toggleMenu = (key, isOpen) => setMenuVisible(prev => ({ ...prev, [key]: isOpen }));
  const togglePicker = (key, isOpen) => setPickerVisible(prev => ({ ...prev, [key]: isOpen }));

  const formatTime = (date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  const formatDate = (date) => date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

  const getFilteredOptions = () => {
    if (form.frequency === 'hourly') return hourlyOptions;
    if (form.frequency === 'interval' && !form.isPermanent) {
      const maxDays = parseInt(form.duration) || 1;
      return dayOptions.filter(opt => parseInt(opt) <= maxDays);
    }
    return dayOptions;
  };

  const getScheduleSummary = () => {
    const { frequency, intervalValue, isPermanent, duration, category, startDate } = form;
    let text = `Take ${category.toLowerCase()} `;
    if (frequency === 'daily') text += "once every day";
    else if (frequency === 'hourly') text += `every ${intervalValue} hours`;
    else if (frequency === 'interval') text += `every ${intervalValue} ${parseInt(intervalValue) === 1 ? 'day' : 'days'}`;

    text += ` starting ${formatDate(startDate)}`;
    if (!isPermanent) text += ` for a ${duration}-day course.`;
    else text += " as maintenance.";
    
    return text;
  };

  const handleSave = () => {
    if (form.name.trim() === '' || !form.dosage || parseFloat(form.dosage) <= 0) {
      setModalType('emptyFields');
      return;
    }
    if (!mainProfile) return;

    try {
      realm.write(() => {
        const newMedication = realm.create('Medication', {
          _id: new Realm.BSON.UUID(),
          name: form.name,
          dosage: form.dosage,
          unit: form.unit,
          category: form.category,
          isPermanent: form.isPermanent,
          duration: form.isPermanent ? null : form.duration,
          frequency: form.frequency,
          intervalValue: form.intervalValue,
          startDate: form.startDate,
          reminderTime: form.time,
          createdAt: new Date(),
          isActive: true,
          isInventoryEnabled: form.isInventoryEnabled,
          stock: parseInt(form.stock) || 0,
          reorderLevel: parseInt(form.reorderLevel) || 5,
        });
        mainProfile.medications.push(newMedication);
      });
      onBack();
    } catch (error) {
      console.error("Failed to save:", error);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <ScreenHeader title="New Medication" onBack={onBack} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* MEDICINE DETAILS */}
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
                  options={units}
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
                options={categories}
              />
            </View>
          </Surface>

          {/* INVENTORY TRACKING */}
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
                    <FormLabel label="Total Doses/Pieces" />
                    <ModernInput 
                      {...inputThemeProps}
                      placeholder="e.g. 12" 
                      keyboardType="numeric" 
                      value={form.stock} 
                      onChangeText={(val) => updateForm('stock', val)} 
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <FormLabel label="Alert Level" />
                    <ModernInput 
                      {...inputThemeProps}
                      placeholder="e.g. 2" 
                      keyboardType="numeric" 
                      value={form.reorderLevel} 
                      onChangeText={(val) => updateForm('reorderLevel', val)} 
                    />
                  </View>
                </View>
                <Text variant="bodySmall" style={[styles.helperText, { color: theme.colors.primary }]}>
                  {form.category === 'Liquid/Syrup' 
                    ? "Tip: If bottle is 60ml and dose is 5ml, enter 12 doses." 
                    : "Enter the total number of tablets or units you have."}
                </Text>
              </View>
            )}
          </Surface>

          {/* SCHEDULE */}
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
                  <FormLabel label="For how many days?" />
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
                value={form.frequency}
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
                    options={getFilteredOptions()}
                  />
                </View>
              )}
            </View>
          </Surface>

          {/* REMINDERS */}
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
                {getScheduleSummary()}
              </Text>
          </View>

          <Button 
            mode="contained" 
            onPress={handleSave} 
            style={styles.saveButton}
            contentStyle={{ height: 56 }}
            labelStyle={{ fontSize: 16, fontWeight: 'bold' }}
          >
            Confirm & Save
          </Button>

          <StatusModal 
            visible={modalType !== null}
            onDismiss={() => setModalType(null)}
            title={modalType === 'pastTime' ? "Invalid Time" : "Missing Info"}
            message={
              modalType === 'pastTime' 
                ? "Reminders cannot be set in the past. We've adjusted it to the next minute for you." 
                : "Please enter a medicine name and a valid dosage."
            }
            type="warning"
          />

          <TimeSelector 
            show={pickerVisible.time} 
            value={form.time} 
            onInvalidTime={() => setTimeout(() => setModalType('pastTime'), 400)}
            onChange={(e, date) => {
              if(date) { 
                const newDate = new Date(form.startDate);
                newDate.setHours(date.getHours(), date.getMinutes());
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
  helperText: { opacity: 0.8, fontStyle: 'italic', paddingLeft: 4, fontSize: 12 },
  dateTimeContainer: { flexDirection: 'row', borderTopWidth: 1, paddingTop: 16, marginTop: 8 },
  flex1: { flex: 1 },
  dateTimeBox: { alignItems: 'center', gap: 4, paddingVertical: 8 },
  verticalDivider: { width: 1 },
  boldText: { fontWeight: 'bold' },
  summaryBox: { padding: 16, borderRadius: 20, borderStyle: 'dashed', borderWidth: 1 },
  saveButton: { marginTop: 8, marginBottom: 50, borderRadius: 16 },
});
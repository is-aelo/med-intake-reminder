import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, StatusBar } from 'react-native';
import { Text, Button, useTheme, IconButton, TouchableRipple, SegmentedButtons, Surface } from 'react-native-paper';

import { FormLabel, ModernInput } from '../components/FormInput';
import { SelectionMenu } from '../components/SelectionMenu';
import { TimeSelector, DateSelector } from '../components/TimeSelector'; 
import { StatusModal } from '../components/StatusModal';
import { ScreenHeader } from '../components/ScreenHeader';

export default function AddMedication({ onBack }) {
  const theme = useTheme();

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
  });

  const [menuVisible, setMenuVisible] = useState({ unit: false, category: false, interval: false });
  const [pickerVisible, setPickerVisible] = useState({ time: false, date: false });
  const [modalType, setModalType] = useState(null); 

  const units = ['mg', 'mcg', 'g', 'ml', 'IU', 'Drops', 'Puffs', 'Pills', 'Capsules', 'Sachets', 'Units'];
  const categories = ['Tablet', 'Capsule', 'Liquid/Syrup', 'Injection', 'Cream/Ointment', 'Inhaler', 'Drops', 'Spray', 'Patch', 'Suppository', 'Powder'];
  const hourlyOptions = ['1', '2', '3', '4', '6', '8', '12', '24'];
  const dayOptions = ['1', '2', '3', '4', '5', '6', '7', '14', '30'];

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
    else text += " as part of your regular maintenance.";
    
    return text;
  };

  const handleSave = () => {
    const isNameEmpty = form.name.trim() === '';
    const isDosageInvalid = !form.dosage || parseFloat(form.dosage) <= 0;
    if (isNameEmpty || isDosageInvalid) {
      setModalType('emptyFields');
      return;
    }
    console.log('✅ READY FOR REALM:', form);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <ScreenHeader title="New Medication" onBack={onBack} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* MEDICINE INFO */}
          <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
            <View style={styles.cardHeader}>
               <IconButton icon="pill" size={20} iconColor={theme.colors.primary} />
               <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: 'bold' }}>Medicine Details</Text>
            </View>
            
            <View style={styles.group}>
              <FormLabel label="What is the medicine name?" />
              <ModernInput 
                placeholder="e.g. Amoxicillin" 
                placeholderTextColor={theme.colors.onSurfaceVariant} 
                value={form.name} 
                onChangeText={(val) => updateForm('name', val)} 
              />
            </View>

            <View style={styles.row}>
              <View style={{ flex: 1.2 }}>
                <FormLabel label="How much?" />
                <ModernInput 
                  placeholder="0" 
                  placeholderTextColor={theme.colors.onSurfaceVariant}
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

          {/* SCHEDULE */}
          <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
            <View style={styles.cardHeader}>
               <IconButton icon="calendar-clock" size={20} iconColor={theme.colors.primary} />
               <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: 'bold' }}>Schedule</Text>
            </View>

            <View style={styles.group}>
              <FormLabel label="How long will you take this?" />
              <SegmentedButtons
                value={form.isPermanent ? 'perm' : 'course'}
                onValueChange={(val) => updateForm('isPermanent', val === 'perm')}
                theme={{ colors: { secondaryContainer: theme.colors.primaryContainer, onSecondaryContainer: theme.colors.primary }}}
                buttons={[
                  { value: 'perm', label: 'Long-term', icon: 'infinity' },
                  { value: 'course', label: 'Set Days', icon: 'calendar-check' },
                ]}
              />
              {!form.isPermanent && (
                <View style={styles.dynamicField}>
                  <FormLabel label="For how many days?" />
                  <ModernInput 
                    placeholder="e.g. 7" 
                    placeholderTextColor={theme.colors.onSurfaceVariant}
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
               <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: 'bold' }}>Reminders</Text>
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

          {/* SUMMARY BOX */}
          <View style={[styles.summaryBox, { backgroundColor: theme.colors.primaryContainer, borderColor: theme.colors.primary }]}>
              <View style={styles.summaryHeader}>
                <IconButton icon="information" size={16} iconColor={theme.colors.primary} style={styles.noMargin} />
                <Text variant="labelMedium" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
                  SCHEDULE SUMMARY
                </Text>
              </View>
              <Text variant="bodyMedium" style={{ color: theme.colors.onPrimaryContainer, lineHeight: 20 }}>
                {getScheduleSummary()}
              </Text>
          </View>

          <Button 
            mode="contained" 
            onPress={handleSave} 
            style={[styles.saveButton, { borderRadius: theme.roundness }]}
            contentStyle={{ height: 56 }}
            labelStyle={{ fontSize: 16, fontWeight: 'bold' }}
          >
            Confirm & Save
          </Button>

          {/* MODALS */}
          <StatusModal 
            visible={modalType !== null}
            onDismiss={() => setModalType(null)}
            title={modalType === 'pastTime' ? "Invalid Time" : "Missing Info"}
            message={
              modalType === 'pastTime' ? "Reminders cannot be set in the past. We've adjusted it to the next minute for you." : "Please enter a medicine name and a valid dosage."
            }
            type="warning"
          />

          <TimeSelector 
            show={pickerVisible.time} 
            value={form.time} 
            onInvalidTime={() => setTimeout(() => setModalType('pastTime'), 400)}
            onChange={(e, date) => {
              if(date) { updateForm('startDate', date); updateForm('time', date); }
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
              updateForm('time', updated);
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
  card: { padding: 16, gap: 16, borderRadius: 20 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginLeft: -12, marginBottom: -8 },
  group: { gap: 8 },
  row: { flexDirection: 'row', gap: 12 },
  dynamicField: { marginTop: 4, gap: 8 },
  dateTimeContainer: { flexDirection: 'row', borderTopWidth: 1, paddingTop: 16, marginTop: 8 },
  flex1: { flex: 1 },
  dateTimeBox: { alignItems: 'center', gap: 4, paddingVertical: 8 },
  verticalDivider: { width: 1 },
  boldText: { fontWeight: 'bold' },
  summaryBox: { padding: 12, borderRadius: 16, borderStyle: 'dashed', borderWidth: 1 },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  noMargin: { margin: 0 },
  saveButton: { marginTop: 8, marginBottom: 50 },
});
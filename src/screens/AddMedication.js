import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, StatusBar } from 'react-native';
import { Text, Button, useTheme, IconButton, TouchableRipple, SegmentedButtons } from 'react-native-paper';

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
    intervalValue: '8', 
    startDate: new Date(), 
    time: new Date(),
  });

  const [menuVisible, setMenuVisible] = useState({ unit: false, category: false });
  const [pickerVisible, setPickerVisible] = useState({ time: false, date: false });
  const [isPastTimeModalVisible, setPastTimeModalVisible] = useState(false);

  const units = ['mg', 'mcg', 'g', 'ml', 'IU', 'Drops', 'Puffs', 'Pills', 'Capsules', 'Sachets', 'Units'];
  const categories = ['Tablet', 'Capsule', 'Liquid/Syrup', 'Injection', 'Cream/Ointment', 'Inhaler', 'Drops', 'Spray', 'Patch', 'Suppository', 'Powder'];

  const updateForm = (key, value) => setForm(prev => ({ ...prev, [key]: value }));
  const toggleMenu = (key, isOpen) => setMenuVisible(prev => ({ ...prev, [key]: isOpen }));
  const togglePicker = (key, isOpen) => setPickerVisible(prev => ({ ...prev, [key]: isOpen }));

  const formatTime = (date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  const formatDate = (date) => date.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });

  const getScheduleSummary = () => {
    const { frequency, intervalValue, isPermanent, duration, category, startDate } = form;
    let text = `Take ${category.toLowerCase()} `;
    if (frequency === 'daily') text += "once every day";
    else if (frequency === 'hourly') text += `every ${intervalValue} hours`;
    else if (frequency === 'interval') text += `every ${intervalValue} days`;

    text += ` starting ${formatDate(startDate)}`;

    if (!isPermanent) text += ` for a ${duration}-day course.`;
    else text += " as part of your regular maintenance.";
    
    return text;
  };

  // FIXED: Update both date and time together
  const handleDateChange = (newDate) => {
    // When date changes, preserve the current time
    const updatedDateTime = new Date(newDate);
    updatedDateTime.setHours(form.time.getHours());
    updatedDateTime.setMinutes(form.time.getMinutes());
    
    updateForm('startDate', updatedDateTime);
    updateForm('time', updatedDateTime);
  };

  const handleTimeChange = (e, newDateTime) => {
  if (newDateTime) {
    // Update both startDate and time to keep them in sync
    updateForm('startDate', newDateTime);
    updateForm('time', newDateTime);
  }
  togglePicker('time', false);
};

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <ScreenHeader title="Add Medication" onBack={onBack} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          <View style={styles.formSection}>
            
            {/* STEP 1: Basic Info */}
            <View style={styles.group}>
              <FormLabel label="What is the medicine name?" />
              <ModernInput 
                placeholder="e.g. Amoxicillin" 
                value={form.name} 
                onChangeText={(val) => updateForm('name', val)} 
              />
            </View>

            <View style={styles.row}>
              <View style={{ flex: 1.2 }}>
                <FormLabel label="How much?" />
                <ModernInput 
                  placeholder="0" 
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

            <View style={styles.divider} />

            {/* STEP 2: Start Date Selection */}
            <View style={styles.group}>
              <FormLabel label="When will you start taking this?" />
              <TouchableRipple
                onPress={() => togglePicker('date', true)}
                style={[styles.selectorCard, { backgroundColor: theme.colors.surfaceVariant }]}
              >
                <View style={styles.selectorContent}>
                  <Text variant="bodyLarge" style={{ fontWeight: '500' }}>{formatDate(form.startDate)}</Text>
                  <IconButton icon="calendar-edit" size={24} />
                </View>
              </TouchableRipple>
            </View>

            {/* STEP 3: Duration */}
            <View style={styles.group}>
              <FormLabel label="How long will you take this?" />
              <SegmentedButtons
                value={form.isPermanent ? 'perm' : 'course'}
                onValueChange={(val) => updateForm('isPermanent', val === 'perm')}
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
                    keyboardType="numeric" 
                    value={form.duration} 
                    onChangeText={(val) => updateForm('duration', val)} 
                  />
                </View>
              )}
            </View>

            {/* STEP 4: Frequency */}
            <View style={styles.group}>
              <FormLabel label="How often do you take it?" />
              <SegmentedButtons
                value={form.frequency}
                onValueChange={(val) => updateForm('frequency', val)}
                buttons={[
                  { value: 'daily', label: 'Daily', icon: 'calendar-today' },
                  { value: 'hourly', label: 'Hourly', icon: 'clock-outline' },
                  { value: 'interval', label: 'Days', icon: 'calendar-range' },
                ]}
              />
              {form.frequency !== 'daily' && (
                <View style={styles.dynamicField}>
                  <FormLabel label={form.frequency === 'hourly' ? "Every how many hours?" : "Every how many days?"} />
                  <ModernInput 
                    placeholder="e.g. 8" 
                    keyboardType="numeric" 
                    value={form.intervalValue} 
                    onChangeText={(val) => updateForm('intervalValue', val)} 
                  />
                </View>
              )}
            </View>

            {/* STEP 5: Time Selection */}
            <View style={styles.group}>
              <FormLabel label={form.frequency === 'hourly' ? "When is the first dose?" : "Set reminder time"} />
              <TouchableRipple
                onPress={() => togglePicker('time', true)}
                style={[styles.timeCard, { backgroundColor: theme.colors.primaryContainer, borderRadius: 16 }]}
              >
                <View style={styles.timeCardContent}>
                  <View>
                    <Text variant="displaySmall" style={{ color: theme.colors.primary }}>{formatTime(form.time)}</Text>
                    <Text variant="bodyMedium" style={{ color: theme.colors.primary, opacity: 0.7 }}>Tap to change time</Text>
                  </View>
                  <IconButton icon="clock-edit-outline" iconColor={theme.colors.primary} size={40} />
                </View>
              </TouchableRipple>
            </View>

            {/* Summary Preview */}
            <View style={[styles.summary, { backgroundColor: theme.colors.secondaryContainer }]}>
              <IconButton icon="information-outline" size={20} />
              <Text variant="bodyMedium" style={{ flex: 1, fontWeight: '500' }}>{getScheduleSummary()}</Text>
            </View>

          </View>

          <Button 
            mode="contained" 
            onPress={() => console.log('Final Data Ready for Realm:', form)} 
            style={styles.saveButton} 
            contentStyle={{ height: 56 }}
          >
            Confirm & Save
          </Button>

          {/* Validation Modal */}
          <StatusModal 
            visible={isPastTimeModalVisible}
            onDismiss={() => setPastTimeModalVisible(false)}
            title="Invalid Time"
            message="Reminders cannot be set in the past. We've adjusted it to the next minute for you."
            type="warning"
          />

          <TimeSelector 
            show={pickerVisible.time} 
            value={form.time} 
            onInvalidTime={() => {
              console.log("Triggering Modal..."); // Debug line
              setPastTimeModalVisible(true);
            }}
            onChange={handleTimeChange}
            onCancel={() => togglePicker('time', false)}
          />
          
          <DateSelector 
            show={pickerVisible.date}
            value={form.startDate}
            onChange={handleDateChange}
            onCancel={() => togglePicker('date', false)}
          />

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingTop: 10 },
  formSection: { gap: 24, marginBottom: 20 },
  group: { gap: 8 },
  row: { flexDirection: 'row', gap: 12 },
  dynamicField: { marginTop: 4 },
  divider: { height: 1, backgroundColor: 'rgba(0,0,0,0.05)', marginVertical: 10 },
  selectorCard: { paddingHorizontal: 16, paddingVertical: 4, borderRadius: 12 },
  selectorContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timeCard: { padding: 20 },
  timeCardContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summary: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, marginTop: 10 },
  saveButton: { marginTop: 20, marginBottom: 50, borderRadius: 12 },
});
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, useTheme, IconButton, Menu, TouchableRipple } from 'react-native-paper';

export default function AddMedication({ onBack }) {
  const theme = useTheme();
  const [medName, setMedName] = useState('');
  const [dosage, setDosage] = useState('');
  const [time, setTime] = useState('08:00 AM');
  
  // States for Dropdowns
  const [unit, setUnit] = useState('mg');
  const [showUnitMenu, setShowUnitMenu] = useState(false);
  const [category, setCategory] = useState('Tablet');
  const [showCatMenu, setShowCatMenu] = useState(false);

  const units = ['mg', 'ml', 'g', 'mcg', 'pills'];
  const categories = ['Tablet', 'Capsule', 'Liquid', 'Injection', 'Cream'];

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.header}>
          <IconButton 
            icon="arrow-left" 
            size={24} 
            onPress={onBack} 
            iconColor={theme.colors.primary}
            style={{ marginLeft: -10 }}
          />
          <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.primary }]}>
            New Medication
          </Text>
        </View>

        <Text variant="bodyMedium" style={{ color: theme.colors.secondary, marginBottom: 32 }}>
          Fill in the details below to set your reminder.
        </Text>

        <View style={styles.form}>
          <TextInput
            label="Medicine Name"
            value={medName}
            onChangeText={setMedName}
            mode="outlined"
            style={styles.input}
            outlineStyle={{ borderRadius: theme.roundness }}
          />

          <View style={styles.row}>
            <TextInput
              label="Dosage"
              value={dosage}
              onChangeText={setDosage}
              mode="outlined"
              keyboardType="numeric"
              style={[styles.input, { flex: 2 }]}
              outlineStyle={{ borderRadius: theme.roundness }}
            />
            
            {/* UNIT DROPDOWN */}
            <Menu
              visible={showUnitMenu}
              onDismiss={() => setShowUnitMenu(false)}
              anchor={
                <Button 
                  mode="outlined" 
                  onPress={() => setShowUnitMenu(true)}
                  style={styles.dropdownBtn}
                  contentStyle={styles.dropdownContent}
                >
                  {unit}
                </Button>
              }
            >
              {units.map((u) => (
                <Menu.Item key={u} onPress={() => { setUnit(u); setShowUnitMenu(false); }} title={u} />
              ))}
            </Menu>
          </View>

          {/* CATEGORY DROPDOWN */}
          <Menu
            visible={showCatMenu}
            onDismiss={() => setShowCatMenu(false)}
            anchor={
              <Button 
                mode="outlined" 
                icon="pill"
                onPress={() => setShowCatMenu(true)}
                style={styles.fullDropdown}
              >
                Category: {category}
              </Button>
            }
          >
            {categories.map((c) => (
              <Menu.Item key={c} onPress={() => { setCategory(c); setShowCatMenu(false); }} title={c} />
            ))}
          </Menu>

          <View style={[styles.timeContainer, { 
            borderColor: theme.colors.outlineVariant, 
            backgroundColor: theme.colors.surface 
          }]}>
            <View>
              <Text variant="labelLarge" style={{ color: theme.colors.secondary }}>Reminder Time</Text>
              <Text variant="displaySmall" style={{ fontFamily: theme.fonts.displaySmall.fontFamily, color: theme.colors.primary }}>
                {time}
              </Text>
            </View>
            <IconButton 
              icon="clock-outline" 
              mode="contained-tonal" 
              containerColor={theme.colors.primaryContainer}
              iconColor={theme.colors.primary}
              size={30}
              onPress={() => {}}
            />
          </View>
        </View>

        <Button 
          mode="contained" 
          onPress={() => console.log('Saved with Realm soon!')}
          style={[styles.saveButton, { borderRadius: theme.roundness }]}
          contentStyle={{ height: 56 }}
        >
          Save Schedule
        </Button>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 24, paddingTop: 60 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  title: { fontFamily: 'Geist-Bold' },
  form: { gap: 16, marginBottom: 40 },
  input: { backgroundColor: 'transparent' },
  row: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  dropdownBtn: { marginTop: 6, height: 50, justifyContent: 'center' },
  dropdownContent: { height: 50 },
  fullDropdown: { width: '100%', borderRadius: 12 },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 10,
  },
  saveButton: { marginTop: 20 },
});
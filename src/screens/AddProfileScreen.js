import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { TextInput, Button, Text, IconButton, useTheme } from 'react-native-paper';
import { useRealm } from '@realm/react';

const AVATAR_ICONS = ['account', 'face-man', 'face-woman', 'baby-face', 'human-cane', 'dog-side'];
const THEME_COLORS = ['#2D5A27', '#6A977D', '#4A7C59', '#8DB580', '#AFCBFF', '#E9B872'];

export default function AddProfileScreen({ isFirstProfile = false, onComplete }) {
  const theme = useTheme();
  const realm = useRealm();

  const [form, setForm] = useState({
    firstName: '',
    relationship: isFirstProfile ? 'Self' : '',
    color: THEME_COLORS[0],
    icon: AVATAR_ICONS[0],
  });

  const handleSave = () => {
    if (!form.firstName) return;

    realm.write(() => {
      realm.create('Profile', {
        _id: new Realm.BSON.UUID(),
        firstName: form.firstName,
        relationship: form.relationship,
        color: form.color,
        icon: form.icon,
        isMain: isFirstProfile, // First user is always the Main
      });
    });

    if (onComplete) onComplete();
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text variant="headlineSmall" style={{ fontFamily: 'Geist-Bold', color: theme.colors.primary }}>
          {isFirstProfile ? "Let's start with you!" : "Add family member"}
        </Text>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          {isFirstProfile 
            ? "Create your primary profile to start managing medications." 
            : "Keep track of medications for your loved ones."}
        </Text>
      </View>

      <TextInput
        label="First Name"
        value={form.firstName}
        onChangeText={(text) => setForm({ ...form, firstName: text })}
        mode="outlined"
        style={styles.input}
      />

      {!isFirstProfile && (
        <TextInput
          label="Relationship (e.g. Mother, Child)"
          value={form.relationship}
          onChangeText={(text) => setForm({ ...form, relationship: text })}
          mode="outlined"
          style={styles.input}
        />
      )}

      <Text variant="titleMedium" style={styles.sectionTitle}>Choose an Icon</Text>
      <View style={styles.row}>
        {AVATAR_ICONS.map((icon) => (
          <IconButton
            key={icon}
            icon={icon}
            mode={form.icon === icon ? 'contained' : 'outlined'}
            selected={form.icon === icon}
            onPress={() => setForm({ ...form, icon: icon })}
            iconColor={form.icon === icon ? theme.colors.onPrimary : theme.colors.primary}
            containerColor={form.icon === icon ? theme.colors.primary : 'transparent'}
          />
        ))}
      </View>

      <Text variant="titleMedium" style={styles.sectionTitle}>Pick a Color</Text>
      <View style={styles.row}>
        {THEME_COLORS.map((color) => (
          <IconButton
            key={color}
            icon="circle"
            iconColor={color}
            size={32}
            mode={form.color === color ? 'contained' : 'standard'}
            onPress={() => setForm({ ...form, color: color })}
            style={form.color === color ? { borderWidth: 2, borderColor: theme.colors.primary } : {}}
          />
        ))}
      </View>

      <Button 
        mode="contained" 
        onPress={handleSave} 
        style={styles.button}
        contentStyle={{ height: 50 }}
        labelStyle={{ fontFamily: 'Geist-Bold' }}
      >
        {isFirstProfile ? "Create My Profile" : "Add Member"}
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  header: { marginBottom: 32, marginTop: 40 },
  input: { marginBottom: 20 },
  sectionTitle: { marginTop: 10, marginBottom: 10, fontFamily: 'Geist-SemiBold' },
  row: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 24 },
  button: { marginTop: 20, marginBottom: 50 },
});
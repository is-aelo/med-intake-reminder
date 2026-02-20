// src/screens/HistoryScreen.js
import React, { useMemo, useState } from 'react';
import { View, StyleSheet, SafeAreaView, StatusBar, SectionList } from 'react-native';
import { Text, Surface, useTheme, Avatar, TouchableRipple, Searchbar, IconButton, Portal, Dialog, Button } from 'react-native-paper';
import { useQuery, useRealm } from '@realm/react';
import { MedicationLog } from '../models/Schemas';
import { format, isToday, isYesterday, isValid } from 'date-fns';
import { ScreenHeader } from '../components/ScreenHeader';

const HistoryScreen = () => {
  const theme = useTheme();
  const realm = useRealm();
  const [searchQuery, setSearchQuery] = useState('');
  const [visible, setVisible] = useState(false); 
  
  const rawLogs = useQuery(MedicationLog).sorted('takenAt', true);

  const groupedLogs = useMemo(() => {
    const filtered = rawLogs.filter(log => 
      log.isValid() && 
      log.medicationName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return filtered.reduce((acc, log) => {
      const rawDate = log.takenAt || log.scheduledAt;
      const date = rawDate instanceof Date ? rawDate : new Date(rawDate);
      if (!isValid(date)) return acc;

      let title = isToday(date) ? 'Today' : isYesterday(date) ? 'Yesterday' : format(date, 'MMMM d, yyyy');
      const existingGroup = acc.find(g => g.title === title);
      const logData = {
        _id: log._id.toString(),
        medicationName: log.medicationName,
        displayTime: format(date, 'p'),
        status: log.status?.toLowerCase() || 'taken',
      };

      if (existingGroup) {
        existingGroup.data.push(logData);
      } else {
        acc.push({ title, data: [logData] });
      }
      return acc;
    }, []);
  }, [rawLogs, searchQuery]);

  const handleClearHistory = () => {
    realm.write(() => realm.delete(rawLogs));
    setVisible(false);
  };

  const getStatusConfig = (status) => {
    const configs = {
      taken: { color: theme.colors.primary, icon: 'check-circle-outline', label: 'TAKEN', bg: theme.colors.primaryContainer },
      snoozed: { color: '#E65100', icon: 'clock-outline', label: 'SNOOZED', bg: '#FFF3E0' },
      missed: { color: theme.colors.error, icon: 'close-circle-outline', label: 'MISSED', bg: theme.dark ? '#311010' : '#FFEBEE' },
      skipped: { color: theme.colors.secondary, icon: 'skip-next-circle-outline', label: 'SKIPPED', bg: theme.colors.surfaceVariant }
    };
    return configs[status] || configs.taken;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={theme.dark ? "light-content" : "dark-content"} />
      
      <ScreenHeader 
        title="History" 
        subtitle={rawLogs.length > 0 ? `${rawLogs.length} logs recorded` : null}
        rightElement={
          <IconButton 
            icon="trash-can-outline" 
            iconColor={theme.colors.error} 
            size={24}
            onPress={() => setVisible(true)}
            disabled={rawLogs.length === 0}
          />
        }
      />

      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search logs..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={[styles.searchBar, { backgroundColor: theme.colors.surfaceVariant }]}
          inputStyle={styles.searchInput}
          placeholderTextColor={theme.colors.onSurfaceVariant}
          iconColor={theme.colors.primary}
          elevation={0}
        />
      </View>

      <SectionList
        sections={groupedLogs}
        keyExtractor={(item) => item._id}
        stickySectionHeadersEnabled={false}
        renderItem={({ item }) => {
          const config = getStatusConfig(item.status);
          return (
            <Surface style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]} elevation={0}>
              <TouchableRipple onPress={() => {}} style={styles.ripple} borderless>
                <View style={styles.cardContent}>
                  <View style={styles.leftSection}>
                    <Avatar.Icon size={44} icon={config.icon} color={config.color} style={{ backgroundColor: config.bg }} />
                    <View style={styles.textContainer}>
                      <Text variant="titleMedium" style={[styles.medName, { color: theme.colors.onSurface }]}>{item.medicationName}</Text>
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'Geist-Regular' }}>{item.displayTime}</Text>
                    </View>
                  </View>
                  <View style={[styles.customBadge, { backgroundColor: config.bg }]}>
                    <Text style={[styles.badgeText, { color: config.color }]}>{config.label}</Text>
                  </View>
                </View>
              </TouchableRipple>
            </Surface>
          );
        }}
        renderSectionHeader={({ section: { title } }) => (
          <View style={styles.sectionHeader}>
            <Text variant="labelLarge" style={[styles.sectionText, { color: theme.colors.secondary }]}>{title}</Text>
          </View>
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Avatar.Icon size={64} icon="layers-off-outline" style={{ backgroundColor: 'transparent' }} color={theme.colors.outline} />
            <Text variant="titleMedium" style={{ color: theme.colors.outline, fontFamily: 'Geist-Medium', marginTop: 8 }}>
              {searchQuery ? "No matching records" : "No medication history yet"}
            </Text>
          </View>
        }
      />

      <Portal>
        <Dialog visible={visible} onDismiss={() => setVisible(false)} style={[styles.dialog, { backgroundColor: theme.colors.elevation.level3 }]}>
          {/* Changed Icon to alert-circle-outline for a cleaner warning look */}
          <Dialog.Icon icon="alert-circle-outline" color={theme.colors.error} size={48} />
          <Dialog.Title style={styles.dialogTitle}>Clear all history?</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ textAlign: 'center', color: theme.colors.onSurfaceVariant }}>
              This will permanently delete all logs. You won't be able to recover this data.
            </Text>
          </Dialog.Content>
          <Dialog.Actions style={styles.dialogActions}>
            <Button onPress={() => setVisible(false)} textColor={theme.colors.onSurfaceVariant} style={styles.dialogBtn}>Cancel</Button>
            <Button 
              mode="contained" 
              onPress={handleClearHistory} 
              buttonColor={theme.colors.error} 
              textColor="#FFF" 
              style={styles.dialogBtn}
            >
              Clear
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchContainer: { paddingHorizontal: 20, paddingBottom: 8 },
  searchBar: { borderRadius: 16, height: 48 },
  searchInput: { fontSize: 15, fontFamily: 'Geist-Regular' },
  listContent: { paddingHorizontal: 20, paddingBottom: 100 },
  sectionHeader: { marginTop: 20, marginBottom: 12, marginLeft: 4 },
  sectionText: { letterSpacing: 1.2, textTransform: 'uppercase', fontFamily: 'Geist-Bold', fontSize: 12 },
  card: { borderRadius: 20, marginBottom: 8, borderWidth: 1, overflow: 'hidden' },
  ripple: { padding: 14 },
  cardContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  leftSection: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  textContainer: { marginLeft: 16 },
  medName: { fontFamily: 'Geist-SemiBold', fontSize: 17 },
  customBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, minWidth: 70, alignItems: 'center' },
  badgeText: { fontSize: 10, fontFamily: 'Geist-Bold' },
  emptyContainer: { marginTop: 120, justifyContent: 'center', alignItems: 'center' },
  dialog: { borderRadius: 28, padding: 8 },
  dialogTitle: { textAlign: 'center', fontFamily: 'Geist-Bold' },
  dialogActions: { justifyContent: 'center', gap: 8, paddingBottom: 16 },
  dialogBtn: { flex: 1, borderRadius: 12 }
});

export default HistoryScreen;
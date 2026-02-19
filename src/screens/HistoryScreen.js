import React, { useMemo, useState } from 'react';
import { View, StyleSheet, SafeAreaView, StatusBar, SectionList, Alert } from 'react-native';
import { Text, Surface, useTheme, Avatar, TouchableRipple, Searchbar, IconButton, Portal, Dialog, Button } from 'react-native-paper';
import { useQuery, useRealm } from '@realm/react';
import { MedicationLog } from '../models/Schemas';
import { format, isToday, isYesterday } from 'date-fns';

const HistoryScreen = () => {
  const theme = useTheme();
  const realm = useRealm();
  const [searchQuery, setSearchQuery] = useState('');
  const [visible, setVisible] = useState(false); // For Delete Confirmation
  
  const rawLogs = useQuery(MedicationLog).sorted('takenAt', true);

  // Grouping & Search Logic
  const groupedLogs = useMemo(() => {
    const filtered = rawLogs.filter(log => 
      log.isValid() && 
      log.medicationName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return filtered.reduce((acc, log) => {
      const date = new Date(log.takenAt);
      let title = isToday(date) ? 'Today' : isYesterday(date) ? 'Yesterday' : format(date, 'MMMM d, yyyy');

      const existingGroup = acc.find(g => g.title === title);
      const logData = {
        _id: log._id.toString(),
        medicationName: log.medicationName,
        displayTime: format(date, 'p'),
        status: log.status?.toLowerCase() || 'taken',
      };

      if (existingGroup) existingGroup.data.push(logData);
      else acc.push({ title, data: [logData] });
      
      return acc;
    }, []);
  }, [rawLogs, searchQuery]);

  // Function to wipe history
  const handleClearHistory = () => {
    realm.write(() => {
      realm.delete(rawLogs);
    });
    setVisible(false);
  };

  const getStatusConfig = (status) => {
    const configs = {
      taken: { color: '#2E7D32', icon: 'check-circle', label: 'TAKEN', bg: '#F1F8E9' },
      snoozed: { color: '#EF6C00', icon: 'clock-outline', label: 'SNOOZED', bg: '#FFF3E0' },
      missed: { color: '#D32F2F', icon: 'alert-circle-outline', label: 'MISSED', bg: '#FFEBEE' },
    };
    return configs[status] || configs.taken;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header with Title and Clear Action */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text variant="displaySmall" style={styles.headerTitle}>History</Text>
          <IconButton 
            icon="trash-can-outline" 
            iconColor={theme.colors.error} 
            size={24}
            onPress={() => setVisible(true)}
            disabled={rawLogs.length === 0}
          />
        </View>
        
        <Searchbar
          placeholder="Search medications..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
          inputStyle={styles.searchInput}
          elevation={0}
        />
      </View>

      <SectionList
        sections={groupedLogs}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => {
          const config = getStatusConfig(item.status);
          return (
            <Surface style={styles.card} elevation={0}>
              <TouchableRipple onPress={() => {}} style={styles.ripple}>
                <View style={styles.cardContent}>
                  <View style={styles.leftSection}>
                    <Avatar.Icon size={40} icon={config.icon} color={config.color} style={{ backgroundColor: config.bg }} />
                    <View style={styles.textContainer}>
                      <Text variant="titleMedium" style={styles.medName}>{item.medicationName}</Text>
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{item.displayTime}</Text>
                    </View>
                  </View>
                  <View style={[styles.customBadge, { borderColor: config.color }]}>
                    <Text style={[styles.badgeText, { color: config.color }]}>{config.label}</Text>
                  </View>
                </View>
              </TouchableRipple>
            </Surface>
          );
        }}
        renderSectionHeader={({ section: { title } }) => (
          <View style={styles.sectionHeader}>
            <Text variant="labelLarge" style={styles.sectionText}>{title}</Text>
          </View>
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Avatar.Icon size={64} icon="history" style={{ backgroundColor: 'transparent' }} color={theme.colors.outlineVariant} />
            <Text variant="titleMedium" style={{ color: theme.colors.outline }}>{searchQuery ? "No matches" : "History is empty"}</Text>
          </View>
        }
      />

      {/* Delete Confirmation Dialog */}
      <Portal>
        <Dialog visible={visible} onDismiss={() => setVisible(false)} style={styles.dialog}>
          <Dialog.Title style={{ fontWeight: 'bold' }}>Clear History?</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">This will permanently delete all medication logs. This action cannot be undone.</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setVisible(false)} textColor={theme.colors.onSurfaceVariant}>Cancel</Button>
            <Button onPress={handleClearHistory} textColor={theme.colors.error} mode="contained-tonal" style={{ marginLeft: 8 }}>Clear All</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 24, paddingTop: 40, paddingBottom: 15, backgroundColor: '#FFF' },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  headerTitle: { fontWeight: '900', letterSpacing: -1 },
  searchBar: { backgroundColor: '#F5F5F5', borderRadius: 12, height: 45 },
  searchInput: { fontSize: 14, minHeight: 0 },
  listContent: { paddingHorizontal: 20, paddingBottom: 100 },
  sectionHeader: { marginTop: 24, marginBottom: 12, marginLeft: 4 },
  sectionText: { opacity: 0.5, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 'bold' },
  card: { borderRadius: 16, backgroundColor: '#FFFFFF', marginBottom: 8, borderWidth: 1, borderColor: '#F0F0F0' },
  ripple: { padding: 12 },
  cardContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  leftSection: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  textContainer: { marginLeft: 12 },
  medName: { fontWeight: '700' },
  customBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1.2, minWidth: 75, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 10, fontWeight: '900', includeFontPadding: false, textAlignVertical: 'center' },
  emptyContainer: { marginTop: 100, justifyContent: 'center', alignItems: 'center' },
  dialog: { borderRadius: 24, backgroundColor: '#FFF' },
});

export default HistoryScreen;
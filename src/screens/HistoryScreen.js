import React, { useMemo } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { Text, List, Surface, Chip, useTheme } from 'react-native-paper';
import { useQuery } from '@realm/react';
import { MedicationLog } from '../models/Schemas';

const HistoryScreen = () => {
  const theme = useTheme();
  
  const rawLogs = useQuery(MedicationLog).sorted('takenAt', true);

  // FIXED: Ginamit ang .filter() ng JS imbes na .filtered() string ni Realm
  const safeLogs = useMemo(() => {
    return rawLogs
      .filter(log => log.isValid()) // JS check ito, hindi Realm string
      .map(log => ({
        _id: log._id.toString(),
        medicationName: log.medicationName,
        takenAt: log.takenAt,
        status: log.status,
      }));
  }, [rawLogs]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'taken': return theme.colors.primary;
      case 'snoozed': return theme.colors.secondary;
      case 'missed': return theme.colors.error; 
      default: return theme.colors.onSurfaceVariant;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.headerContainer, { backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.outlineVariant }]}>
        <Text variant="headlineMedium" style={{ color: theme.colors.onSurface, fontWeight: 'bold' }}>History Log</Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Your medication consistency</Text>
      </View>
      
      {safeLogs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <List.Icon icon="clipboard-text-outline" color={theme.colors.outline} />
          <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>No records found yet.</Text>
        </View>
      ) : (
        <FlatList
          data={safeLogs}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
              <List.Item
                title={item.medicationName}
                titleStyle={{ color: theme.colors.onSurface, fontWeight: '600' }}
                description={`Taken: ${item.takenAt ? new Date(item.takenAt).toLocaleString() : 'N/A'}`}
                left={props => (
                  <View style={styles.iconCircle}>
                    <List.Icon {...props} icon="check-decagram" color={getStatusColor(item.status)} />
                  </View>
                )}
                right={() => (
                  <View style={styles.statusContainer}>
                    <Chip 
                      textStyle={{ color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' }} 
                      style={{ backgroundColor: getStatusColor(item.status), height: 24 }}
                    >
                      {item.status.toUpperCase()}
                    </Chip>
                  </View>
                )}
              />
            </Surface>
          )}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerContainer: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 20, elevation: 2 },
  listContent: { padding: 16, paddingBottom: 100 },
  card: { borderRadius: 16, overflow: 'hidden' },
  iconCircle: { justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  statusContainer: { justifyContent: 'center', paddingRight: 8 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', opacity: 0.5 }
});

export default HistoryScreen;
import React from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { Text, List, Surface, Chip, useTheme } from 'react-native-paper';
import { useQuery } from '@realm/react';
import { MedicationLog } from '../models/Schemas';

const HistoryScreen = () => {
  const theme = useTheme(); // Dito natin kukunin ang Forest/Sage colors
  const logs = useQuery(MedicationLog).sorted('takenAt', true);

  const getStatusColor = (status) => {
    switch (status) {
      case 'taken': return theme.colors.primary; // Forest Green
      case 'snoozed': return theme.colors.secondary; // Sage
      case 'missed': return theme.colors.error; 
      default: return theme.colors.onSurfaceVariant;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.headerContainer, { backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.outlineVariant }]}>
        <Text variant="headlineMedium" style={{ color: theme.colors.onSurface, fontFamily: 'Geist-Bold' }}>History Log</Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'Geist-Regular' }}>Your medication consistency</Text>
      </View>
      
      {logs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <List.Icon icon="clipboard-text-outline" color={theme.colors.outline} />
          <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>No records found yet.</Text>
        </View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => item._id.toString()}
          renderItem={({ item }) => (
            <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
              <List.Item
                title={item.medicationName}
                titleStyle={{ color: theme.colors.onSurface, fontFamily: 'Geist-SemiBold' }}
                descriptionStyle={{ fontFamily: 'Geist-Regular' }}
                description={`Taken: ${item.takenAt.toLocaleString()}`}
                left={props => (
                  <View style={styles.iconCircle}>
                    <List.Icon {...props} icon="check-decagram" color={getStatusColor(item.status)} />
                  </View>
                )}
                right={() => (
                  <View style={styles.statusContainer}>
                    <Chip 
                      textStyle={{ color: theme.colors.onPrimary, fontSize: 10, fontFamily: 'Geist-Bold' }} 
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
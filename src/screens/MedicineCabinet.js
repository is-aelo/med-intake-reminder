// src/screens/MedicineCabinet.js
import React from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import { Text, IconButton, useTheme, Surface, Badge, TouchableRipple } from 'react-native-paper';
import { useQuery, useRealm } from '@realm/react';
import { Medication } from '../models/Schemas';
import { ScreenHeader } from '../components/ScreenHeader';

export default function MedicineCabinet({ onBack, onEditMedication }) {
  const theme = useTheme();
  const realm = useRealm();
  const allMeds = useQuery(Medication);

  const deleteMed = (med) => {
    Alert.alert('Delete Medication', `Are you sure you want to remove ${med.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Delete', 
        style: 'destructive', 
        onPress: () => realm.write(() => realm.delete(med)) 
      },
    ]);
  };

  const renderMedItem = ({ item }) => {
    const isLowStock = item.isInventoryEnabled && item.stock <= item.reorderLevel;

    // Mapping colors based on theme.js constants
    const statusBg = item.isActive 
      ? theme.colors.primaryContainer 
      : theme.colors.surfaceVariant;
    
    const statusTextColor = item.isActive 
      ? theme.colors.primary 
      : theme.colors.onSurfaceVariant;

    return (
      <Surface 
        style={[
          styles.medCard, 
          { 
            backgroundColor: theme.colors.elevation.level1,
            borderColor: theme.colors.outlineVariant 
          }
        ]} 
        elevation={1}
      >
        <TouchableRipple
          onPress={() => onEditMedication(item._id)}
          rippleColor={theme.colors.onSurfaceVariant}
          style={{ borderRadius: 20 }}
        >
          <View style={styles.cardInner}>
            {/* Left Icon Section */}
            <View style={[styles.iconContainer, { backgroundColor: theme.colors.secondaryContainer }]}>
              <IconButton icon="pill" iconColor={theme.colors.secondary} size={24} />
            </View>

            {/* Middle Info Section */}
            <View style={styles.infoSection}>
              <Text variant="titleMedium" style={[styles.medName, { color: theme.colors.onSurface }]}>
                {item.name}
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {item.dosage} {item.unit} • {item.category}
              </Text>
              
              <View style={styles.badgeRow}>
                <Badge 
                  visible={true}
                  style={[
                    styles.statusBadge, 
                    { 
                      backgroundColor: statusBg,
                      color: statusTextColor,
                    }
                  ]}
                >
                  {item.isActive ? 'Active' : 'Inactive'}
                </Badge>

                {item.isInventoryEnabled && (
                  <Badge 
                    style={[
                      styles.stockBadge,
                      { 
                        backgroundColor: isLowStock ? theme.colors.errorContainer : theme.colors.primaryContainer,
                        color: isLowStock ? theme.colors.onErrorContainer : theme.colors.primary
                      }
                    ]}
                  >
                    {item.stock} left
                  </Badge>
                )}
              </View>
            </View>

            {/* Right Actions Section (Horizontal) */}
            <View style={styles.actionSection}>
               <IconButton 
                icon="pencil-outline" 
                size={22} 
                iconColor={theme.colors.onSurfaceVariant}
                onPress={() => onEditMedication(item._id)} 
                style={styles.actionBtn}
              />
              <IconButton 
                icon="delete-outline" 
                size={22} 
                iconColor={theme.colors.error} 
                onPress={() => deleteMed(item)} 
                style={styles.actionBtn}
              />
            </View>
          </View>
        </TouchableRipple>
      </Surface>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScreenHeader title="Medicine Cabinet" onBack={onBack} />
      
      <FlatList
        data={allMeds}
        keyExtractor={(item) => item._id.toHexString()}
        renderItem={renderMedItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <Text variant="labelLarge" style={[styles.headerLabel, { color: theme.colors.secondary }]}>
            YOUR MEDICATIONS ({allMeds.length})
          </Text>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Surface style={[styles.emptyIconCircle, { backgroundColor: theme.colors.elevation.level1 }]} elevation={0}>
              <IconButton icon="database-off" size={40} iconColor={theme.colors.onSurfaceVariant} style={{ opacity: 0.5 }} />
            </Surface>
            <Text variant="titleMedium" style={{ marginTop: 16, color: theme.colors.onSurface, opacity: 0.7 }}>
              Cabinet is empty
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Add a new medicine to see it here.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerLabel: { marginHorizontal: 20, marginBottom: 16, marginTop: 12, letterSpacing: 1.2 },
  listContent: { paddingHorizontal: 16, paddingBottom: 100 },
  medCard: { 
    marginBottom: 12, 
    borderRadius: 20, 
    borderWidth: 1,
    overflow: 'hidden'
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoSection: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  medName: {
    fontWeight: 'bold',
    fontSize: 17,
    marginBottom: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    height: 22,
    borderRadius: 6,
    fontSize: 11,
    fontWeight: '600',
    alignSelf: 'flex-start',
  },
  stockBadge: {
    paddingHorizontal: 10,
    height: 22,
    borderRadius: 6,
    fontSize: 11,
    alignSelf: 'flex-start',
    fontWeight: '600',
  },
  actionSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
  },
  actionBtn: {
    margin: 0,
    width: 36,
  },
  emptyState: { 
    alignItems: 'center', 
    marginTop: 100 
  },
  emptyIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
  }
});
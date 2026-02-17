import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Modal, Portal, Text, Button, useTheme, IconButton } from 'react-native-paper';

export const ConfirmationModal = ({ 
  visible, 
  onDismiss, 
  onConfirm, 
  title, 
  message, 
  confirmLabel = "Delete",
  icon = "alert-circle"
}) => {
  const theme = useTheme();

  return (
    <Portal>
      <Modal 
        visible={visible} 
        onDismiss={onDismiss} 
        contentContainerStyle={[styles.container, { backgroundColor: theme.colors.surface }]}
      >
        <View style={styles.content}>
          <IconButton icon={icon} iconColor={theme.colors.error} size={40} style={styles.icon} />
          
          <Text variant="headlineSmall" style={styles.title}>{title}</Text>
          <Text variant="bodyMedium" style={[styles.message, { color: theme.colors.onSurfaceVariant }]}>
            {message}
          </Text>

          <View style={styles.actions}>
            <Button 
              mode="outlined" 
              onPress={onDismiss} 
              style={styles.button}
              textColor={theme.colors.primary}
            >
              Cancel
            </Button>
            <Button 
              mode="contained" 
              onPress={onConfirm} 
              style={styles.button}
              buttonColor={theme.colors.error}
            >
              {confirmLabel}
            </Button>
          </View>
        </View>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 20,
    borderRadius: 28,
    padding: 24,
  },
  content: {
    alignItems: 'center',
  },
  icon: {
    marginBottom: 8,
  },
  title: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  button: {
    flex: 1,
    borderRadius: 12,
  }
});
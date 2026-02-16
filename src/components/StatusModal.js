import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Modal, Portal, Text, Button, useTheme, Avatar } from 'react-native-paper';

export const StatusModal = ({ visible, onDismiss, title, message, type = 'warning' }) => {
  const theme = useTheme();

  const config = {
    warning: { icon: 'clock-alert-outline', color: theme.colors.error },
    success: { icon: 'check-circle-outline', color: theme.colors.primary },
    info: { icon: 'information-outline', color: theme.colors.secondary },
  };

  const current = config[type];

  return (
    <Portal>
      <Modal 
        visible={visible} 
        onDismiss={onDismiss} 
        contentContainerStyle={[styles.modalContent, { backgroundColor: theme.colors.elevation.level3 }]}
      >
        <View style={styles.modalInner}>
          <Avatar.Icon 
            size={64} 
            icon={current.icon} 
            style={{ backgroundColor: 'transparent' }} 
            color={current.color} 
          />
          <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.onSurface }]}>
            {title}
          </Text>
          <Text variant="bodyMedium" style={[styles.message, { color: theme.colors.onSurfaceVariant }]}>
            {message}
          </Text>
          <Button 
            mode="contained" 
            onPress={onDismiss} 
            style={styles.modalButton}
            contentStyle={{ height: 48 }}
          >
            Got it
          </Button>
        </View>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modalContent: { margin: 30, padding: 24, borderRadius: 28, alignItems: 'center' },
  modalInner: { alignItems: 'center', width: '100%' },
  title: { fontFamily: 'Geist-Bold', marginTop: 16, textAlign: 'center' },
  message: { textAlign: 'center', marginTop: 8, marginBottom: 24, lineHeight: 20 },
  modalButton: { width: '100%', borderRadius: 12 },
});
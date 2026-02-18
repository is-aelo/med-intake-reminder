import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Modal, Animated, Easing } from 'react-native';
import { Text, Button, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const AlarmOverlay = ({ isVisible, medication, onTake, onSnooze }) => {
  // Animation logic para sa pulsing icon
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isVisible) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 800,
            useNativeDriver: true,
            easing: Easing.bezier(0.4, 0, 0.6, 1),
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
            easing: Easing.bezier(0.4, 0, 0.6, 1),
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isVisible]);

  return (
    <Modal visible={isVisible} animationType="fade" transparent={false}>
      <View style={[styles.container, { backgroundColor: '#004D40' }]}>
        
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <Surface style={styles.iconContainer} elevation={4}>
            <MaterialCommunityIcons name="pill" size={80} color="#4DB6AC" />
          </Surface>
        </Animated.View>

        <Text style={styles.title}>TIME FOR YOUR MEDICATION</Text>
        
        <View style={styles.medInfo}>
          {/* Siniguradong walang extra spaces sa loob ng Text tags */}
          <Text style={styles.medName}>{medication?.medicationName ?? 'Medication'}</Text>
          <Text style={styles.dosage}>{medication?.dosage ?? '1 Pill'}</Text>
        </View>

        <View style={styles.buttonContainer}>
          <Button 
            mode="contained" 
            onPress={onTake}
            style={styles.takeButton}
            contentStyle={styles.buttonContent}
            labelStyle={styles.buttonLabel}
          >
            I TOOK IT
          </Button>

          <Button 
            mode="outlined" 
            onPress={onSnooze}
            textColor="white"
            style={styles.snoozeButton}
            contentStyle={styles.buttonContent}
            labelStyle={styles.buttonLabel}
          >
            SNOOZE (10m)
          </Button>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  iconContainer: { padding: 30, borderRadius: 100, backgroundColor: 'white', marginBottom: 40 },
  title: { color: '#B2DFDB', fontSize: 14, fontFamily: 'Geist-Bold', letterSpacing: 2, marginBottom: 10 },
  medName: { color: 'white', fontSize: 36, fontWeight: 'bold', textAlign: 'center', lineHeight: 42 },
  dosage: { color: '#B2DFDB', fontSize: 22, marginTop: 8, fontFamily: 'Geist-Medium' },
  medInfo: { alignItems: 'center', marginBottom: 80 },
  buttonContainer: { width: '100%', gap: 16 },
  takeButton: { backgroundColor: '#4DB6AC', borderRadius: 16, elevation: 8 },
  snoozeButton: { borderColor: 'rgba(255,255,255,0.5)', borderRadius: 16, borderWidth: 1.5 },
  buttonContent: { paddingVertical: 12 },
  buttonLabel: { fontSize: 18, fontWeight: 'bold', letterSpacing: 1 },
});

export default AlarmOverlay;
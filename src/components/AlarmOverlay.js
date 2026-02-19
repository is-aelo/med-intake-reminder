// src/components/AlarmOverlay.js
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Modal, Animated, Easing } from 'react-native';
import { Text, Button, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const AlarmOverlay = ({ isVisible, medication, onTake, onSnooze, onSkip }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const loopRef = useRef(null);

  useEffect(() => {
    if (isVisible) {
      loopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.12,
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
        ]),
      );
      loopRef.current.start();
    } else {
      loopRef.current?.stop();
      pulseAnim.setValue(1);
    }

    return () => {
      loopRef.current?.stop();
    };
  }, [isVisible]);

  // Resolve field names from the updated notification data payload
  const medName = medication?.medicationName ?? 'Medication';
  const dosage  = medication?.dosageSnapshot ?? medication?.dosage ?? '—';

  // Format scheduled time for display (e.g. "8:00 AM")
  const scheduledTime = (() => {
    const raw = medication?.scheduledAt;
    if (!raw) return null;
    try {
      return new Date(raw).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return null;
    }
  })();

  return (
    <Modal
      visible={isVisible}
      animationType="fade"
      transparent={false}
      statusBarTranslucent
    >
      <View style={styles.container}>

        {/* Pulsing pill icon */}
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <Surface style={styles.iconContainer} elevation={4}>
            <MaterialCommunityIcons name="pill" size={80} color="#4DB6AC" />
          </Surface>
        </Animated.View>

        {/* Header label */}
        <Text style={styles.title}>TIME FOR YOUR MEDICATION</Text>

        {/* Medication info */}
        <View style={styles.medInfo}>
          <Text style={styles.medName}>{medName}</Text>
          <Text style={styles.dosage}>{dosage}</Text>
          {scheduledTime ? (
            <View style={styles.timeRow}>
              <MaterialCommunityIcons
                name="clock-outline"
                size={16}
                color="#80CBC4"
                style={{ marginRight: 4 }}
              />
              <Text style={styles.scheduledTime}>Scheduled at {scheduledTime}</Text>
            </View>
          ) : null}
        </View>

        {/* Action buttons */}
        <View style={styles.buttonContainer}>
          <Button
            mode="contained"
            onPress={onTake}
            style={styles.takeButton}
            contentStyle={styles.buttonContent}
            labelStyle={styles.buttonLabel}
            icon="check-circle-outline"
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
            icon="alarm-snooze"
          >
            SNOOZE (10m)
          </Button>

          <Button
            mode="text"
            onPress={onSkip}
            textColor="#80CBC4"
            style={styles.skipButton}
            contentStyle={styles.buttonContent}
            labelStyle={styles.skipLabel}
            icon="close-circle-outline"
          >
            SKIP THIS DOSE
          </Button>
        </View>

      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    backgroundColor: '#004D40',
  },
  iconContainer: {
    padding: 30,
    borderRadius: 100,
    backgroundColor: 'white',
    marginBottom: 40,
  },
  title: {
    color: '#B2DFDB',
    fontSize: 13,
    fontFamily: 'Geist-Bold',
    letterSpacing: 2,
    marginBottom: 10,
    textAlign: 'center',
  },
  medInfo: {
    alignItems: 'center',
    marginBottom: 60,
  },
  medName: {
    color: 'white',
    fontSize: 36,
    fontFamily: 'Geist-Bold',
    textAlign: 'center',
    lineHeight: 42,
  },
  dosage: {
    color: '#B2DFDB',
    fontSize: 22,
    marginTop: 8,
    fontFamily: 'Geist-Medium',
    textAlign: 'center',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  scheduledTime: {
    color: '#80CBC4',
    fontSize: 14,
    fontFamily: 'Geist-Regular',
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  takeButton: {
    backgroundColor: '#4DB6AC',
    borderRadius: 16,
    elevation: 8,
  },
  snoozeButton: {
    borderColor: 'rgba(255,255,255,0.5)',
    borderRadius: 16,
    borderWidth: 1.5,
  },
  skipButton: {
    borderRadius: 16,
  },
  buttonContent: {
    paddingVertical: 12,
  },
  buttonLabel: {
    fontSize: 16,
    fontFamily: 'Geist-Bold',
    letterSpacing: 1,
  },
  skipLabel: {
    fontSize: 14,
    fontFamily: 'Geist-Medium',
    letterSpacing: 1,
  },
});

export default AlarmOverlay;
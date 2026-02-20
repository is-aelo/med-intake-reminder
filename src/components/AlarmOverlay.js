// src/components/AlarmOverlay.js
import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Modal, Animated, Easing } from 'react-native';
import { Text, Button, useTheme, Surface, Portal } from 'react-native-paper'; // Import Portal
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusModal } from './StatusModal';

const AlarmOverlay = ({ isVisible, medication, onTake, onSnooze, onSkip }) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [elapsed, setElapsed] = useState(0);
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const iconBounce = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let timer;
    if (isVisible) {
      setElapsed(0);
      timer = setInterval(() => setElapsed(prev => prev + 1), 1000);

      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 8, useNativeDriver: true }),
        Animated.loop(
          Animated.sequence([
            Animated.timing(iconBounce, { toValue: -10, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            Animated.timing(iconBounce, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          ])
        ).start()
      ]).start();
    } else {
      clearInterval(timer);
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.9);
      setShowSkipConfirm(false);
    }
    return () => clearInterval(timer);
  }, [isVisible]);

  const formatElapsed = (s) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const medName = medication?.medicationName ?? 'Medication';
  const dosage = medication?.dosageSnapshot ?? '—';

  return (
    <Modal visible={isVisible} animationType="none" transparent={false} statusBarTranslucent>
      {/* Portal.Host here is the secret sauce for Modals inside Modals */}
      <Portal.Host>
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
          
          <View style={[styles.topAccent, { backgroundColor: theme.colors.primaryContainer, opacity: 0.4 }]} />

          <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
            
            <View style={styles.timerWrapper}>
              <MaterialCommunityIcons name="clock-fast" size={16} color={theme.colors.secondary} />
              <Text style={[styles.timerText, { color: theme.colors.secondary }]}>
                Ringing for {formatElapsed(elapsed)}
              </Text>
            </View>

            <Animated.View style={{ transform: [{ translateY: iconBounce }] }}>
              <Surface style={[styles.iconSurface, { backgroundColor: theme.colors.surface }]} elevation={2}>
                <MaterialCommunityIcons name="pill" size={56} color={theme.colors.primary} />
              </Surface>
            </Animated.View>

            <View style={styles.mainInfo}>
              <Text variant="headlineSmall" style={[styles.medName, { color: theme.colors.onSurface }]}>
                {medName}
              </Text>
              <Surface style={[styles.dosageChip, { backgroundColor: theme.colors.surfaceVariant }]} elevation={0}>
                <Text variant="titleMedium" style={{ color: theme.colors.primary, fontFamily: 'Geist-Bold' }}>
                  {dosage}
                </Text>
              </Surface>
            </View>

            {medication?.snoozeCount > 0 && (
              <Text style={[styles.snoozeText, { color: theme.colors.onSurfaceVariant }]}>
                Snoozed {medication.snoozeCount} times
              </Text>
            )}
          </Animated.View>

          <View style={[styles.footer, { paddingBottom: insets.bottom + 30 }]}>
            <Button
              mode="contained"
              onPress={onTake}
              style={styles.btnLarge}
              contentStyle={styles.btnContentLarge}
              labelStyle={styles.btnLabelLarge}
            >
              I've taken this
            </Button>

            <View style={styles.row}>
              <Button
                mode="outlined"
                onPress={onSnooze}
                style={[styles.btnHalf, { borderColor: theme.colors.outline }]}
                contentStyle={styles.btnContentSmall}
                labelStyle={{ fontFamily: 'Geist-Medium' }}
                textColor={theme.colors.onSurface}
              >
                Snooze
              </Button>
              
              <Button
                mode="outlined"
                onPress={() => setShowSkipConfirm(true)}
                style={[styles.btnHalf, { borderColor: theme.colors.outline }]}
                contentStyle={styles.btnContentSmall}
                labelStyle={{ fontFamily: 'Geist-Medium' }}
                textColor={theme.colors.error}
              >
                Skip
              </Button>
            </View>
          </View>

          <StatusModal 
            visible={showSkipConfirm}
            onDismiss={() => setShowSkipConfirm(false)}
            onConfirm={() => {
              setShowSkipConfirm(false);
              onSkip();
            }}
            type="warning"
            title="Skip this dose?"
            message={`Are you sure you want to skip your dose of ${medName}?`}
            confirmLabel="Skip Dose"
          />
        </View>
      </Portal.Host>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'space-between' },
  topAccent: { position: 'absolute', top: -100, left: -50, right: -50, height: 300, borderRadius: 150 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  timerWrapper: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 40 },
  timerText: { fontSize: 14, fontFamily: 'Geist-Bold', letterSpacing: 1 },
  iconSurface: { width: 120, height: 120, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 30 },
  mainInfo: { alignItems: 'center', gap: 12 },
  medName: { textAlign: 'center', fontSize: 32, fontFamily: 'Geist-Bold' },
  dosageChip: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 16 },
  snoozeText: { marginTop: 20, fontSize: 12, opacity: 0.6, letterSpacing: 1 },
  footer: { paddingHorizontal: 24, gap: 12 },
  btnLarge: { borderRadius: 24 },
  btnContentLarge: { height: 70 },
  btnLabelLarge: { fontSize: 18, fontFamily: 'Geist-Bold' },
  row: { flexDirection: 'row', gap: 12 },
  btnHalf: { flex: 1, borderRadius: 20, borderWidth: 1.5 },
  btnContentSmall: { height: 56 },
});

export default AlarmOverlay;
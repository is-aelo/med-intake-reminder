// src/components/AlarmOverlay.js
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Modal, Animated, Easing } from 'react-native';
import { Text, Button, Surface, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const AlarmOverlay = ({ isVisible, medication, onTake, onSnooze, onSkip }) => {
  const theme = useTheme();
  const pulseAnim  = useRef(new Animated.Value(1)).current;
  const fadeAnim   = useRef(new Animated.Value(0)).current;
  const slideAnim  = useRef(new Animated.Value(40)).current;
  const loopRef    = useRef(null);

  // ── Pulse loop ───────────────────────────────
  useEffect(() => {
    if (isVisible) {
      // Entrance animation
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 10, useNativeDriver: true }),
      ]).start();

      // Pulse loop
      loopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            easing: Easing.bezier(0.4, 0, 0.6, 1),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            easing: Easing.bezier(0.4, 0, 0.6, 1),
            useNativeDriver: true,
          }),
        ]),
      );
      loopRef.current.start();
    } else {
      loopRef.current?.stop();
      pulseAnim.setValue(1);
      fadeAnim.setValue(0);
      slideAnim.setValue(40);
    }

    return () => loopRef.current?.stop();
  }, [isVisible]);

  // ── Data ────────────────────────────────────
  const medName  = medication?.medicationName ?? 'Medication';
  const dosage   = medication?.dosageSnapshot ?? medication?.dosage ?? '—';
  const snoozeCount = medication?.snoozeCount ?? 0;

  const scheduledTime = (() => {
    const raw = medication?.scheduledAt ?? medication?.originalScheduledAt;
    if (!raw) return null;
    try {
      return new Date(raw).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch { return null; }
  })();

  const snoozedMinutes = (() => {
    const orig = medication?.originalScheduledAt;
    const curr = medication?.scheduledAt;
    if (!orig || !curr) return null;
    const diff = Math.round((new Date(curr) - new Date(orig)) / 60000);
    return diff > 0 ? diff : null;
  })();

  // ── Colors (from theme) ─────────────────────
  const isDark = theme.dark;
  const bg          = isDark ? '#0D110D' : '#0A2818'; // deep forest always for alarm
  const surface1    = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.10)';
  const surface2    = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.06)';
  const accentGreen = theme.colors.primary;      // #2D5A27 light / #8BC34A dark
  const mutedText   = 'rgba(255,255,255,0.55)';
  const softText    = 'rgba(255,255,255,0.80)';
  const whiteText   = '#FFFFFF';

  return (
    <Modal visible={isVisible} animationType="none" transparent={false} statusBarTranslucent>
      <View style={[styles.container, { backgroundColor: bg }]}>

        {/* ── Decorative background rings ── */}
        <View style={styles.ring1} />
        <View style={styles.ring2} />

        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], alignItems: 'center', width: '100%' }}>

          {/* ── Snooze badge ── */}
          {snoozeCount > 0 && (
            <View style={[styles.snoozeBadge, { backgroundColor: 'rgba(255,183,77,0.15)', borderColor: 'rgba(255,183,77,0.35)' }]}>
              <MaterialCommunityIcons name="alarm-snooze" size={13} color="#FFB74D" style={{ marginRight: 5 }} />
              <Text style={styles.snoozeBadgeText}>
                Snoozed {snoozeCount}× {snoozedMinutes ? `· +${snoozedMinutes} min late` : ''}
              </Text>
            </View>
          )}

          {/* ── Pulsing icon ── */}
          <Animated.View style={[styles.iconWrap, { transform: [{ scale: pulseAnim }] }]}>
            {/* Outer glow ring */}
            <View style={[styles.iconRing, { borderColor: 'rgba(141,195,74,0.25)' }]} />
            <View style={[styles.iconInner, { backgroundColor: surface1 }]}>
              <MaterialCommunityIcons name="pill" size={52} color={isDark ? '#8BC34A' : '#6FCF97'} />
            </View>
          </Animated.View>

          {/* ── Label ── */}
          <Text style={[styles.label, { color: mutedText }]}>TIME FOR YOUR MEDICATION</Text>

          {/* ── Med card ── */}
          <View style={[styles.medCard, { backgroundColor: surface1, borderColor: 'rgba(255,255,255,0.08)' }]}>
            <Text style={[styles.medName, { color: whiteText }]}>{medName}</Text>
            <View style={styles.divider} />

            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <MaterialCommunityIcons name="pill" size={14} color={mutedText} />
                <Text style={[styles.metaLabel, { color: mutedText }]}>DOSE</Text>
                <Text style={[styles.metaValue, { color: softText }]}>{dosage}</Text>
              </View>

              {scheduledTime && (
                <>
                  <View style={[styles.metaDivider, { backgroundColor: 'rgba(255,255,255,0.12)' }]} />
                  <View style={styles.metaItem}>
                    <MaterialCommunityIcons name="clock-outline" size={14} color={mutedText} />
                    <Text style={[styles.metaLabel, { color: mutedText }]}>SCHEDULED</Text>
                    <Text style={[styles.metaValue, { color: softText }]}>
                      {scheduledTime}
                      {snoozedMinutes ? (
                        <Text style={{ color: '#FFB74D', fontSize: 11 }}> (+{snoozedMinutes}m)</Text>
                      ) : null}
                    </Text>
                  </View>
                </>
              )}
            </View>
          </View>

          {/* ── Buttons ── */}
          <View style={styles.buttonStack}>
            {/* Take */}
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <Button
                mode="contained"
                onPress={onTake}
                style={[styles.takeButton, { backgroundColor: isDark ? '#8BC34A' : '#4CAF82' }]}
                contentStyle={styles.btnContent}
                labelStyle={[styles.btnLabel, { color: isDark ? '#0A1B07' : '#FFFFFF' }]}
                icon="check-circle-outline"
              >
                I Took It
              </Button>
            </Animated.View>

            {/* Snooze */}
            <Button
              mode="outlined"
              onPress={onSnooze}
              style={[styles.snoozeButton, { borderColor: 'rgba(255,255,255,0.28)' }]}
              contentStyle={styles.btnContent}
              labelStyle={[styles.btnLabel, { color: whiteText }]}
              icon="alarm-snooze"
              textColor={whiteText}
            >
              Snooze 10 min
            </Button>

            {/* Skip */}
            <Button
              mode="text"
              onPress={onSkip}
              style={styles.skipButton}
              contentStyle={{ paddingVertical: 4 }}
              labelStyle={[styles.skipLabel, { color: mutedText }]}
              textColor={mutedText}
            >
              Skip this dose
            </Button>
          </View>

        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    overflow: 'hidden',
  },

  // ── Decorative rings ─────────────────────────
  ring1: {
    position: 'absolute',
    width: 500,
    height: 500,
    borderRadius: 250,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    top: -120,
    right: -120,
  },
  ring2: {
    position: 'absolute',
    width: 360,
    height: 360,
    borderRadius: 180,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
    bottom: -80,
    left: -80,
  },

  // ── Snooze badge ─────────────────────────────
  snoozeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 28,
  },
  snoozeBadgeText: {
    color: '#FFB74D',
    fontSize: 12,
    fontFamily: 'Geist-Medium',
    letterSpacing: 0.3,
  },

  // ── Icon ─────────────────────────────────────
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  iconRing: {
    position: 'absolute',
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 1.5,
  },
  iconInner: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Label ────────────────────────────────────
  label: {
    fontSize: 11,
    fontFamily: 'Geist-Bold',
    letterSpacing: 2.5,
    marginBottom: 18,
    textAlign: 'center',
  },

  // ── Med card ─────────────────────────────────
  medCard: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    marginBottom: 36,
  },
  medName: {
    fontSize: 30,
    fontFamily: 'Geist-Bold',
    textAlign: 'center',
    lineHeight: 36,
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 0,
  },
  metaItem: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  metaDivider: {
    width: 1,
    marginHorizontal: 12,
    alignSelf: 'stretch',
  },
  metaLabel: {
    fontSize: 10,
    fontFamily: 'Geist-Bold',
    letterSpacing: 1.5,
    marginTop: 2,
  },
  metaValue: {
    fontSize: 16,
    fontFamily: 'Geist-Medium',
  },

  // ── Buttons ──────────────────────────────────
  buttonStack: {
    width: '100%',
    gap: 10,
  },
  takeButton: {
    borderRadius: 18,
    elevation: 0,
  },
  snoozeButton: {
    borderRadius: 18,
    borderWidth: 1.5,
  },
  skipButton: {
    borderRadius: 18,
  },
  btnContent: {
    paddingVertical: 10,
  },
  btnLabel: {
    fontSize: 15,
    fontFamily: 'Geist-Bold',
    letterSpacing: 0.5,
  },
  skipLabel: {
    fontSize: 13,
    fontFamily: 'Geist-Medium',
    letterSpacing: 0.3,
  },
});

export default AlarmOverlay;
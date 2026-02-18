import React, { useState, useEffect } from 'react';
import { View, StyleSheet, AppState, Text, Animated } from 'react-native';

const PrivacyShield = ({ children }) => {
  const [isPrivacyActive, setIsPrivacyActive] = useState(false);
  const fadeAnim = new Animated.Value(0);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      // Kung ang app ay bumukas (active) pero galing sa "background" o naka-lock kanina
      if (nextAppState === 'active') {
        setIsPrivacyActive(true);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();

        // Optional: Mawawala lang ang blur pagkalipas ng 5 seconds 
        // o kapag clinick ng user (parang security feature)
        /*
        setTimeout(() => {
          setIsPrivacyActive(false);
        }, 5000);
        */
      } else {
        setIsPrivacyActive(false);
        fadeAnim.setValue(0);
      }
    });

    return () => subscription.remove();
  }, []);

  return (
    <View style={{ flex: 1 }}>
      {children}
      
      {isPrivacyActive && (
        <Animated.View 
          style={[
            StyleSheet.absoluteFill, 
            styles.overlay, 
            { opacity: fadeAnim }
          ]}
        >
          {/* Dito mo ilalagay ang "Zen" mode UI mo */}
          <Text style={styles.icon}>💊</Text>
          <Text style={styles.text}>Health Reminder in Progress...</Text>
          <Text style={styles.subtext}>Tap anywhere to unlock dashboard</Text>
          
          <View 
            onStartShouldSetResponder={() => setIsPrivacyActive(false)}
            style={StyleSheet.absoluteFill} 
          />
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.85)', // Solid black na low opacity
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  icon: { fontSize: 50, marginBottom: 20 },
  text: { color: 'white', fontSize: 18, fontWeight: '600' },
  subtext: { color: 'rgba(255,255,255,0.5)', marginTop: 10, fontSize: 12 }
});

export default PrivacyShield;
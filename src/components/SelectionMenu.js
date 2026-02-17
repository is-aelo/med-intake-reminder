import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Menu, TouchableRipple, IconButton, useTheme } from 'react-native-paper';

/**
 * SelectionMenu - Reusable dropdown aligned to anchor width
 */
export const SelectionMenu = ({ visible, onDismiss, onOpen, value, options }) => {
  const theme = useTheme();
  const [menuWidth, setMenuWidth] = useState(0);

  // This function measures the width of the button whenever it is rendered
  const onLayout = (event) => {
    const { width } = event.nativeEvent.layout;
    setMenuWidth(width);
  };

  return (
    <View style={styles.container}>
      <Menu
        visible={visible}
        onDismiss={() => onDismiss(null)}
        // The anchor is wrapped in a View to capture the layout width
        anchor={
          <View onLayout={onLayout} style={{ width: '100%' }}>
            <TouchableRipple
              onPress={onOpen}
              rippleColor="rgba(0, 0, 0, .05)"
              style={[
                styles.anchorBtn,
                {
                  backgroundColor: theme.colors.surface,
                  borderRadius: theme.roundness,
                  borderColor: theme.colors.outlineVariant,
                  borderWidth: 1, // Added border to look more like an input field
                },
              ]}
            >
              <View style={styles.content}>
                <Text
                  style={[
                    styles.valueText,
                    {
                      color: theme.colors.onSurface,
                      fontFamily: theme.fonts.bodyLarge.fontFamily,
                    },
                  ]}
                >
                  {value}
                </Text>
                <IconButton
                  icon="chevron-down"
                  size={20}
                  iconColor={theme.colors.secondary}
                  style={{ margin: 0 }}
                />
              </View>
            </TouchableRipple>
          </View>
        }
        // contentStyle now uses the measured menuWidth to align perfectly
        contentStyle={[
          styles.menuContent,
          { 
            backgroundColor: theme.colors.surface, 
            width: menuWidth, // Forces menu to be exactly as wide as the button
            marginTop: 4      // Tiny gap between button and dropdown
          }
        ]}
      >
        <ScrollView style={styles.menuScroll} keyboardShouldPersistTaps="handled">
          {options.map((option) => (
            <Menu.Item
              key={option}
              onPress={() => onDismiss(option)}
              title={option}
              style={{ maxWidth: menuWidth }} // Ensures text doesn't bleed out
              titleStyle={{
                fontFamily: theme.fonts.bodyLarge.fontFamily,
                color: theme.colors.onSurface,
              }}
            />
          ))}
        </ScrollView>
      </Menu>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  anchorBtn: {
    height: 56,
    justifyContent: 'center',
    paddingLeft: 16,
    paddingRight: 4,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  valueText: {
    fontSize: 16,
  },
  menuContent: {
    // Elevates the menu look
    elevation: 4,
  },
  menuScroll: {
    maxHeight: 250, // Slightly reduced for better mobile handling
  },
});
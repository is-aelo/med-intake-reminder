import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Menu, TouchableRipple, IconButton, useTheme } from 'react-native-paper';

/**
 * SelectionMenu - Reusable dropdown for selecting units, categories, etc.
 * @param {boolean} visible - Controls if the menu is open
 * @param {function} onDismiss - Called when menu closes (returns selected value or null)
 * @param {function} onOpen - Function to show the menu
 * @param {string} value - The currently selected value to display
 * @param {Array} options - List of strings to show in the dropdown
 */
export const SelectionMenu = ({ visible, onDismiss, onOpen, value, options }) => {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <Menu
        visible={visible}
        onDismiss={() => onDismiss(null)} // Close without selecting
        anchor={
          <TouchableRipple 
            onPress={onOpen}
            rippleColor="rgba(0, 0, 0, .05)"
            style={[
              styles.anchorBtn, 
              { 
                backgroundColor: theme.colors.surface, 
                borderRadius: theme.roundness 
              }
            ]}
          >
            <View style={styles.content}>
              <Text 
                style={[
                  styles.valueText, 
                  { 
                    color: theme.colors.primary,
                    fontFamily: theme.fonts.bodyLarge.fontFamily 
                  }
                ]}
              >
                {value}
              </Text>
              <IconButton 
                icon="chevron-down" 
                size={20} 
                iconColor={theme.colors.secondary} 
              />
            </View>
          </TouchableRipple>
        }
        // Style para sa lumalabas na "popover" menu
        contentStyle={{ backgroundColor: theme.colors.background, borderRadius: theme.roundness }}
      >
        <ScrollView style={styles.menuScroll}>
          {options.map((option) => (
            <Menu.Item 
              key={option} 
              onPress={() => onDismiss(option)} 
              title={option}
              titleStyle={{ 
                fontFamily: theme.fonts.bodyLarge.fontFamily,
                color: theme.colors.onSurface 
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
  menuScroll: {
    maxHeight: 300,
  },
});
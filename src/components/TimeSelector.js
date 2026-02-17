import React from 'react';
import { TimePickerModal, DatePickerModal } from 'react-native-paper-dates';
import { useTheme } from 'react-native-paper';

export const TimeSelector = ({ show, value, onChange, onCancel, onInvalidTime }) => {
  const theme = useTheme();

  const hours = value ? value.getHours() : 12;
  const minutes = value ? value.getMinutes() : 0;

const onConfirm = React.useCallback(
  ({ hours: selectedHours, minutes: selectedMinutes }) => {
    const now = new Date();
    const baseDate = new Date(value || new Date());
    
    const targetDateTime = new Date(baseDate);
    targetDateTime.setHours(selectedHours, selectedMinutes, 0, 0);

    // Isara muna ang TimePicker bago mag-trigger ng anuman
    onCancel(); 

    if (targetDateTime.getTime() <= now.getTime()) {
      // Kung nasa past, tawagin ang error modal
      if (onInvalidTime) {
        // Gumamit ng kaunting delay para masiguradong sarado na ang picker modal
        // bago lumabas ang StatusModal (common issue sa React Native modals)
        setTimeout(() => {
          onInvalidTime();
        }, 300);
      }
      
      const adjustedDate = new Date();
      adjustedDate.setMinutes(adjustedDate.getMinutes() + 1);
      adjustedDate.setSeconds(0);
      adjustedDate.setMilliseconds(0);
      onChange(null, adjustedDate);
    } else {
      onChange(null, targetDateTime);
    }
  },
  [onChange, value, onCancel, onInvalidTime]
);

  return (
    <TimePickerModal
      visible={show}
      onDismiss={onCancel}
      onConfirm={onConfirm}
      hours={hours}
      minutes={minutes}
      label="SET REMINDER"
      locale="en"
      theme={theme}
    />
  );
};

export const DateSelector = ({ show, value, onChange, onCancel }) => {
  const theme = useTheme();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <DatePickerModal
      locale="en"
      mode="single"
      visible={show}
      onDismiss={onCancel}
      date={value}
      validRange={{ startDate: today }}
      onConfirm={(params) => {
        const selectedDate = params.date || new Date();
        onChange(selectedDate);
        onCancel();
      }}
      label="Select Start Date"
      theme={theme}
    />
  );
};
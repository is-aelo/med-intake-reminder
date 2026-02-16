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
      
      // 1. Target Date from the form
      const targetDate = new Date(value || new Date());
      
      // 2. Create the Date + Time combination the user wants
      const selectedFullDate = new Date(targetDate);
      selectedFullDate.setHours(selectedHours, selectedMinutes, 0, 0);

      // 3. Comparison variables
      const isFutureDate = 
        selectedFullDate.getFullYear() > now.getFullYear() ||
        (selectedFullDate.getFullYear() === now.getFullYear() && selectedFullDate.getMonth() > now.getMonth()) ||
        (selectedFullDate.getFullYear() === now.getFullYear() && selectedFullDate.getMonth() === now.getMonth() && selectedFullDate.getDate() > now.getDate());

      const isToday = 
        selectedFullDate.getFullYear() === now.getFullYear() &&
        selectedFullDate.getMonth() === now.getMonth() &&
        selectedFullDate.getDate() === now.getDate();

      const isTimePassed = selectedFullDate.getTime() <= now.getTime();

      /**
       * THE LOGIC:
       * If it's a FUTURE date (e.g., Tomorrow), let them set ANY time.
       * If it's TODAY, then and ONLY then, check if the time has passed.
       */
      if (isFutureDate) {
        // Future date? No problem, take any time.
        onChange(null, selectedFullDate);
      } else if (isToday && isTimePassed) {
        // Today but time already passed? Block it.
        if (onInvalidTime) onInvalidTime();
        
        const adjustedDate = new Date();
        adjustedDate.setMinutes(adjustedDate.getMinutes() + 1); 
        onChange(null, adjustedDate);
      } else if (isToday && !isTimePassed) {
        // Today but time is still in the future? Perfect.
        onChange(null, selectedFullDate);
      } else {
        // This covers past dates (which are mostly blocked anyway by DateSelector)
        if (onInvalidTime) onInvalidTime();
        onChange(null, new Date());
      }
      
      onCancel();
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
        onChange(params.date);
        onCancel();
      }}
      label="Select Start Date"
      theme={theme}
    />
  );
};
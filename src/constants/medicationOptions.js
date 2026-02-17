// src/constants/medicationOptions.js

/**
 * List of Measurement Units for Dosage
 */
export const UNITS = [
  'mg', 
  'mcg', 
  'g', 
  'ml', 
  'IU', 
  'Drops', 
  'Puffs', 
  'Pills', 
  'Capsules', 
  'Sachets', 
  'Units'
];

/**
 * Medicine Categories with corresponding display names
 */
export const CATEGORIES = [
  'Tablet', 
  'Capsule', 
  'Liquid/Syrup', 
  'Injection', 
  'Cream/Ointment', 
  'Inhaler', 
  'Drops', 
  'Spray', 
  'Patch', 
  'Suppository', 
  'Powder'
];

/**
 * Options for Frequency intervals
 */
export const HOURLY_OPTIONS = ['1', '2', '3', '4', '6', '8', '12', '24'];
export const DAY_OPTIONS = ['1', '2', '3', '4', '5', '6', '7', '14', '30'];

/**
 * Formatting Helpers
 */
export const formatTime = (date) => {
  if (!date) return "--:--";
  return new Date(date).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit', 
    hour12: true 
  });
};

export const formatDate = (date) => {
  if (!date) return "--/--/--";
  return new Date(date).toLocaleDateString([], { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
};

/**
 * Logic to generate the human-readable summary of the schedule
 * @param {Object} form - The current state of the AddMedication form
 * @returns {String} - A descriptive summary
 */
export const getScheduleSummary = (form) => {
  const { 
    frequency, 
    intervalValue, 
    isPermanent, 
    duration, 
    category, 
    startDate 
  } = form;

  let text = `Take ${category.toLowerCase()} `;

  if (frequency === 'daily') {
    text += "once every day";
  } else if (frequency === 'hourly') {
    text += `every ${intervalValue} hours`;
  } else if (frequency === 'interval') {
    const unit = parseInt(intervalValue) === 1 ? 'day' : 'days';
    text += `every ${intervalValue} ${unit}`;
  }

  text += ` starting ${formatDate(startDate)}`;

  if (!isPermanent) {
    text += ` for a ${duration}-day course.`;
  } else {
    text += " as maintenance.";
  }
  
  return text;
};

/**
 * Filter options for Day-based intervals based on the set duration
 */
export const getFilteredDayOptions = (maxDays) => {
  const limit = parseInt(maxDays) || 1;
  return DAY_OPTIONS.filter(opt => parseInt(opt) <= limit);
};
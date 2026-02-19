// src/models/Schemas.js
import { Realm } from '@realm/react';

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────

export const MedicationStatus = {
  TAKEN: 'taken',
  SKIPPED: 'skipped',
  MISSED: 'missed',
  SNOOZED: 'snoozed',
};

export const Frequency = {
  DAILY: 'daily',
  EVERY_X_HOURS: 'every_x_hours',
  SPECIFIC_DAYS: 'specific_days',
  AS_NEEDED: 'as_needed',
};

export const DayOfWeek = {
  MONDAY: 'monday',
  TUESDAY: 'tuesday',
  WEDNESDAY: 'wednesday',
  THURSDAY: 'thursday',
  FRIDAY: 'friday',
  SATURDAY: 'saturday',
  SUNDAY: 'sunday',
};

// ─────────────────────────────────────────────
// 1. SCHEDULE (Embedded)
// Defines a single alarm time for a medication.
// A medication can have multiple schedules (e.g. 8am and 8pm).
// ─────────────────────────────────────────────

export class Schedule extends Realm.Object {
  static schema = {
    name: 'Schedule',
    embedded: true,
    properties: {
      hour: 'int',                          // 0–23
      minute: 'int',                        // 0–59
      notificationId: 'string',             // Notifee notification ID for cancellation/update
      days: 'string[]',                     // used when frequency is 'specific_days', e.g. ['monday', 'wednesday']
      isActive: { type: 'bool', default: true },
    },
  };
}

// ─────────────────────────────────────────────
// 2. MEDICATION
// Core medication details, scheduling config,
// inventory management, and smart adjustment.
// ─────────────────────────────────────────────

export class Medication extends Realm.Object {
  static schema = {
    name: 'Medication',
    primaryKey: '_id',
    properties: {
      _id: 'uuid',
      name: 'string',
      dosage: 'string',                     // e.g. "500"
      unit: 'string',                       // e.g. "mg", "ml", "tablet"
      category: 'string',                   // e.g. "antibiotic", "vitamin"
      instructions: 'string?',             // e.g. "Take with food"

      // --- SCHEDULE & FREQUENCY ---
      frequency: 'string',                  // one of Frequency constants
      intervalHours: 'int?',               // used when frequency is 'every_x_hours', e.g. 8
      schedules: 'Schedule[]',             // one or more alarm times
      startDate: 'date',
      endDate: 'date?',                    // null if isPermanent is true
      isPermanent: { type: 'bool', default: false },
      nextOccurrence: 'date?',             // updated after each alarm fires

      // --- SMART ADJUSTMENT ---
      // If true and the user is late, prompt to shift the next dose accordingly
      isAdjustable: { type: 'bool', default: false },

      // --- INVENTORY ---
      isInventoryEnabled: { type: 'bool', default: false },
      stock: { type: 'int', default: 0 },  // current pill/unit count
      reorderLevel: { type: 'int', default: 5 }, // notify user when stock hits this

      // --- META ---
      isActive: { type: 'bool', default: true },
      createdAt: 'date',
      updatedAt: 'date',

      // --- RELATIONSHIP ---
      owner: {
        type: 'linkingObjects',
        objectType: 'Profile',
        property: 'medications',
      },
    },
  };
}

// ─────────────────────────────────────────────
// 3. MEDICATION LOG
// One record per scheduled dose event.
// Tracks adherence, delay, and status.
// ─────────────────────────────────────────────

export class MedicationLog extends Realm.Object {
  static schema = {
    name: 'MedicationLog',
    primaryKey: '_id',
    properties: {
      _id: 'uuid',
      medicationId: 'uuid',                // reference to parent Medication
      medicationName: 'string',            // snapshot in case medication is later deleted
      dosageSnapshot: 'string',            // e.g. "500mg" — snapshot at time of log
      profileId: 'uuid',                   // which profile this log belongs to
      status: 'string',                    // one of MedicationStatus constants
      scheduledAt: 'date',                 // when the dose was supposed to be taken
      takenAt: 'date?',                    // when it was actually taken (null if skipped/missed)
      delayMinutes: { type: 'int', default: 0 }, // (takenAt - scheduledAt) in minutes
      note: 'string?',                     // optional user note, e.g. "felt nauseous"
    },
  };
}

// ─────────────────────────────────────────────
// 4. SNOOZE LOG (Embedded in MedicationLog extension or standalone)
// Tracks snooze history for a single dose event.
// ─────────────────────────────────────────────

export class SnoozeLog extends Realm.Object {
  static schema = {
    name: 'SnoozeLog',
    primaryKey: '_id',
    properties: {
      _id: 'uuid',
      medicationLogId: 'uuid',             // links to the MedicationLog it belongs to
      snoozedAt: 'date',                   // when the snooze action was triggered
      snoozeDurationMinutes: 'int',        // how many minutes it was snoozed for
      newAlarmTime: 'date',               // the rescheduled alarm time
      notificationId: 'string',           // Notifee ID of the new snoozed notification
    },
  };
}

// ─────────────────────────────────────────────
// 5. PROFILE
// Represents a user or dependent (e.g. parent managing meds for a child).
// ─────────────────────────────────────────────

export class Profile extends Realm.Object {
  static schema = {
    name: 'Profile',
    primaryKey: '_id',
    properties: {
      _id: 'uuid',
      firstName: 'string',
      relationship: 'string',              // e.g. "self", "child", "parent", "partner"
      color: 'string',                     // UI accent color for this profile
      icon: 'string',                      // avatar icon identifier
      isMain: { type: 'bool', default: false },
      medications: 'Medication[]',
    },
  };
}

// ─────────────────────────────────────────────
// SCHEMA EXPORT (pass this to RealmProvider)
// ─────────────────────────────────────────────

export const RealmSchemas = [
  Schedule,
  Medication,
  MedicationLog,
  SnoozeLog,
  Profile,
];
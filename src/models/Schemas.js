import { Realm } from '@realm/react';

// 1. LOGS: To track "Taken" or "Skipped" history
export class MedicationLog extends Realm.Object {
  static schema = {
    name: 'MedicationLog',
    primaryKey: '_id',
    properties: {
      _id: 'uuid',
      medicationId: 'uuid',
      status: 'string', // 'taken', 'skipped', 'missed'
      takenAt: 'date',
    },
  };
}

// 2. MEDICATION: Updated with Inventory Fields
export class Medication extends Realm.Object {
  static schema = {
    name: 'Medication',
    primaryKey: '_id',
    properties: {
      _id: 'uuid',
      name: 'string',
      dosage: 'string',
      unit: 'string', // e.g., 'tablets', 'capsules', 'ml'
      category: 'string',
      isPermanent: 'bool',
      duration: 'string?',
      frequency: 'string',
      intervalValue: 'string?',
      startDate: 'date',
      reminderTime: 'date',
      createdAt: 'date',
      isActive: { type: 'bool', default: true },
      
      // --- INVENTORY FIELDS ---
      stock: { type: 'int', default: 0 },         // Current available quantity
      reorderLevel: { type: 'int', default: 5 },  // Alert user when stock hits this
      isInventoryEnabled: { type: 'bool', default: false }, // Toggle for inventory tracking
      
      owner: { 
        type: 'linkingObjects', 
        objectType: 'Profile', 
        property: 'medications' 
      },
    },
  };
}

// 3. PROFILE: The "Person"
export class Profile extends Realm.Object {
  static schema = {
    name: 'Profile',
    primaryKey: '_id',
    properties: {
      _id: 'uuid',
      firstName: 'string',
      relationship: 'string',
      color: 'string',
      icon: 'string',
      isMain: { type: 'bool', default: false },
      medications: 'Medication[]', 
    },
  };
}
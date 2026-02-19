import { useRealm, useQuery } from '@realm/react';
import { useState, useCallback } from 'react';
import { Medication } from '../models/Schemas';
import Realm from 'realm';

export const useMedicationActions = (onSuccess) => {
  const realm = useRealm();
  const [isDeleting, setIsDeleting] = useState(false);

  // Receives an ObjectId, looks up the live object fresh inside the write,
  // so we never hold a stale Realm reference across renders.
  const deleteMedication = useCallback((medicationId) => {
    if (!medicationId) return;

    try {
      setIsDeleting(true);
      realm.write(() => {
        // Fresh lookup by primary key — guaranteed valid at write time
        const med = realm.objectForPrimaryKey(Medication, medicationId);
        if (med) {
          realm.delete(med);
        }
      });
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Critical: Failed to delete medication:", error);
    } finally {
      setIsDeleting(false);
    }
  }, [realm, onSuccess]);

  return {
    deleteMedication,
    isDeleting
  };
};
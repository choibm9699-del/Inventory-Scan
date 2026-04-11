import { useState, useCallback } from "react";
import type { InventoryRecord } from "../types";

const STORAGE_KEY = "inventory_records";

function loadRecords(): InventoryRecord[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored) as InventoryRecord[];
  } catch {}
  return [];
}

function saveRecords(records: InventoryRecord[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function useInventory() {
  const [records, setRecords] = useState<InventoryRecord[]>(loadRecords);

  const addRecord = useCallback((record: Omit<InventoryRecord, "id">) => {
    const newRecord: InventoryRecord = {
      ...record,
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    };
    setRecords((prev) => {
      const updated = [newRecord, ...prev];
      saveRecords(updated);
      return updated;
    });
    return newRecord;
  }, []);

  const updateRecord = useCallback((id: string, updates: Partial<InventoryRecord>) => {
    setRecords((prev) => {
      const updated = prev.map((r) => (r.id === id ? { ...r, ...updates } : r));
      saveRecords(updated);
      return updated;
    });
  }, []);

  const deleteRecord = useCallback((id: string) => {
    setRecords((prev) => {
      const updated = prev.filter((r) => r.id !== id);
      saveRecords(updated);
      return updated;
    });
  }, []);

  const clearAll = useCallback(() => {
    saveRecords([]);
    setRecords([]);
  }, []);

  return { records, addRecord, updateRecord, deleteRecord, clearAll };
}

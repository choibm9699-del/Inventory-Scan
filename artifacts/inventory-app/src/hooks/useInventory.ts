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

function parseKoreanDate(dateStr: string) {
  const cleaned = dateStr.replace(/\s/g, "").replace(/\.$/, "");
  const parts = cleaned.split(".").filter(Boolean).map(Number);
  if (parts.length < 3 || parts.some((n) => Number.isNaN(n))) return null;
  const [year, month, day] = parts;
  return new Date(year, month - 1, day);
}

function isWithinLast7Days(dateStr: string) {
  const date = parseKoreanDate(dateStr);
  if (!date) return false;
  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - 6);
  date.setHours(0, 0, 0, 0);
  return date >= cutoff;
}

export function useInventory() {
  const [records, setRecords] = useState<InventoryRecord[]>(() => loadRecords().filter((r) => isWithinLast7Days(r.date)));

  const addRecord = useCallback((record: Omit<InventoryRecord, "id">) => {
    const newRecord: InventoryRecord = {
      ...record,
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    };
    setRecords((prev) => {
      const updated = [newRecord, ...prev].filter((r) => isWithinLast7Days(r.date));
      saveRecords(updated);
      return updated;
    });
    return newRecord;
  }, []);

  const updateRecord = useCallback((id: string, updates: Partial<InventoryRecord>) => {
    setRecords((prev) => {
      const updated = prev.map((r) => (r.id === id ? { ...r, ...updates } : r)).filter((r) => isWithinLast7Days(r.date));
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

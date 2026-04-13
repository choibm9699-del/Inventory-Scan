import { useState, useEffect, useCallback } from "react";
import { db } from "../firebase.ts";
import {
  ref,
  onValue,
  push,
  remove,
  update,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import type { InventoryRecord } from "../types";

export function useInventory() {
  const [records, setRecords] = useState<InventoryRecord[]>([]);

  // 1. 데이터 실시간 불러오기 (Read)
  useEffect(() => {
    const recordsRef = ref(db, "inventory_records");

    // DB의 값이 바뀔 때마다 자동으로 실행됨
    const unsubscribe = onValue(recordsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Firebase 객체를 배열로 변환
        const list = Object.keys(data).map((key) => ({
          ...data[key],
          id: key, // Firebase의 고유 키를 id로 사용
        })) as InventoryRecord[];

        // 최신순 정렬
        setRecords(list.reverse());
      } else {
        setRecords([]);
      }
    });

    return () => unsubscribe(); // 컴포넌트 종료 시 감시 중단
  }, []);

  // 2. 기록 추가 (Create) - InventoryPage에서 호출됨
  const addRecord = useCallback(async (record: Omit<InventoryRecord, "id">) => {
    try {
      const recordsRef = ref(db, "inventory_records");
      await push(recordsRef, {
        ...record,
        timestamp: serverTimestamp(), // 서버 시간 저장
      });
    } catch (error) {
      console.error("추가 실패:", error);
    }
  }, []);

  // 3. 기록 수정 (Update)
  const updateRecord = useCallback(
    async (id: string, updates: Partial<InventoryRecord>) => {
      try {
        const recordRef = ref(db, `inventory_records/${id}`);
        await update(recordRef, updates);
      } catch (error) {
        console.error("수정 실패:", error);
      }
    },
    [],
  );

  // 4. 기록 삭제 (Delete)
  const deleteRecord = useCallback(async (id: string) => {
    try {
      const recordRef = ref(db, `inventory_records/${id}`);
      await remove(recordRef);
    } catch (error) {
      console.error("삭제 실패:", error);
    }
  }, []);

  // 5. 전체 초기화 (Clear)
  const clearAll = useCallback(async () => {
    if (window.confirm("정말로 모든 데이터를 삭제하시겠습니까?")) {
      try {
        const recordsRef = ref(db, "inventory_records");
        await remove(recordsRef);
      } catch (error) {
        console.error("초기화 실패:", error);
      }
    }
  }, []);

  return { records, addRecord, updateRecord, deleteRecord, clearAll };
}

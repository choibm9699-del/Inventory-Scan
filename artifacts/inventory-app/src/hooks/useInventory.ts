import { useState, useEffect, useCallback } from "react";
import { db } from "../firebase.ts";
import {
  ref,
  onValue,
  push,
  remove,
  update,
  get,
  serverTimestamp,
} from "firebase/database";
import type { InventoryRecord } from "../types";

export function useInventory() {
  const [records, setRecords] = useState<InventoryRecord[]>([]);
  
 // const getDateKey = () => new Date().toISOString().split('T')[0];

  // 날짜 포맷을 하나로 고정 (YYYY-MM-DD)
  const getDateKey = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  
  // 1. 데이터 실시간 불러오기 (Read)
useEffect(() => {
    const dateKey = getDateKey();

      const runCleanup = async () => {
        try {
          const now = new Date();
          const twoWeeksAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 14);

          // 1. 재고 기록(inventory_records) 데이터 가져오기
          const inventorySnapshot = await get(ref(db, "inventory_records"));
          const inventoryData = inventorySnapshot.val();

          // 2. 엑셀 업로드(daily_uploads) 데이터 가져오기
          const uploadsSnapshot = await get(ref(db, "daily_uploads"));
          const uploadsData = uploadsSnapshot.val();

          console.log("데이터 정리 확인 중...");

          // inventory_records 청소
          if (inventoryData) {
            for (const key of Object.keys(inventoryData)) {
              const recordDate = new Date(key);
              if (!isNaN(recordDate.getTime())) {
                const comparisonDate = new Date(recordDate.getFullYear(), recordDate.getMonth(), recordDate.getDate());
                if (comparisonDate < twoWeeksAgo) {
                  console.log(`기록 삭제: ${key}`);
                  await remove(ref(db, `inventory_records/${key}`));
                }
              }
            }
          }

          // daily_uploads 청소 (추가된 부분)
          if (uploadsData) {
            for (const key of Object.keys(uploadsData)) {
              const uploadDate = new Date(key);
              if (!isNaN(uploadDate.getTime())) {
                const comparisonDate = new Date(uploadDate.getFullYear(), uploadDate.getMonth(), uploadDate.getDate());
                if (comparisonDate < twoWeeksAgo) {
                  console.log(`업로드 내역 삭제: ${key}`);
                  await remove(ref(db, `daily_uploads/${key}`));
                }
              }
            }
          }
    } catch (err) {
      console.error("Cleanup Error:", err);
    }
  };

  // 1. 즉시 실행
  runCleanup();
  
    // 경로에 날짜(dateKey)를 추가합니다.
  const recordsRef = ref(db, "inventory_records");

    const unsubscribe = onValue(recordsRef, (snapshot) => {
      const allData = snapshot.val();
      if (allData) {
        const today = getDateKey(); // "2026-04-27"

        // 전체 데이터를 하나의 배열로 합치기
        let allList: InventoryRecord[] = [];
        Object.keys(allData).forEach(date => {
          const dateFolder = allData[date];
          const listPerDate = Object.keys(dateFolder).map(key => ({
            ...dateFolder[key],
            id: key,
          }));
          allList = [...allList, ...listPerDate];
        });

        // 캘린더를 위해 전체 기록을 보관하되, 
        // 메인 리스트(records)에는 오늘 날짜 데이터만 필터링해서 넣고 싶다면:
        const todayList = allList.filter(r => r.date === today || r.date === new Date().toLocaleDateString("ko-KR"));
        setRecords(allList); // 일단 모든 데이터를 넣어줘야 캘린더가 작동합니다.
      } else {
        setRecords([]);
      }
    });

    return () => unsubscribe();
  }, []);

  // 2. 기록 추가 (Create)
  const addRecord = useCallback(async (record: Omit<InventoryRecord, "id">) => {
    try {
      const dateKey = getDateKey();
      const recordsRef = ref(db, `inventory_records/${dateKey}`);
      await push(recordsRef, {
        ...record,
        timestamp: serverTimestamp(),
      });
    } catch (error) {
      console.error("추가 실패:", error);
    }
  }, []);

  // 3. 기록 수정 (Update)
  const updateRecord = useCallback(
    async (id: string, updates: Partial<InventoryRecord>) => {
      try {
        const dateKey = getDateKey();
        const recordRef = ref(db, `inventory_records/${dateKey}/${id}`);
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
      // 삭제할 때도 오늘 날짜 폴더 안의 특정 ID를 찾아 지웁니다.
      const dateKey = getDateKey();
      const recordRef = ref(db, `inventory_records/${dateKey}/${id}`);
      await remove(recordRef);
    } catch (error) {
      console.error("삭제 실패:", error);
    }
  }, []);

  // 5. 전체 초기화 (Clear) - "오늘치 데이터"만 삭제
  const clearAll = useCallback(async () => {
    if (window.confirm("오늘 작업한 모든 데이터를 삭제하시겠습니까?")) {
      try {
        const dateKey = getDateKey();
        const recordsRef = ref(db, `inventory_records/${dateKey}`);
        await remove(recordsRef);
      } catch (error) {
        console.error("초기화 실패:", error);
      }
    }
  }, []);

  return { records, addRecord, updateRecord, deleteRecord, clearAll };
}
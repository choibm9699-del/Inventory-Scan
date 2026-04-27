import * as XLSX from "xlsx";
import type { InventoryRecord } from "../types";

export function exportToExcel(
  records: InventoryRecord[],
  dbData: any,
  filename = "재고조사",
) {
  const dbMap: Record<string, number> = {};

  if (dbData) {
    Object.values(dbData).forEach((item: any) => {
      dbMap[item.code] = (dbMap[item.code] || 0) + (Number(item.quantity) || 0);
    });
  }

  // 실사 기록을 엑셀용 데이터로 변환
  const data = records.map((r) => {
    const systemQty = dbMap[r.code] || 0; // DB에서 불러온 재고량
    return {
      날짜: r.date,
      상품코드: r.code,
      상품명: r.name,
      현장재고: r.quantity,
      전산재고: systemQty,
      차이: Number(r.quantity) - systemQty,
    };
  });

  const ws = XLSX.utils.json_to_sheet(data);

  const colWidths = [
    { wch: 10 },
    { wch: 10 },
    { wch: 20 },
    { wch: 8 },
    { wch: 8 },
    { wch: 8 },
    { wch: 10 },
  ];
  ws["!cols"] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "재고조사");

  XLSX.writeFile(wb, `이전_${filename}.xlsx`);
}
export interface FilteredInventory {
  code: string;
  name: string;
  quantity: number;
}

// 재고업로드 코드
export const processInventoryExcel = async (
  file: File,
): Promise<FilteredInventory[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // header: 1 옵션으로 2차원 배열로 가져오기
        const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
        });

        const resultMap = new Map<string, FilteredInventory>();
        let lastCode = "";
        let lastName = "";

        // 마지막 줄(합계)을 빼기 위해 rows.length - 1 까지만 반복
        // (보통 엑셀 데이터의 가장 마지막에 합계가 있으므로)
        for (let i = 0; i < rows.length - 1; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;

          const currentCode = row[1]?.toString().trim();
          const currentName = row[2]?.toString().trim();
          const quantity = parseFloat(row[10]); // K열 수량

          // "합계"라는 단어가 포함된 행이면 건너뛰기 (추가 방어 로직)
          if (currentCode === "합계" || currentName === "합계") continue;

          // 1. 상품 정보가 있으면 업데이트, 없으면 이전 정보 유지
          if (currentCode) lastCode = currentCode;
          if (currentName) lastName = currentName;

          // 2. 수량이 0보다 크고, 상품 정보가 확실할 때만  처리
          if (!isNaN(quantity) && quantity > 0 && lastCode && lastName) {
            const key = `${lastCode}_${lastName}`;

            if (resultMap.has(key)) {
              const existing = resultMap.get(key)!;
              existing.quantity += quantity;
            } else {
              resultMap.set(key, {
                code: lastCode,
                name: lastName,
                quantity: quantity,
              });
            }
          }
        }

        resolve(Array.from(resultMap.values()));
      } catch (error) {
        reject(error);
      }
    };

    reader.readAsBinaryString(file);
  });
};

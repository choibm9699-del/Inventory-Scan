import * as XLSX from "xlsx";
import type { InventoryRecord } from "../types";

export function exportToExcel(records: InventoryRecord[], filename = "재고조사") {
  const data = records.map((r) => ({
    날짜: r.date,
    시간: r.time,
    바코드: r.barcode,
    상품코드: r.code,
    상품명: r.name,
    수량: r.quantity,
  }));

  const ws = XLSX.utils.json_to_sheet(data);

  const colWidths = [
    { wch: 12 }, { wch: 10 }, { wch: 18 }, { wch: 10 },
    { wch: 20 }, { wch: 8 },
  ];
  ws["!cols"] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "재고조사");

  const dateStr = new Date().toLocaleDateString("ko-KR").replace(/\. /g, "-").replace(".", "");
  XLSX.writeFile(wb, `${filename}_${dateStr}.xlsx`);
}

import { useState } from "react";
import { Trash2, FileDown, Barcode } from "lucide-react";
import type { InventoryRecord } from "../types";

interface InventoryTableProps {
  records: InventoryRecord[];
  onDelete: (id: string) => void;
  onExport: () => void;
  onClear: () => void;
}

export function InventoryTable({ records, onDelete, onExport, onClear }: InventoryTableProps) {
  const [showBarcode, setShowBarcode] = useState(true);
  const totalItems = records.reduce((sum, r) => sum + r.quantity, 0);

  return (
    <div className="bg-card rounded-xl border border-card-border shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-card-foreground">재고 기록</span>
          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{records.length}건</span>
          {records.length > 0 && (
            <span className="text-xs text-muted-foreground">합계: {totalItems.toLocaleString()}개</span>
          )}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          {records.length > 0 && (
            <>
              <button
                onClick={() => setShowBarcode((v) => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-muted text-muted-foreground rounded-lg text-sm font-medium hover:bg-muted/80 transition-colors"
              >
                <Barcode className="w-4 h-4" />
                {showBarcode ? "바코드 숨김" : "바코드 표시"}
              </button>
              <button
                onClick={onExport}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
              >
                <FileDown className="w-4 h-4" />
                엑셀 저장
              </button>
            </>
          )}
        </div>
      </div>
      {records.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-3">
            <FileDown className="w-7 h-7 opacity-40" />
          </div>
          <p className="text-sm font-medium">아직 기록된 재고가 없습니다</p>
          <p className="text-xs mt-1 opacity-70">바코드를 스캔하거나 입력해서 재고를 추가하세요</p>
        </div>
      ) : (
        <div className="overflow-x-hidden">
          <table className="w-full text-sm table-fixed">
            <thead className="bg-muted/50">
              <tr>
                {showBarcode && <th className="w-[24%] px-2 py-2.5 font-medium text-muted-foreground text-[15px] text-center">바코드</th>}
                <th className={showBarcode ? "w-[50%] px-2 py-2.5 font-medium text-muted-foreground text-[15px] text-center" : "w-[60%] px-2 py-2.5 font-medium text-muted-foreground text-[15px] text-center"}>상품명 / 코드</th>
                <th className={showBarcode ? "w-[16%] px-2 py-2.5 font-medium text-muted-foreground text-[15px] text-center" : "w-[20%] px-2 py-2.5 font-medium text-muted-foreground text-[15px] text-center"}>수량</th>
                <th className={showBarcode ? "w-[10%] px-2 py-2.5" : "w-[20%] px-2 py-2.5"} />
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id} className="border-t border-border hover:bg-muted/20 transition-colors">
                  {showBarcode && <td className="px-2 py-5 font-mono font-bold text-[15px] text-center truncate">{r.barcode}</td>}
                  <td className="px-2 py-5 text-center min-w-0">
                    <div className="text-base font-bold">{r.name}</div>
                    <div className="text-sm font-bold text-muted-foreground truncate">{r.code}</div>
                  </td>
                  <td className="px-2 py-5 text-center text-base font-bold tabular-nums whitespace-nowrap">
                    {r.quantity.toLocaleString()}
                  </td>
                  <td className="px-2 py-5">
                    <button
                      onClick={() => onDelete(r.id)}
                      className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

import { Trash2, FileDown } from "lucide-react";
import type { InventoryRecord } from "../types";

interface InventoryTableProps {
  records: InventoryRecord[];
  onDelete: (id: string) => void;
  onExport: () => void;
  onClear: () => void;
}

export function InventoryTable({ records, onDelete, onExport, onClear }: InventoryTableProps) {
  const totalItems = records.reduce((sum, r) => sum + r.quantity, 0);

  return (
    <div className="bg-card rounded-xl border border-card-border shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-card-foreground">재고 기록</span>
          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{records.length}건</span>
          {records.length > 0 && (
            <span className="text-xs text-muted-foreground">합계: {totalItems.toLocaleString()}개</span>
          )}
        </div>
        <div className="flex gap-2">
          {records.length > 0 && (
            <>
              <button
                onClick={onExport}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
              >
                <FileDown className="w-4 h-4" />
                엑셀 저장
              </button>
              <button
                onClick={() => { if (confirm("모든 기록을 삭제하시겠습니까?")) onClear(); }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-muted text-muted-foreground rounded-lg text-sm font-medium hover:bg-muted/80 transition-colors"
              >
                전체 삭제
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
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">바코드</th>
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground text-xs">코드</th>
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground text-xs">상품명</th>
                <th className="text-right px-3 py-2.5 font-medium text-muted-foreground text-xs">수량</th>
                <th className="px-3 py-2.5 font-medium text-muted-foreground text-xs whitespace-nowrap pl-[0px] pr-[0px] text-center">날짜/시간</th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id} className="border-t border-border hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-5 font-mono text-sm font-bold">{r.barcode}</td>
                  <td className="px-4 py-5 text-sm font-bold">{r.code}</td>
                  <td className="px-4 py-5 text-base font-bold">{r.name}</td>
                  <td className="px-4 py-5 text-right text-base font-bold tabular-nums">
                    {r.quantity.toLocaleString()}
                    <span className="text-xs font-normal text-muted-foreground ml-1">{r.unit}</span>
                  </td>
                  <td className="px-4 py-5 whitespace-nowrap pl-[0px] pr-[0px] text-center">
                    <div className="text-xs text-foreground font-medium">{r.date}</div>
                    <div className="text-xs text-muted-foreground">{r.time}</div>
                  </td>
                  <td className="px-4 py-5">
                    <button
                      onClick={() => onDelete(r.id)}
                      className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors ml-[-18px] mr-[-18px]"
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

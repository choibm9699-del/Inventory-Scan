import { useState, useMemo, useRef } from "react";
import { Trash2, FileDown, Barcode, CheckCircle, FileUp } from "lucide-react";
import type { InventoryRecord } from "../types";

interface InventoryTableProps {
  records: InventoryRecord[];
  systemInventory?: any[];
  dbMap: Record<string, number>;
  onDelete: (id: string) => void;
  onExport: () => void;
  onClear: () => void;
  isLocked: boolean;
  onLock: () => void;
  onUnlock: () => void;
  onImport: (file: File) => void; //업로드추가됨
}

export function InventoryTable({
  records,
  dbMap = {},
  onDelete,
  onExport,
  isLocked,
  onLock,
  onUnlock,
  onImport, //업로드추가
}: InventoryTableProps) {
  const [showBarcode, setShowBarcode] = useState(false);
  // 업로드 추가
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. 오늘 날짜와 일치하는 데이터만 추출 (과거 데이터 배제)

  const todayRecords = useMemo(() => {
    const todayStr = new Date().toLocaleDateString("ko-KR");
    return records ? records.filter((r) => r.date === todayStr) : [];
  }, [records]);

  // 2. 오직 오늘 입력된 데이터로만 합계 계산
  const totalItems = useMemo(() => {
    return todayRecords.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);
  }, [todayRecords]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* 헤더 영역 */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-300 bg-gray-100">
        <div className="flex items-center gap-2">
          <span className="font-bold text-gray-800">재고 기록</span>
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-bold">
            {todayRecords.length}건
          </span>
          {todayRecords.length > 0 && (
            <span className="text-xs text-gray-500 font-medium">
              총 {totalItems.toLocaleString()}개
            </span>
          )}
        </div>

        {todayRecords.length > 0 && (
          <button
            onClick={() => setShowBarcode((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-50 transition-colors"
          >
            <Barcode className="w-4 h-4" />
            {showBarcode ? "바코드 숨김" : "바코드 표시"}
          </button>
        )}
      </div>

      {/* 하단 영역 */}

      <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50/30 min-h-[64px]">
        {/* 1. 왼쪽 영역: 고정된 너비를 가짐 (재고 없어도 공간 유지) */}
        <div className="flex-1 flex justify-start">
          {todayRecords.length > 0 && (
            <button
              onClick={() => {
                if (isLocked) onUnlock();
                else if (window.confirm("재고조사를 완료하시겠습니까?\n완료 후에는 수정 및 삭제가 불가능합니다.")) onLock();
              }}
              className={`flex items-center gap-2 px-3 py-3 border border-gray-500 rounded-xl text-sm font-black transition-all active:scale-95 ${
                isLocked
                  ? "bg-gray-400 text-white" 
                  : "bg-red-400 text-black hover:bg-red-600 shadow-lg"
              }`}
            >
              <CheckCircle className="w-4 h-4" />
              조사완료
            </button>
          )}
        </div>

        {/* 2. 오른쪽 영역: 버튼들이 우측 끝에서부터 나열됨 */}
        <div className="flex-1 flex justify-end items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".xlsx, .xls"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file && onImport) onImport(file);
              e.target.value = ""; 
            }}
          />

          {/* [재고등록] 버튼: 이 버튼은 항상 이 위치에 고정됩니다. */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLocked}
            className="flex items-center gap-1 px-2 py-3 bg-sidebar text-sidebar-foreground border border-gray-500 rounded-xl text-sm font-black hover:bg-gray-100 shadow-lg transition-all active:scale-95 disabled:opacity-50"
          >
            <FileUp className="w-4 h-4" />
            재고등록
          </button>

          {/* [재고저장] 버튼: 재고가 생기면 [재고등록] 오른쪽에 나타납니다. */}
          {todayRecords.length > 0 && (
            <button
              onClick={onExport}
              className="flex items-center gap-1 px-2 py-3 bg-green-400 border border-gray-500 text-black rounded-xl text-sm font-black hover:bg-green-700 shadow-lg shadow-green-100 transition-all active:scale-95"
            >
              <FileDown className="w-4 h-4" />
              재고저장
            </button>
          )}
        </div>
      </div>


      {/* 테이블 영역: todayRecords(오늘 데이터)만 출력 */}
      {!todayRecords || todayRecords.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <FileDown className="w-10 h-10 mb-2 opacity-20" />
          <p className="text-sm">기록된 재고 데이터가 없습니다.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {showBarcode && (
                  <th className="w-1/4 px-4 py-3 font-semibold text-gray-600 text-center">
                    바코드
                  </th>
                )}
                <th className="px-4 py-3 font-semibold text-gray-600 text-center">
                  상품명 / 코드
                </th>
                <th className="w-30 px-4 py-3 font-semibold text-gray-600 text-center">
                  현재수량
                </th>
                <th className="w-10 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {todayRecords.map((r) => (
                <tr
                  key={r.id}
                  className="hover:bg-gray-50/50 transition-colors"
                >
                  {showBarcode && (
                    <td className="px-2 py-4 font-mono text-[14px] text-center text-gray-500 break-all">
                      {r.barcode}
                    </td>
                  )}
                  <td className="px-4 py-4 text-center">
                    <div className="text-[18px] font-bold text-gray-900 leading-tight">
                      {r.name}
                    </div>
                    <div className="mt-1">
                      <span className="text-[13px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                        {r.code}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center tabular-nums">
                    <div className="flex flex-col items-center justify-center">
                      {/* 내가 센 수량 */}
                      <span className="text-[22px] font-black text-black leading-none">
                        {Number(r.quantity).toLocaleString()}
                      </span>

                      {/* 전산 수량 (dbMap에서 바로 꺼내 쓰기) */}
                      {(() => {
                        const systemQty = dbMap[r.code] || 0; // dbMap은 부모가 던져준 systemInventory입니다.
                        const isExist = systemQty > 0;

                        return (
                          <span className={`text-[15px] font-bold mt-0 ${isExist ? 'text-blue-500' : 'text-gray-400'}`}>
                            (전산: {systemQty.toLocaleString()})
                          </span>
                        );
                      })()}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    {!isLocked && (
                      <button
                        onClick={() => onDelete(r.id)}
                        className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
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

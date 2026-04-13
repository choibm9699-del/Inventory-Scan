import { useState, useMemo } from "react";
import { Trash2, FileDown, Barcode, CheckCircle } from "lucide-react";
import type { InventoryRecord } from "../types";

interface InventoryTableProps {
  records: InventoryRecord[];
  onDelete: (id: string) => void;
  onExport: () => void;
  onClear: () => void;
  isLocked: boolean;
  onLock: () => void;
  onUnlock: () => void;
}

export function InventoryTable({
  records,
  onDelete,
  onExport,
  isLocked,
    onLock,
  onUnlock,
}: InventoryTableProps) {
  const [showBarcode, setShowBarcode] = useState(false);

  // 1. 오늘 날짜와 일치하는 데이터만 추출 (과거 데이터 배제)
  
  const todayRecords = useMemo(() => {
    const todayStr = new Date().toLocaleDateString("ko-KR");
    return records ? records.filter(r => r.date === todayStr) : [];
  }, [records]);

  // 2. 오직 오늘 입력된 데이터로만 합계 계산
  const totalItems = useMemo(() => {
    return todayRecords.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);
  }, [todayRecords]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* 헤더 영역 */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-gray-50/50">
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
                <th className="w-20 px-4 py-3 font-semibold text-gray-600 text-center">
                  수량
                </th>
                <th className="w-12 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {todayRecords.map((r) => (
                <tr
                  key={r.id}
                  className="hover:bg-gray-50/50 transition-colors"
                >
                  {showBarcode && (
                    <td className="px-2 py-4 font-mono text-[12px] text-center text-gray-500 break-all">
                      {r.barcode}
                    </td>
                  )}
                  <td className="px-4 py-4 text-center">
                    <div className="text-[18px] font-bold text-gray-900 leading-tight">
                      {r.name}
                    </div>
                    <div className="mt-1">
                      <span className="text-[11px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                        {r.code}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center text-[20px] font-black text-black tabular-nums">
                    {Number(r.quantity).toLocaleString()}
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

      {/* 하단 영역 */}
      {todayRecords.length > 0 && (
        <div className="px-5 py-4 border-t border-gray-100 flex justify-between bg-gray-50/30">
          <button
            onClick={() => {
              if (isLocked) {
                // 이미 마감된 상태라면 해제 함수 실행
                onUnlock(); 
              } else {
                // 마감 전이라면 마감 확인창 띄우기
              if (window.confirm("재고조사를 완료하시겠습니까?\n완료 후에는 수정 및 삭제가 불가능합니다.")) {
                onLock(); // ◀ 부모(Page)의 setIsLocked(true)를 실행시키는 명령입니다.
                }
              }
            }}
              // 이제 마감 상태여도 클릭은 가능해야 하므로 disabled={isLocked}를 지웁니다!
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all active:scale-95 ${
                isLocked 
                  ? "bg-gray-400 text-white hover:bg-gray-500" // 마감 시에도 호버 효과 추가
                  : "bg-red-500 text-white hover:bg-red-600 shadow-lg"
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            조사완료
          </button>
          <button
            onClick={onExport}
            className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl text-sm font-black hover:bg-green-700 shadow-lg shadow-green-100 transition-all active:scale-95"
          >
            <FileDown className="w-4 h-4" />
            엑셀 다운로드
          </button>
        </div>
      )}
    </div>
  );
}
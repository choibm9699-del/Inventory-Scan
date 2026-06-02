import { useState, useMemo, useRef } from "react";
import {
  Trash2,
  FileDown,
  CheckCircle,
  FileUp,
  List,
  ArrowUpDown,
} from "lucide-react";
import type { InventoryRecord, Product } from "../types";

interface InventoryTableProps {
  records: InventoryRecord[];
  products: Product[]; // 상품 마스터 정보
  dbMap: Record<string, number>; // { "상품코드": 수량 } 형태의 전산 데이터
  onDelete: (id: string) => void;
  onExport: () => void;
  onClear: () => void;
  isLocked: boolean;
  onLock: () => void;
  onUnlock: () => void;
  onImport: (file: File) => void;
}

function getChosung(str: string) {
  const CHOSUNG = [
    "ㄱ",
    "ㄴ",
    "ㄷ",
    "ㄹ",
    "ㅁ",
    "ㅂ",
    "ㅅ",
    "ㅇ",
    "ㅈ",
    "ㅊ",
    "ㅋ",
    "ㅌ",
    "ㅍ",
    "ㅎ",
    "ㄲ",
    "ㄸ",
    "ㅃ",
    "ㅆ",
    "ㅉ",
  ];
  return str
    .split("")
    .map((char) => {
      const code = char.charCodeAt(0) - 0xac00;
      if (code < 0 || code > 11171) return char;
      return CHOSUNG[Math.floor(code / 588)];
    })
    .join("");
}

export function InventoryTable({
  records,
  products = [],
  dbMap = {},
  onDelete,
  onExport,
  isLocked,
  onLock,
  onUnlock,
  onImport,
}: InventoryTableProps) {
  const [showOnlyDiff, setShowOnlyDiff] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sortOrder, setSortOrder] = useState<
    "desc" | "asc" | "chosung" | "code"
  >("chosung");
  const isDbLoaded = Object.keys(dbMap).length > 0;
  // [핵심 비교 로직] 전산 데이터(dbMap)와 스캔 데이터(records)를 결합
  const displayList = useMemo(() => {
    // 1. 기초 데이터 준비
    // 날짜 비교를 위해 대시(-)와 점(.) 형식을 모두 준비합니다.
    const d = new Date();
    const todayDash = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const todayDot = d.toLocaleDateString("ko-KR"); // 2026. 4. 27.

    // 오늘 날짜 스캔 기록 필터링 (기존 todayStr 대신 두 형식 모두 체크)
    const todayScanned = records
      ? records.filter((r) => r.date === todayDash || r.date === todayDot)
      : [];

    // [수정 포인트] dbMap(전산) 코드와 todayScanned(실사) 코드를 합쳐서 기준을 잡습니다.
    const dbCodes = Object.keys(dbMap || {});
    const scannedCodes = todayScanned.map((r) => String(r.code).trim());

    // 두 곳의 코드를 합쳐서 중복 없는 전체 목록 생성
    const allCodes = Array.from(new Set([...dbCodes, ...scannedCodes]));

    // 2. 데이터 가공 (allCodes 기준)
    const list = allCodes.map((itemCode) => {
      // 해당 코드의 모든 스캔 기록 합산
      const scannedItems = todayScanned.filter(
        (r) => String(r.code).trim() === String(itemCode).trim(),
      );
      const totalScannedQty = scannedItems.reduce(
        (sum, item) => sum + (Number(item.quantity) || 0),
        0,
      );

      // 상품 마스터에서 정보 매칭
      const productInfo = products?.find(
        (p) => String(p.code).trim() === String(itemCode).trim(),
      );

      return {
        // ID는 스캔 기록이 있으면 첫번째 ID, 없으면 임시 ID
        id: scannedItems.length > 0 ? scannedItems[0].id : `temp-${itemCode}`,
        code: itemCode,
        name: productInfo?.name || "미등록 상품",
        barcode: productInfo?.barcode || scannedItems[0]?.barcode || "-",
        scannedQty: Number(totalScannedQty),
        systemQty: Number(dbMap[itemCode] || 0),
        isScanned: totalScannedQty > 0,
      };
    });

    const filteredList = showOnlyDiff
      ? list.filter((item) => item.scannedQty !== item.systemQty)
      : list.filter((item) => item.scannedQty > 0 || item.systemQty > 0);

    // 3. [핵심] 정렬 실행
    const sortedList = [...filteredList].sort((a, b) => {
      if (sortOrder === "desc") return b.scannedQty - a.scannedQty;
      if (sortOrder === "asc") return a.scannedQty - b.scannedQty;
      if (sortOrder === "chosung")
        return getChosung(a.name).localeCompare(getChosung(b.name));
      return a.code.localeCompare(b.code); // 코드순
    });

    return sortedList;
  }, [records, dbMap, products, sortOrder, showOnlyDiff]);
  //

  // 상단 요약 정보 계산
  const totalScannedSum = useMemo(() => {
    return displayList.reduce((sum, item) => sum + item.scannedQty, 0);
  }, [displayList]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* 헤더 영역 - UI 유지 */}
      <div className="flex items-center justify-between px-2 py-3.5 border-b border-gray-300 bg-gray-100">
        <div className="flex flex-col">
          <h1 className="text-xl font-semibold px-1 text-gray-800">
            재고 기록
          </h1>
          <div>
            <span className="text-xs bg-gray-100 px-1 text-gray-600 rounded-full font-bold">
              {displayList.length}개 품목
            </span>
            <span className="text-xs text-gray-500 font-medium">
              (합계: {totalScannedSum.toLocaleString()}개)
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          {/* [추가] 정렬 전환 버튼 */}
          <button
            onClick={() =>
              setSortOrder((prev) =>
                prev === "chosung"
                  ? "asc"
                  : prev === "asc"
                    ? "desc"
                    : prev === "desc"
                      ? "code"
                      : "chosung",
              )
            }
            className="flex items-center gap-1.5 px-2 py-3 w-24 bg-white border border-gray-300 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-50 active:bg-gray-100 transition-colors"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-blue-500" />
            {sortOrder === "desc"
              ? "수량 높은순"
              : sortOrder === "asc"
                ? "수량 낮은순"
                : sortOrder === "chosung"
                  ? "상 품 명순"
                  : "상품코드순"}
          </button>

          {displayList.length > 0 && (
            <button
              onClick={() => setShowOnlyDiff(!showOnlyDiff)}
              className={`flex items-center gap-1.5 px-3 py-3 border rounded-lg text-xs font-bold transition-all ${
                showOnlyDiff
                  ? "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                  : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              {showOnlyDiff ? (
                <CheckCircle className="w-4 h-4 text-blue-500" />
              ) : (
                <List className="w-4 h-4" />
              )}
              {showOnlyDiff ? "완료 숨김" : "전체 보기"}
            </button>
          )}
        </div>
      </div>
      {/* 버튼 액션바 - UI 유지 */}
      <div className="px-5 py-1 border-t border-gray-100 flex items-center justify-between bg-gray-50/30 min-h-[64px]">
        <button
          onClick={() => {
            if (isLocked) onUnlock();
            else if (window.confirm("재고조사를 완료하시겠습니까?")) onLock();
          }}
          disabled={!isDbLoaded || false}
          className={`flex items-center gap-2 px-3 py-3 border border-gray-500 rounded-xl text-sm font-black transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
            isLocked
              ? "bg-gray-400 text-white"
              : "bg-red-400 text-black hover:bg-red-600 shadow-lg"
          }`}
        >
          <CheckCircle className="w-4 h-4" />
          조사완료
        </button>

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
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLocked}
            className="flex items-center gap-1 px-2 py-3 bg-sidebar text-sidebar-foreground border border-gray-500 rounded-xl text-sm font-black hover:bg-gray-100 shadow-lg disabled:opacity-50"
          >
            <FileUp className="w-4 h-4" /> 재고등록
          </button>
          <button
            onClick={onExport}
            disabled={!isDbLoaded}
            className="flex items-center gap-1 px-2 py-3 bg-green-400 border border-gray-500 text-black rounded-xl text-sm font-black hover:bg-green-700 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileDown className="w-4 h-4" /> 재고저장
          </button>
        </div>
      </div>

      {/* 테이블 영역 - code 기준 비교 출력 */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-2 py-3 font-semibold text-gray-600 text-center">
                상품명 / 코드
              </th>
              <th className="w-23 px-2 py-3 font-semibold text-gray-600 text-center">
                수량 / 전산
              </th>
              <th className="w-10 px-2 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {displayList.map((item) => (
              <tr
                key={item.id}
                className="hover:bg-gray-50/50 transition-colors"
              >
                <td className="px-2 py-4 text-center">
                  <div
                    className={`text-[20px] font-bold leading-tight ${item.isScanned ? "text-gray-900" : "text-gray-300"}`}
                  >
                    {item.name}
                  </div>
                  <div className="mt-1">
                    <span
                      className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${item.isScanned ? "text-blue-400 bg-blue-50" : "text-gray-300 bg-gray-50"}`}
                    >
                      {item.code}
                    </span>
                  </div>
                </td>
                <td className="px-2 py-4 text-center tabular-nums">
                  <div className="flex flex-col items-center justify-center">
                    <span
                      className={`text-[23px] font-black leading-none ${item.isScanned ? "text-black" : "text-gray-200"}`}
                    >
                      {item.scannedQty.toLocaleString()}
                    </span>

                    <span
                      className={`text-[13px] font-bold mt-1 ${
                        item.scannedQty < item.systemQty
                        ? "text-red-500"       // 전산보다 적으면 적색
                        : item.scannedQty > item.systemQty
                          ? "text-green-500"   // 전산보다 많으면 녹색
                          : item.systemQty > 0
                            ? "text-blue-500"  // 같으면 파란색
                            : "text-gray-300" // 둘 다 0이면 회색                        
                      }`}
                    >
                      (전산: {item.systemQty.toLocaleString()})
                    </span>
                  </div>
                </td>
                <td className="px-1 py-2 text-center">
                  {item.isScanned && !isLocked && (
                    <button
                      onClick={() => onDelete(item.id)}
                      className="p-2 text-gray-300 hover:text-red-500 rounded-lg"
                    >
                      <Trash2 className="w-7 h-6" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

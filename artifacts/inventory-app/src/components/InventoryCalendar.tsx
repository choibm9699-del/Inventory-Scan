import { useState, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  FileDown,
  Trash2,
  CalendarDays,
} from "lucide-react";
import type { InventoryRecord } from "../types";
import { exportToExcel } from "../lib/excel";

interface InventoryCalendarProps {
  records: InventoryRecord[];
  onDelete: (id: string) => void;
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const MONTH_NAMES = [
  "1월",
  "2월",
  "3월",
  "4월",
  "5월",
  "6월",
  "7월",
  "8월",
  "9월",
  "10월",
  "11월",
  "12월",
];

function parseKoreanDate(dateStr: string): Date | null {
  // "2026. 4. 8." -> year=2026, month=4, day=8
  const cleaned = dateStr.replace(/\s/g, "").replace(/\.$/, "");
  const parts = cleaned.split(".");
  if (parts.length < 3) return null;
  const [y, m, d] = parts.map(Number);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
  return new Date(y, m - 1, d);
}

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function recordToDateKey(dateStr: string): string | null {
  // "2026-04-28" 형식 처리 추가
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split("-").map(Number);
    return `${y}-${m}-${d}`; // "2026-4-28" 형식으로 통일
  }
  // 기존 한국어 형식 "2026. 4. 8." 처리
  const d = parseKoreanDate(dateStr);
  if (!d) return null;
  return toDateKey(d);
}

export function InventoryCalendar({
  records,
  onDelete,
}: InventoryCalendarProps) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedKey, setSelectedKey] = useState<string | null>(
    toDateKey(today),
  );

  const recordsByDate = useMemo(() => {
    const map = new Map<string, InventoryRecord[]>();
    for (const r of records) {
      const key = recordToDateKey(r.date);
      if (!key) continue;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return map;
  }, [records]);

  function prevMonth() {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else setViewMonth((m) => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else setViewMonth((m) => m + 1);
  }

  const firstDay = new Date(viewYear, viewMonth, 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

  const todayKey = toDateKey(today);

  // --- 이 구역을 찾아서 아래 코드로 교체해 주세요 ---

  // 1. 선택된 날짜의 "원본 개별 로그 리스트"를 가져옵니다.
  const rawSelectedRecords = selectedKey
    ? (recordsByDate.get(selectedKey) ?? [])
    : [];

  // 2. 🔥 [핵심 수정] 동일 상품(바코드) 기준 수량 합산 처리
  const selectedRecords = useMemo(() => {
    const groupMap = new Map<string, InventoryRecord>();

    for (const r of rawSelectedRecords) {
      if (groupMap.has(r.barcode)) {
        // 이미 맵에 등록된 상품이라면 수량만 더해줍니다.
        const existing = groupMap.get(r.barcode)!;
        existing.quantity += r.quantity;

        // 시간 정보는 가장 마지막에 찍힌 시간으로 계속 업데이트해 줍니다.
        if (r.time) existing.time = r.time;
      } else {
        // 처음 등장한 상품이라면 복사본을 만들어 맵에 새로 등록합니다.
        groupMap.set(r.barcode, { ...r });
      }
    }

    // 합산이 완료된 이쁜 리스트 배열을 반환합니다.
    return Array.from(groupMap.values());
  }, [rawSelectedRecords]);

  // 3. 우측 상단 요약용 전체 총수량 (합산된 리스트 기준으로 계산)
  const selectedTotal = selectedRecords.reduce((s, r) => s + r.quantity, 0);

  function formatSelectedLabel() {
    if (!selectedKey) return "";
    const [y, m, d] = selectedKey.split("-").map(Number);
    return `${y}년 ${m}월 ${d}일`;
  }

  const monthRecordCount = useMemo(() => {
    let count = 0;
    for (const [key, recs] of recordsByDate.entries()) {
      const [y, m] = key.split("-").map(Number);
      if (y === viewYear && m === viewMonth + 1) count += recs.length;
    }
    return count;
  }, [recordsByDate, viewYear, viewMonth]);

  // --- 여기 아래부터는 기존 return (...) 문이 시작됩니다 ---

  return (
    <div className="bg-card rounded-xl border border-card-border shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-card-foreground">캘린더</span>
          {monthRecordCount > 0 && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
              이번 달 {monthRecordCount}건
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row">
        {/* Calendar grid */}
        <div className="flex-1 p-4 border-b lg:border-b-0 lg:border-r border-border">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={prevMonth}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="font-bold text-base">
              {viewYear}년 {MONTH_NAMES[viewMonth]}
            </span>
            <button
              onClick={nextMonth}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-7 mb-1">
            {WEEKDAYS.map((d, i) => (
              <div
                key={d}
                className={`text-center text-xs font-semibold py-1 ${i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : "text-muted-foreground"}`}
              >
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-y-1">
            {Array.from({ length: totalCells }).map((_, idx) => {
              const dayNum = idx - startOffset + 1;
              const isValid = dayNum >= 1 && dayNum <= daysInMonth;
              if (!isValid) return <div key={idx} />;

              const key = `${viewYear}-${viewMonth + 1}-${dayNum}`;
              const dayRecords = recordsByDate.get(key);
              const hasRecords = !!dayRecords && dayRecords.length > 0;
              const isToday = key === todayKey;
              const isSelected = key === selectedKey;
              const colIdx = idx % 7;

              return (
                <button
                  key={idx}
                  onClick={() => setSelectedKey(key)}
                  className={`
                    relative flex flex-col items-center py-1.5 rounded-xl transition-all text-sm font-medium
                    ${isSelected ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-muted"}
                    ${isToday && !isSelected ? "ring-2 ring-primary/40" : ""}
                    ${colIdx === 0 && !isSelected ? "text-red-500" : ""}
                    ${colIdx === 6 && !isSelected ? "text-blue-500" : ""}
                  `}
                >
                  <span>{dayNum}</span>
                  {/* --- 기존 코드를 찾아서 아래 블록으로 교체해 주세요 --- */}
                  {hasRecords && (
                    <div className="flex gap-0.5 mt-0.5 items-center justify-center">
                      {dayRecords!.length <= 3 ? (
                        // 1. 기록이 3건 이하일 때는 기존처럼 이쁘게 점(Dot)으로 표시합니다.
                        dayRecords!.map((_, i) => (
                          <span
                            key={i}
                            className={`w-1 h-1 rounded-full ${isSelected ? "bg-primary-foreground/70" : "bg-primary"}`}
                          />
                        ))
                      ) : (
                        // 2. 🔥 [핵심 수정] 기록이 4건 이상일 때 중복 바코드를 제거한 '진짜 상품 종류 수'를 구합니다.
                        (() => {
                          // Set을 이용해 똑같은 바코드는 하나로 뭉뚱그려 유일한 값만 남깁니다.
                          const uniqueProductsCount = new Set(dayRecords!.map((r) => r.barcode)).size;

                          return (
                            <>
                              <span
                                className={`w-1 h-1 rounded-full ${isSelected ? "bg-primary-foreground/70" : "bg-primary"}`}
                              />
                              <span
                                className={`text-[9px] font-bold leading-none ${isSelected ? "text-primary-foreground/80" : "text-primary"}`}
                              >
                                {uniqueProductsCount} {/* 👈 이제 '건수'가 아니라 합산된 '품목 수'가 보입니다 */}
                              </span>
                            </>
                          );
                        })()
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Month summary dots legend */}
          <div className="mt-3 pt-3 border-t border-border flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-primary inline-block" />
            <span>기록이 있는 날짜</span>
          </div>
        </div>

        {/* Day detail panel */}
        <div className="w-full lg:w-80 flex flex-col">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <div>
              <div className="font-semibold text-sm text-foreground">
                {selectedKey ? formatSelectedLabel() : "날짜를 선택하세요"}
              </div>
              {selectedRecords.length > 0 && (
                <div className="text-xs text-muted-foreground mt-0.5">
                  {selectedRecords.length}건 · 합계{" "}
                  {selectedTotal.toLocaleString()}
                </div>
              )}
            </div>
            {selectedRecords.length > 0 && (
              <button
                onClick={() => {
                  // 1. 선택된 날짜(selectedKey: "2026-4-14")를 기반으로 자릿수 맞추기
                  if (!selectedKey) return;

                  const [y, m, d] = selectedKey.split("-");
                  const formattedDate = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;

                  // 2. 0000-00-00_재고조사 형식으로 내보내기
                  exportToExcel(selectedRecords, `${formattedDate}_재고조사`);
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors"
              >
                <FileDown className="w-3.5 h-3.5" />
                엑셀
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto max-h-80 lg:max-h-none">
            {selectedRecords.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <CalendarDays className="w-10 h-10 opacity-20 mb-2" />
                <p className="text-sm">이 날의 기록이 없습니다</p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {selectedRecords.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[10px] font-medium bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                          {r.code}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {r.time}
                        </span>
                      </div>
                      <div className="text-sm font-medium text-foreground truncate">
                        {r.name}
                      </div>
                      <div className="text-xs font-mono text-muted-foreground">
                        {r.barcode}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-3 shrink-0">
                      <div className="text-right">
                        <span className="text-base font-bold tabular-nums">
                          {r.quantity.toLocaleString()}
                        </span>
                      </div>
                     
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

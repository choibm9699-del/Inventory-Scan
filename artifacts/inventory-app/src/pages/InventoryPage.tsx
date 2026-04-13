import { useState, useRef, KeyboardEvent } from "react";
import {
  Barcode,
  Camera,
  Search,
  Package,
  ClipboardList,
  CheckCircle,
  AlertCircle,
  List,
  CalendarDays,
} from "lucide-react";
import { useEffect } from "react";
import { BarcodeScanner } from "../components/BarcodeScanner";
import { ProductManager } from "../components/ProductManager";
import { InventoryTable } from "../components/InventoryTable";
import { InventoryCalendar } from "../components/InventoryCalendar";
import { PasswordModal } from "../components/PasswordModal";
import { useProducts } from "../hooks/useProducts";
import { useInventory } from "../hooks/useInventory";
import { exportToExcel } from "../lib/excel";
import type { Product } from "../types";
import { db } from "../firebase.ts"; // 아까 만든 설정 파일
import {
  ref,
  push,
  serverTimestamp,
  update,
  set,
  onValue,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

type ViewMode = "list" | "calendar";

export function InventoryPage() {
  const {
    products,
    addProduct,
    updateProduct,
    deleteProduct,
    searchByBarcode,
    resetToDefault,
  } = useProducts();
  const { records, addRecord, deleteRecord, clearAll } = useInventory();
  const [isSaving, setIsSaving] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showProductManager, setShowProductManager] = useState(false);
  const [searchState, setSearchState] = useState<"idle" | "found" | "notfound">(
    "idle",
  );
  const [isUnlockMode, setIsUnlockMode] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  //추가

  useEffect(() => {
    // 1. 오늘 날짜 생성 (예: 2026-4-14)
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;

    // 2. DB에서 오늘 날짜의 '잠금' 상태 경로 지정
    const lockRef = ref(db, `locks/${dateStr}`);

    // 3. 실시간으로 DB 값 읽기
    const unsubscribe = onValue(lockRef, (snapshot) => {
      if (snapshot.exists() && snapshot.val() === true) {
        setIsLocked(true); // DB가 true면 화면을 잠금
      } else {
        setIsLocked(false); // DB에 없거나 false면 잠금 해제
      }
    });

    return () => unsubscribe(); // 페이지 나갈 때 연결 끊기
  }, []);
  // 추가
  const [isLocked, setIsLocked] = useState(false);
  //
  const quantityRef = useRef<HTMLInputElement>(null);
  const todayLabel = new Date()
    .toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
    .replace(/\s+/g, "-")
    .replace(/년|월|일/g, "");

  function handleSearch(barcode?: string) {
    const code = (barcode ?? barcodeInput).trim();
    if (!code) return;
    const found = searchByBarcode(code);
    if (found) {
      setCurrentProduct(found);
      setSearchState("found");
      setQuantity("");
      setTimeout(() => quantityRef.current?.focus(), 100);
    } else {
      setCurrentProduct(null);
      setSearchState("notfound");
    }
  }

  // 락기능 추가
  const handleLock = async () => {
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;

    try {
      // Firebase의 'locks' 폴더 안에 오늘 날짜로 true 저장
      await set(ref(db, `locks/${dateStr}`), true);
      setIsLocked(true);
      alert("오늘 재고조사가 마감되었습니다.");
    } catch (error) {
      console.error("마감 처리 중 오류:", error);
      alert("마감 처리 중 문제가 발생했습니다.");
    }
  };

  const handleActualUnlock = async () => {
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;

    try {
      // DB에서 오늘 날짜의 잠금 데이터를 지웁니다.
      await set(ref(db, `locks/${dateStr}`), null);
      setIsLocked(false);
      alert("오늘 재고조사 마감이 해제되었습니다.");
    } catch (error) {
      alert("해제 중 오류가 발생했습니다.");
    }
  };

  function handleBarcodeKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") handleSearch();
  }

  function handleQuantityKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") handleSave();
  }

  function handleScanDetected(barcode: string) {
    setBarcodeInput(barcode);
    setShowScanner(false);
    handleSearch(barcode);
  }

  async function handleSave() {
    if (!currentProduct || isSaving) return;

    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) return;

    setIsSaving(true);

    try {
      // 1. 오늘 날짜 문자열 생성 (저장 형식과 일치하도록)
      const todayStr = new Date().toLocaleDateString("ko-KR");

      // 2. [수정] 바코드뿐만 아니라 '오늘 날짜'까지 일치하는 기록이 있는지 확인
      const existingRecord = records.find(
        (r) => r.barcode === currentProduct.barcode && r.date === todayStr,
      );

      if (existingRecord && existingRecord.id) {
        // [업데이트] 오늘 이미 입력한 내역이 있는 경우에만 수량 합산
        const recordRef = ref(db, `inventory_records/${existingRecord.id}`);

        await update(recordRef, {
          quantity: existingRecord.quantity + qty,
          timestamp: serverTimestamp(),
          time: new Date().toLocaleTimeString("ko-KR", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        });
        console.log("오늘 작업분 수량 합산 완료");
      } else {
        // [신규 저장] 오늘 처음 입력하는 바코드이거나 과거 데이터만 있는 경우 새로 생성
        const inventoryRef = ref(db, "inventory_records");
        const newRecord = {
          barcode: currentProduct.barcode,
          code: currentProduct.code,
          name: currentProduct.name,
          quantity: qty,
          timestamp: serverTimestamp(),
          date: todayStr, // 오늘 날짜 명시
          time: new Date().toLocaleTimeString("ko-KR", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        };
        await push(inventoryRef, newRecord);
        console.log("새로운 항목 저장 완료");
      }

      // 입력창 초기화 및 포커스 이동
      setLastSaved(`${currentProduct.name} (${qty}개 저장)`);
      setBarcodeInput("");
      setCurrentProduct(null);
      setQuantity("");
      setSearchState("idle");

      setTimeout(() => setLastSaved(null), 3000);
      setTimeout(() => {
        document.getElementById("barcode-input")?.focus();
      }, 100);
    } catch (error) {
      console.error("저장 에러:", error);
      alert("데이터 처리에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  }
  const isCalendarView = viewMode === "calendar";

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {showPasswordModal && (
        <PasswordModal
          onSuccess={() => {
            setShowPasswordModal(false);

            if (isUnlockMode) {
              // 1. 해제 버튼을 눌러서 비번창을 띄운 경우
              handleActualUnlock();
              setIsUnlockMode(false); // 모드 초기화
            } else {
              // 2. 상품 관리 버튼을 눌러서 비번창을 띄운 경우
              setShowProductManager(true);
            }
          }}
          onClose={() => {
            setShowPasswordModal(false);
            setIsUnlockMode(false); // 닫을 때도 모드 초기화
          }}
        />
      )}
      {showProductManager && (
        <ProductManager
          products={products}
          onAdd={addProduct}
          onUpdate={updateProduct}
          onDelete={deleteProduct}
          onReset={resetToDefault}
          onClose={() => setShowProductManager(false)}
        />
      )}

      <header className="bg-sidebar text-sidebar-foreground shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between w-full">
          <div className="flex items-center gap-1">
            <div className="w-9 h-9 bg-sidebar-primary rounded-lg flex items-center justify-center">
              <img
                src="/icon512.png"
                alt="아이콘"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">현장 재고조사</h1>
              <p className="text-xs text-sidebar-foreground/60">
                Inventory Manager
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowPasswordModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-sidebar-accent rounded-lg text-sm font-medium hover:bg-sidebar-accent/80 transition-colors"
          >
            <Package className="w-4 h-4" />
            상품 관리
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-5 w-full overflow-x-hidden">
        {showScanner && (
          <BarcodeScanner
            onDetected={handleScanDetected}
            onClose={() => setShowScanner(false)}
          />
        )}
        <div className="bg-card border border-card-border rounded-xl shadow-sm p-5">
          <h2 className="font-semibold text-sm text-muted-foreground mb-4 flex items-center gap-2">
            <Barcode className="w-4 h-4" />
            바코드 입력 / 스캔
          </h2>

          <div className="flex gap-2 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                id="barcode-input"
                type="text"
                disabled={isCalendarView || isLocked} // isLocked 추가!
                className={`w-full pl-9 pr-3 py-2.5 border border-input rounded-lg text-sm mt-[5px] mb-[5px] ${
                  isCalendarView || isLocked
                    ? "bg-muted text-muted-foreground cursor-not-allowed opacity-60"
                    : "bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                }`}
                placeholder="바코드 입력 후 Enter"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyDown={handleBarcodeKeyDown}
                autoComplete="off"
              />
            </div>
            <button
              onClick={() => handleSearch()}
              disabled={isCalendarView || isLocked}
              className={`px-4.5 py-1.5 bg-primary text-primary-foreground rounded-lg font-medium transition-opacity ${
                isCalendarView || isLocked
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:opacity-90"
              }`}
            >
              검 색
            </button>
            <button
              onClick={() => setShowScanner(true)}
              disabled={isCalendarView || isLocked}
              className={`flex items-center gap-1.5 px-4 py-2.5 bg-sidebar text-sidebar-foreground rounded-lg font-medium transition-opacity ${
                isCalendarView || isLocked
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:opacity-90"
              }`}
            >
              <Camera className="w-4 h-4" />
              카메라
            </button>
          </div>

          {lastSaved && (
            <div className="flex items-center gap-2 mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span className="text-sm font-medium">
                "{lastSaved}" 저장 완료
              </span>
            </div>
          )}

          {searchState === "notfound" && (
            <div className="flex items-center gap-2 mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="text-sm">등록된 상품을 찾을 수 없습니다.</span>
            </div>
          )}

          {/* 상품이 검색되었을 때만 보여주는 영역 */}
          {searchState === "found" && currentProduct && (
            <div className="bg-muted/30 border border-border rounded-xl p-4">
              <div className="mb-3">
                <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  {currentProduct.code}
                </span>
                <h3 className="text-xl font-bold text-foreground mt-1">
                  {currentProduct.name}
                </h3>
                <p className="text-xs text-muted-foreground font-mono">
                  {currentProduct.barcode}
                </p>
              </div>

              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <label
                    htmlFor="quantity-input"
                    className="text-xs font-medium text-muted-foreground block mb-1.5"
                  >
                    현재 수량
                  </label>
                  <input
                    id="quantity-input"
                    ref={quantityRef}
                    type="number"
                    className="w-full px-4 py-3 text-2xl font-bold border-2 border-input rounded-xl bg-background focus:outline-none focus:border-primary text-center"
                    placeholder="0"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    onKeyDown={handleQuantityKeyDown}
                  />
                </div>
                <button
                  onClick={handleSave}
                  disabled={!quantity || parseFloat(quantity) < 0 || isSaving} // isSaving 추가
                  className="px-8 py-3 bg-primary text-primary-foreground rounded-xl text-base font-bold hover:opacity-90 disabled:opacity-40"
                >
                  {isSaving ? "저장 중..." : "저장"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* View mode tabs */}
        <div className="flex items-center gap-1 bg-muted rounded-xl p-1 w-fit">
          <button
            onClick={() => setViewMode("list")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              viewMode === "list"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            <List className="w-4 h-4" />
            오늘 [{todayLabel}]
          </button>
          <button
            onClick={() => setViewMode("calendar")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              viewMode === "calendar"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            캘린더
          </button>
        </div>

        {viewMode === "list" ? (
          <InventoryTable
            records={records}
            onDelete={deleteRecord}
            onExport={() => {
              // 1. 현재 날짜를 "2026-4-14" 형식으로 만듭니다.
              const now = new Date();
              const dateStr = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;

              // 2. 파일명 뒤에 날짜를 붙여서 내보냅니다.
              exportToExcel(records, `${dateStr}_재고조사`);
            }}
            onClear={clearAll}
            isLocked={isLocked}
            onLock={handleLock}
            onUnlock={() => {
              setIsUnlockMode(true);
              setShowPasswordModal(true);
            }}
            // onLock={() => setIsLocked(true)}
          />
        ) : (
          <InventoryCalendar records={records} onDelete={deleteRecord} />
        )}
      </main>
    </div>
  );
}

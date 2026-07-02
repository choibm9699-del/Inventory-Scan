import { useState, useRef, KeyboardEvent } from "react";
import {
  Barcode,
  Camera,
  Search,
  Package,
  CheckCircle,
  AlertCircle,
  List,
  CalendarDays,
} from "lucide-react";
import { useEffect } from "react";
import * as XLSX from "xlsx";
import { BarcodeScanner } from "../components/BarcodeScanner";
import { ProductManager } from "../components/ProductManager";
import { InventoryTable } from "../components/InventoryTable";
import { InventoryCalendar } from "../components/InventoryCalendar";
import { PasswordModal } from "../components/PasswordModal";
import { useProducts } from "../hooks/useProducts";
import { useInventory } from "../hooks/useInventory";
import { exportToExcel, processInventoryExcel } from "../lib/excel";
import type { Product } from "../types";
import { db } from "../firebase.ts"; // 아까 만든 설정 파일
import {
  ref,
  push,
  get,
  remove,
  serverTimestamp,
  update,
  set,
  onValue,
} from "firebase/database";

type ViewMode = "list" | "calendar";

export function InventoryPage() {
  const { products, addProduct, updateProduct, deleteProduct, resetToDefault } =
    useProducts();
  const { records, allRecords, deleteRecord, clearAll } = useInventory();
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
  const [systemInventory, setSystemInventory] = useState<
    Record<string, number>
  >({});
  const [productNameInput, setProductNameInput] = useState("");
  const [foundCandidates, setFoundCandidates] = useState<Product[]>([]);
  const [showCandidateModal, setShowCandidateModal] = useState(false);

  useEffect(() => {
    const now = new Date();
    const dateKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const dailyRef = ref(db, `daily_uploads/${dateKey}`);

    const unsubscribe = onValue(dailyRef, (snapshot) => {
      const data = snapshot.val();
      const formattedMap: Record<string, number> = {}; // { "코드": 수량 } 형태의 지도

      if (data) {
        // DB에서 가져온 데이터를 하나씩 확인하며 지도에 담기
        Object.values(data).forEach((item: any) => {
          if (item.code) {
            // 같은 코드가 여러 개일 수 있으므로 기존 값에 더해줌
            formattedMap[item.code] =
              (formattedMap[item.code] || 0) + (Number(item.quantity) || 0);
          }
        });
      }

      // 우리가 InventoryTable에 던져줄 systemInventory에 저장!
      setSystemInventory(formattedMap);
    });

    return () => unsubscribe();
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

  // 재고업로드
  async function handleImport(file: File) {
    try {
      // 1. 엑셀 먼저 분석 (파일이 잘못되었으면 여기서 바로 catch로 이동)
      const filteredData = await processInventoryExcel(file);

      const formattedMap: Record<string, number> = {};
      filteredData.forEach((item: any) => {
        formattedMap[item.code] = Number(item.quantity) || 0;
      });
      setSystemInventory(formattedMap);

      // 날짜 및 시간 설정
      const now = new Date();
      const d = new Date();
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const todayStr = now.toLocaleDateString("ko-KR");
      const timeStr = now.toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
      });

      const dailyRef = ref(db, `daily_uploads/${dateKey}`);

      // 2. 해당 날짜에 이미 데이터가 존재하는지 확인
      const snapshot = await get(dailyRef);

      if (snapshot.exists()) {
        // 데이터가 이미 있는 경우 사용자에게 선택지 제공
        const confirmReset = window.confirm(
          `[${dateKey}] 날짜에 이미 업로드된 데이터가 있습니다!!.\n기존 데이터를 삭제하고 새로 업로드하시겠습니까?`,
        );

        if (!confirmReset) {
          // '아니오' 선택 시 중단
          return;
        }

        // '예' 선택 시 기존 데이터 초기화
        await remove(dailyRef);
      } else {
        // 데이터가 없는 경우 일반적인 업로드 확인
        if (!window.confirm("엑셀 데이터를 분석하여 업로드하시겠습니까?"))
          return;
      }

      // 3. 데이터 저장 진행
      // 반복문 대신 한 번에 쓰기(Update)를 고려할 수도 있으나,
      // 기존 구조 유지를 위해 push 방식을 사용합니다.
      for (const item of filteredData) {
        const newRecord = {
          code: item.code,
          name: item.name,
          quantity: item.quantity,
          date: todayStr,
          time: timeStr,
          timestamp: serverTimestamp(),
          source: "excel_upload",
        };

        await push(dailyRef, newRecord);
      }

      alert(
        `성공적으로 [${dateKey}] 데이터가 최신화되었습니다. (총 ${filteredData.length}건)`,
      );
    } catch (error) {
      console.error("업로드 에러:", error);
      alert(
        "파일 처리 중 오류가 발생했습니다. 엑셀 형식이나 네트워크 상태를 확인해주세요.",
      );
    }
  }
  // 검색기능
  function handleSearch(barcode?: string) {
    const code = (barcode ?? barcodeInput).trim();
    const isBarcode = code.length > 5; // 6자리 이상 → 바코드, 5자리 이하 → 상품코드

    const matched = products.filter(
      (p) =>
        isBarcode
          ? p.barcode === code // 바코드 정확 일치
          : p.code === code || (p.code?.endsWith(code) ?? false), // 상품코드 검색
    );

    if (matched.length === 0) {
      setCurrentProduct(null);
      setSearchState("notfound");
    } else if (matched.length === 1) {
      // 1개면 바로 선택
      setCurrentProduct(matched[0]);
      setSearchState("found");
      setQuantity("");
      setTimeout(() => quantityRef.current?.focus(), 100);
    } else {
      // 여러 개면 선택 모달
      setFoundCandidates(matched);
      setShowCandidateModal(true);
    }
  }
  //상품명 검색
  const handleProductNameSearch = () => {
    if (!productNameInput.trim()) return;

    const keyword = productNameInput.trim().toLowerCase();
    const matched = products.filter(
      (p) => p.name?.toLowerCase().includes(keyword) ?? false,
    );

    if (matched.length === 0) {
      setCurrentProduct(null);
      setSearchState("notfound");
    } else if (matched.length === 1) {
      // 1개면 바로 선택
      setCurrentProduct(matched[0]);
      setSearchState("found");
      setQuantity("");
      setProductNameInput("");
      setTimeout(() => quantityRef.current?.focus(), 100);
    } else {
      // 여러 개면 기존 모달 재사용
      setFoundCandidates(matched);
      setShowCandidateModal(true);
    }
  };

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
    setProductNameInput("");
    setShowScanner(false);
    handleSearch(barcode);
  }
  //handleMinusSave 수정기능
  async function handleMinusSave() {
    if (!currentProduct || isSaving) return;

    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) return;

    // ---------------- [확인창 추가] ----------------
    // 취소를 누르면 함수를 여기서 종료하여 저장을 막습니다.
    if (!confirm(`[차감 알림]\n${currentProduct.name} 제품을 ${qty}개 차감하시겠습니까?`)) {
      return; 
    }
    // ---------------------------------------------

    setIsSaving(true);

    try {
      const now = new Date();
      const dateKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      const todayStr = new Date().toLocaleDateString("ko-KR");

      const dailyRecordsRef = ref(db, `inventory_records/${dateKey}`);

      const existingRecord = records.find(
        (r) => r.barcode === currentProduct.barcode && r.date === todayStr,
      );

      const finalQty = -qty;

      if (existingRecord && existingRecord.id) {
        const recordRef = ref(db, `inventory_records/${dateKey}/${existingRecord.id}`);
        await update(recordRef, {
          quantity: existingRecord.quantity + finalQty,
          timestamp: serverTimestamp(),
          time: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }),
        });
      } else {
        const newRecord = {
          barcode: currentProduct.barcode,
          code: currentProduct.code,
          name: currentProduct.name,
          quantity: finalQty,
          timestamp: serverTimestamp(),
          date: todayStr,
          time: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }),
        };
        await push(dailyRecordsRef, newRecord);
      }

      setLastSaved(`${currentProduct.name} (${qty}개 차감)`);
      setBarcodeInput("");
      setCurrentProduct(null);
      setQuantity("");
      setSearchState("idle");

      setTimeout(() => setLastSaved(null), 3000);
      setTimeout(() => {
        document.getElementById("barcode-input")?.focus();
      }, 100);
    } catch (error) {
      console.error("차감 저장 에러:", error);
      alert("데이터 처리에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  }


  
  //handsave 저장기능
  async function handleSave() {
    if (!currentProduct || isSaving) return;

    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) return;

    setIsSaving(true);

    try {
      // 1. 오늘 날짜 문자열 생성 (저장 형식과 일치하도록
      const now = new Date();
      const dateKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      const todayStr = new Date().toLocaleDateString("ko-KR");

      const dailyRecordsRef = ref(db, `inventory_records/${dateKey}`);

      // 2. [수정] 바코드뿐만 아니라 '오늘 날짜'까지 일치하는 기록이 있는지 확인
      const existingRecord = records.find(
        (r) => r.barcode === currentProduct.barcode && r.date === todayStr,
      );

      if (existingRecord && existingRecord.id) {
        // [업데이트] 오늘 이미 입력한 내역이 있는 경우에만 수량 합산
        const recordRef = ref(
          db,
          `inventory_records/${dateKey}/${existingRecord.id}`,
        );

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
        await push(dailyRecordsRef, newRecord);
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

  // 오늘 날짜 문자열 포맷 생성 (ko-KR 형식)
  const todayDot = new Date().toLocaleDateString("ko-KR");

  // 오늘 날짜이면서 현재 검색된 상품의 실사 수량 총합 계산
  const currentScannedQty = currentProduct 
    ? records
        .filter((r) => r.barcode === currentProduct.barcode && r.date === todayDot)
        .reduce((sum, r) => sum + (Number(r.quantity) || 0), 0)
    : 0;

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

      {showCandidateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-card rounded-lg shadow-xl w-full max-w-sm p-5">
            <h2 className="text-base font-bold text-foreground mb-1 ml-[5px]">
              검색 결과 선택
            </h2>
            <p className="text-xs text-muted-foreground mb-4 ml-[5px]">
              총 {foundCandidates.length}개 상품이 검색되었습니다.
            </p>

            <ul className="space-y-2 max-h-72 overflow-y-auto">
              {foundCandidates.map((product) => (
                <li key={product.code}>
                  <button
                    onClick={() => {
                      setCurrentProduct(product);
                      setSearchState("found");
                      setQuantity("");
                      setShowCandidateModal(false);
                      setFoundCandidates([]);
                      setBarcodeInput("");
                      setTimeout(() => quantityRef.current?.focus(), 100);
                    }}
                    className="w-full px-2 py-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 flex gap-4 items-center">
                    <span className="text-[13px] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-sm ml-[2px]">
                      {product.code}
                    </span>

                      <p className="text-xs text-muted-foreground font-mono">
                        {product.barcode}
                      </p>
                       </div>
                    <p className="text-[22px] text-left font-semibold text-foreground mt-1 ml-[5px]">
                      {product.name}
                    </p>
                    
                    
                  </button>
                </li>
              ))}
            </ul>

            <button
              onClick={() => {
                setShowCandidateModal(false);
                setFoundCandidates([]);
              }}
              className="mt-4 w-full py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
            >
              닫기
            </button>
          </div>
        </div>
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
        <div className="bg-card border border-card-border rounded-xl shadow-sm p-4">
          <h2 className="font-semibold text-sm text-muted-foreground mb-4 flex items-center gap-2">
            <Barcode className="w-4 h-4" />
            상품코드 or 상품명 입력 / 바코드 스캔
          </h2>

          <div className="flex gap-3">
            <div className="flex flex-col">
              <div className="flex-1 relative ">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  id="barcode-input"
                  type="text"
                  disabled={isCalendarView || isLocked} // isLocked 추가!
                  className={`w-full pl-8 pr-1 py-2.5 border border-input rounded-lg text-sm mt-[5px] mb-[5px] ${
                    isCalendarView || isLocked
                      ? "bg-muted text-muted-foreground cursor-not-allowed opacity-60"
                      : "bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  }`}
                  placeholder="상품코드 or 바코드 입력"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  onKeyDown={handleBarcodeKeyDown}
                  autoComplete="off"
                />
              </div>

              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  id="product-name-input"
                  type="text"
                  disabled={isCalendarView || isLocked}
                  className={`w-full pl-8 pr-1 py-2.5 border border-input rounded-lg text-sm mt-[5px] mb-[5px] ${
                    isCalendarView || isLocked
                      ? "bg-muted text-muted-foreground cursor-not-allowed opacity-60"
                      : "bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  }`}
                  placeholder="상품명 입력"
                  value={productNameInput}
                  onChange={(e) => setProductNameInput(e.target.value)}
                  autoComplete="off"
                />
              </div>
            </div>

            <button
              onClick={() => {
                if (productNameInput.trim()) {
                  setBarcodeInput(""); // 바코드 초기화
                  handleProductNameSearch();
                } else {
                  setProductNameInput(""); // 상품명 초기화
                  handleSearch();
                }
              }}
              disabled={isCalendarView || isLocked}
              className={`px-3.5 py-1 border border-gray-500 bg-primary  text-primary-foreground  rounded-lg font-medium transition-opacity ${
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
              className={`flex-2 flex flex-col items-center justify-center gap-2 px-3 py-3 bg-sidebar text-sidebar-foreground text-sm rounded-lg bg-gray-100 font-bold transition-opacity ${
                isCalendarView || isLocked
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:opacity-90"
              }`}
            >
              <Camera className="w-6 h-6" />
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

          {/* [수정] 상품 정보가 있을 때만 표시하고, 없을 때는 안내 문구만 표시 */}
           <div className="bg-muted/30 border border-border  rounded-xl p-2 mt-[10px]">

            <div className="flex gap-3 items-end justify-between">
              <div className="flex-1 min-w-0">
                
                {currentProduct ? (
                  <>
                    

                    <span className="text-[15px] font-medium bg-primary/10 text-primary px-1 py-0.5 rounded-sm ml-[5px]">
                      {currentProduct.code}
                    </span>
                      <h3 className="text-[25px] font-bold text-foreground mt-1 ml-[5px]">
                        {currentProduct.name}
                      </h3>
                    <p className="text-[15px] text-muted-foreground font-mono0 ml-[8px]">
                        {currentProduct.barcode}
                    </p>

                      
                    
                    
                  </>
                ) : (
                  <div className="py-2 text-sm text-muted-foreground text-left font-semibold mt-[0px] mb-[15px] ml-[10px]">
                    스캔 또는 상품 검색해 주세요.
                  </div>
                )}
              </div>

              <div className="flex flex-col items-start justify-between gap-1 mb-1.5">
                <span className="text-xs font-bold bg-muted text-foreground px-2 py-0.5 rounded-sm">
                  수량 : {currentProduct ? `${currentScannedQty}개` : "0개"}
                </span>
                <button
                  onClick={handleMinusSave} // 새로 만든 빼기 버튼
                  disabled={!currentProduct || !quantity || parseFloat(quantity) < 0 || isSaving}
                  className="w-[100px] py-3.5 bg-red-500 text-white rounded-lg text-xl font-bold hover:bg-red-600 disabled:opacity-40 transition-colors"
                >        
                  차감
                </button>
              </div>
            </div>

            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label
                  htmlFor="quantity-input"
                  className="text-xs font-medium text-muted-foreground block mt-1.5 ml-[8px]"
                >
                  재고 수량 입력
                </label>
                <input
                  id="quantity-input"
                  ref={quantityRef}
                  type="number"
                  disabled={!currentProduct}
                  className="w-full px-4 py-3 text-2xl font-bold border-2 border-input rounded-lg bg-background focus:outline-none focus:border-primary text-center ml-[1px] mr-[1px] disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-muted"
                  placeholder="0"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  onKeyDown={handleQuantityKeyDown}
                />
              </div>
              <button
                onClick={handleSave}
                disabled={!currentProduct || !quantity || parseFloat(quantity) < 0 || isSaving}
                className="w-[100px] py-5 bg-primary text-primary-foreground rounded-lg text-xl font-bold hover:opacity-90 disabled:opacity-40"
              >
                {isSaving ? "저장 중..." : "저장"}
              </button>
            </div>
          </div>
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
            products={products}
            dbMap={systemInventory}
            onDelete={deleteRecord}
            onExport={async () => {
              // 1. 오늘 날짜 키 (비교용)
              const d = new Date();
              const todayDash = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
              const todayDot = d.toLocaleDateString("ko-KR");
              const todayScanned = records.filter((r) => r.date === todayDot); // 저장형식이 ko-KR이므로 하나만

              // 3. DB에서 오늘치 전산재고(daily_uploads) 원본 가져오기
              const snapshot = await get(ref(db, `daily_uploads/${todayDash}`));
              const dbData = snapshot.val() || {};

              // 4. [핵심] 모든 상품 코드 모으기 (전산 + 실사 합치기)
              const dbCodes = Object.keys(dbData).map((key) =>
                String(dbData[key].code).trim(),
              );
              const scannedCodes = todayScanned.map((r) =>
                String(r.code).trim(),
              );
              const allCodes = Array.from(
                new Set([...dbCodes, ...scannedCodes]),
              );

              // 5. 엑셀에 들어갈 전체 데이터 생성
              const exportData = allCodes.map((code) => {
                // 해당 코드의 실사 데이터 합산
                const scannedItems = todayScanned.filter(
                  (r) => String(r.code).trim() === code,
                );
                const totalScanned = scannedItems.reduce(
                  (sum, r) => sum + (Number(r.quantity) || 0),
                  0,
                );

                // 해당 코드의 전산 데이터 정보 (dbData는 push로 쌓인 객체이므로 값에서 찾음)
                const dbItem = Object.values(dbData).find(
                  (item: any) => String(item.code).trim() === code,
                ) as any;
                const systemQty = Number(dbItem?.quantity || 0);

                return {
                  날짜: todayDash,
                  상품코드: code,
                  상품명:
                    dbItem?.name || scannedItems[0]?.name || "미등록 상품",
                  현장재고: totalScanned,
                  전산재고: systemQty,
                  차이: totalScanned - systemQty,
                };
              });

              // 6. 가공된 전체 데이터를 exportToExcel 대신 여기서 직접 파일로 저장
              // (기존 exportToExcel을 수정하지 않고 여기서 처리하는게 가장 확실합니다)
              const ws = XLSX.utils.json_to_sheet(exportData);
              const wb = XLSX.utils.book_new();
              XLSX.utils.book_append_sheet(wb, ws, "재고조사");

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

              XLSX.writeFile(wb, `${todayDash}_재고조사.xlsx`);
            }}
            onClear={clearAll}
            isLocked={isLocked}
            onLock={handleLock}
            onUnlock={() => {
              setIsUnlockMode(true);
              setShowPasswordModal(true);
            }}
            // onLock={() => setIsLocked(true)}
            onImport={handleImport}
          />
        ) : (
          <InventoryCalendar records={allRecords} onDelete={deleteRecord} />
        )}
      </main>
    </div>
  );
}

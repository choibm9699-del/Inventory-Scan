import { useState, useRef, KeyboardEvent } from "react";
import { Barcode, Camera, Search, Package, ClipboardList, CheckCircle, AlertCircle, List, CalendarDays } from "lucide-react";
import { BarcodeScanner } from "../components/BarcodeScanner";
import { ProductManager } from "../components/ProductManager";
import { InventoryTable } from "../components/InventoryTable";
import { InventoryCalendar } from "../components/InventoryCalendar";
import { PasswordModal } from "../components/PasswordModal";
import { useProducts } from "../hooks/useProducts";
import { useInventory } from "../hooks/useInventory";
import { exportToExcel } from "../lib/excel";
import type { Product } from "../types";

type ViewMode = "list" | "calendar";

export function InventoryPage() {
  const { products, addProduct, updateProduct, deleteProduct, searchByBarcode, resetToDefault } = useProducts();
  const { records, addRecord, deleteRecord, clearAll } = useInventory();

  const [barcodeInput, setBarcodeInput] = useState("");
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showProductManager, setShowProductManager] = useState(false);
  const [searchState, setSearchState] = useState<"idle" | "found" | "notfound">("idle");
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  const quantityRef = useRef<HTMLInputElement>(null);

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

  function handleSave() {
    if (!currentProduct) return;
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty < 0) return;

    const now = new Date();
    addRecord({
      barcode: currentProduct.barcode,
      code: currentProduct.code,
      name: currentProduct.name,
      category: currentProduct.category || "기타",
      unit: currentProduct.unit || "개",
      quantity: qty,
      date: now.toLocaleDateString("ko-KR"),
      time: now.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }),
    });

    setLastSaved(currentProduct.name);
    setBarcodeInput("");
    setCurrentProduct(null);
    setQuantity("");
    setSearchState("idle");

    setTimeout(() => setLastSaved(null), 3000);
    document.getElementById("barcode-input")?.focus();
  }

  return (
    <div className="min-h-screen bg-background">
      {showScanner && (
        <BarcodeScanner onDetected={handleScanDetected} onClose={() => setShowScanner(false)} />
      )}
      {showPasswordModal && (
        <PasswordModal
          onSuccess={() => { setShowPasswordModal(false); setShowProductManager(true); }}
          onClose={() => setShowPasswordModal(false)}
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
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-sidebar-primary rounded-lg flex items-center justify-center">
              <ClipboardList className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">현장 재고조사</h1>
              <p className="text-xs text-sidebar-foreground/60">Inventory Manager</p>
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

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        {/* Scan section */}
        <div className="bg-card border border-card-border rounded-xl shadow-sm p-5">
          <h2 className="font-semibold text-sm text-muted-foreground mb-4 flex items-center gap-2">
            <Barcode className="w-4 h-4" />
            바코드 스캔 / 입력
          </h2>

          <div className="flex gap-2 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                id="barcode-input"
                type="text"
                className="w-full pl-9 pr-3 py-2.5 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                placeholder="바코드 번호 입력 후 Enter"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyDown={handleBarcodeKeyDown}
                autoComplete="off"
              />
            </div>
            <button
              onClick={() => handleSearch()}
              className="px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity ml-[0px] mr-[0px] text-[17px] pl-[26px] pr-[26px] pt-[12px] pb-[12px]"
            >
              검색
            </button>
            <button
              onClick={() => setShowScanner(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-sidebar text-sidebar-foreground rounded-lg font-medium hover:opacity-90 transition-opacity text-[17px] pl-[16px] pr-[16px]"
            >
              <Camera className="w-4 h-4" />
              카메라
            </button>
          </div>

          {lastSaved && (
            <div className="flex items-center gap-2 mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span className="text-sm font-medium">"{lastSaved}" 저장 완료</span>
            </div>
          )}

          {searchState === "notfound" && (
            <div className="flex items-center gap-2 mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="text-sm">등록된 상품을 찾을 수 없습니다. 상품 관리에서 추가해 주세요.</span>
            </div>
          )}

          {searchState === "found" && currentProduct && (
            <div className="bg-muted/30 border border-border rounded-xl p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">{currentProduct.code}</span>
                    <span className="text-xs text-muted-foreground">{currentProduct.category || "기타"}</span>
                  </div>
                  <h3 className="text-xl font-bold text-foreground">{currentProduct.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5 font-mono">{currentProduct.barcode}</p>
                </div>
              </div>

              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                    현재 수량 ({currentProduct.unit || "개"})
                  </label>
                  <input
                    ref={quantityRef}
                    type="number"
                    className="w-full px-4 py-3 text-2xl font-bold border-2 border-input rounded-xl bg-background focus:outline-none focus:border-primary transition-colors text-center"
                    placeholder="0"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    onKeyDown={handleQuantityKeyDown}
                    min="0"
                    step="1"
                  />
                </div>
                <button
                  onClick={handleSave}
                  disabled={!quantity || parseFloat(quantity) < 0}
                  className="px-8 py-3 bg-primary text-primary-foreground rounded-xl text-base font-bold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  저장
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
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <List className="w-4 h-4" />
            오늘
          </button>
          <button
            onClick={() => setViewMode("calendar")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              viewMode === "calendar"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
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
            onExport={() => exportToExcel(records)}
            onClear={clearAll}
          />
        ) : (
          <InventoryCalendar
            records={records}
            onDelete={deleteRecord}
          />
        )}
      </main>
    </div>
  );
}

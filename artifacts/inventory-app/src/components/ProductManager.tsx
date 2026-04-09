import { useState, useRef } from "react";
import { Plus, Pencil, Trash2, X, Check, Package, Upload, Download, AlertCircle } from "lucide-react";
import * as XLSX from "xlsx";
import type { Product } from "../types";

interface ProductManagerProps {
  products: Product[];
  onAdd: (product: Product) => void;
  onUpdate: (barcode: string, updates: Partial<Product>) => void;
  onDelete: (barcode: string) => void;
  onReset: () => void;
  onClose: () => void;
}

const EMPTY_FORM = { barcode: "", code: "", name: "" };

interface UploadResult {
  added: number;
  skipped: number;
  errors: string[];
}

export function ProductManager({ products, onAdd, onUpdate, onDelete, onReset, onClose }: ProductManagerProps) {
  const [editingBarcode, setEditingBarcode] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [editForm, setEditForm] = useState<Product | null>(null);
  const [error, setError] = useState("");
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleAdd() {
    setError("");
    if (!form.barcode.trim()) { setError("바코드를 입력하세요."); return; }
    if (!form.code.trim()) { setError("상품코드를 입력하세요."); return; }
    if (!form.name.trim()) { setError("상품명을 입력하세요."); return; }
    if (products.find((p) => p.barcode === form.barcode)) {
      setError("이미 존재하는 바코드입니다."); return;
    }
    onAdd({ barcode: form.barcode, code: form.code, name: form.name });
    setForm({ ...EMPTY_FORM });
    setShowAdd(false);
  }

  function startEdit(product: Product) {
    setEditingBarcode(product.barcode);
    setEditForm({ ...product });
  }

  function saveEdit() {
    if (!editForm) return;
    onUpdate(editingBarcode!, editForm);
    setEditingBarcode(null);
    setEditForm(null);
  }

  function downloadTemplate() {
    const template = [
      { 바코드: "8801234567890", 상품코드: "P001", 상품명: "생수 500ml" },
      { 바코드: "8809876543210", 상품코드: "P002", 상품명: "콜라 1.5L" },
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    ws["!cols"] = [{ wch: 18 }, { wch: 12 }, { wch: 24 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "상품목록");
    XLSX.writeFile(wb, "상품목록_템플릿.xlsx");
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadResult(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);

        let added = 0;
        let skipped = 0;
        const errors: string[] = [];

        rows.forEach((row, idx) => {
          const rowNum = idx + 2;
          const barcode = String(row["바코드"] ?? row["barcode"] ?? "").trim();
          const code = String(row["상품코드"] ?? row["code"] ?? "").trim();
          const name = String(row["상품명"] ?? row["name"] ?? "").trim();

          if (!barcode || !code || !name) {
            errors.push(`${rowNum}행: 바코드, 상품코드, 상품명은 필수입니다.`);
            return;
          }

          if (products.find((p) => p.barcode === barcode)) {
            skipped++;
            return;
          }

          onAdd({ barcode, code, name });
          added++;
        });

        setUploadResult({ added, skipped, errors });
      } catch {
        setUploadResult({ added: 0, skipped: 0, errors: ["파일을 읽을 수 없습니다. 올바른 엑셀 파일인지 확인하세요."] });
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-card rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            <span className="font-bold text-lg text-card-foreground">상품 목록 관리</span>
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{products.length}개</span>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-muted transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-3 border-b border-border shrink-0 flex flex-wrap gap-2">
          <button
            onClick={() => { setShowAdd(!showAdd); setError(""); setUploadResult(null); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            상품 추가
          </button>
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            템플릿 다운로드
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-sidebar text-sidebar-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Upload className="w-4 h-4" />
            엑셀 업로드
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleFileUpload}
          />
          <button
            onClick={() => { if (confirm("기본 샘플 데이터로 초기화하시겠습니까?")) onReset(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-muted text-muted-foreground rounded-lg text-sm font-medium hover:bg-muted/80 transition-colors"
          >
            초기화
          </button>
        </div>

        {uploadResult && (
          <div className="px-5 py-3 border-b border-border bg-muted/20 shrink-0 space-y-1">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Upload className="w-4 h-4 text-primary" />
              업로드 결과: <span className="text-green-600">{uploadResult.added}개 추가</span>
              {uploadResult.skipped > 0 && <span className="text-muted-foreground">/ {uploadResult.skipped}개 중복 건너뜀</span>}
            </div>
            {uploadResult.errors.map((e, i) => (
              <div key={i} className="flex items-start gap-1.5 text-xs text-destructive">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                {e}
              </div>
            ))}
          </div>
        )}

        {showAdd && (
          <div className="px-5 py-3 border-b border-border bg-muted/30 shrink-0">
            <div className="grid grid-cols-3 gap-2 mb-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground">바코드 *</label>
                <input
                  className="w-full mt-1 px-3 py-1.5 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="바코드 번호"
                  value={form.barcode}
                  onChange={(e) => setForm((f) => ({ ...f, barcode: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">상품코드 *</label>
                <input
                  className="w-full mt-1 px-3 py-1.5 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="P001"
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">상품명 *</label>
                <input
                  className="w-full mt-1 px-3 py-1.5 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="상품명"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
            </div>
            {error && <p className="text-xs text-destructive mb-2">{error}</p>}
            <div className="flex gap-2">
              <button onClick={handleAdd} className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90">저장</button>
              <button onClick={() => { setShowAdd(false); setError(""); }} className="px-4 py-1.5 bg-muted text-muted-foreground rounded-lg text-sm hover:bg-muted/80">취소</button>
            </div>
          </div>
        )}

        <div className="overflow-y-auto flex-1">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">바코드</th>
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground text-xs">코드</th>
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground text-xs">상품명</th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.barcode} className="border-t border-border hover:bg-muted/30 transition-colors">
                  {editingBarcode === p.barcode && editForm ? (
                    <>
                      <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{p.barcode}</td>
                      <td className="px-3 py-2">
                        <input className="w-24 px-2 py-1 text-xs border border-input rounded bg-background" value={editForm.code} onChange={(e) => setEditForm((f) => f ? { ...f, code: e.target.value } : f)} />
                      </td>
                      <td className="px-3 py-2">
                        <input className="w-48 px-2 py-1 text-xs border border-input rounded bg-background" value={editForm.name} onChange={(e) => setEditForm((f) => f ? { ...f, name: e.target.value } : f)} />
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          <button onClick={saveEdit} className="p-1 text-green-600 hover:bg-green-50 rounded"><Check className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setEditingBarcode(null)} className="p-1 text-muted-foreground hover:bg-muted rounded"><X className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{p.barcode}</td>
                      <td className="px-3 py-2.5 font-medium">{p.code}</td>
                      <td className="px-3 py-2.5">{p.name}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex gap-1">
                          <button onClick={() => startEdit(p)} className="p-1 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => { if (confirm(`"${p.name}"을(를) 삭제하시겠습니까?`)) onDelete(p.barcode); }} className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

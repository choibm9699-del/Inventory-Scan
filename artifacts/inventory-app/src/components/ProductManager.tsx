import { useState, useRef } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Package,
  Upload,
  Download,
  AlertCircle,
  KeyRound,
  Search, // <-- Search 아이콘 추가
} from "lucide-react";
import * as XLSX from "xlsx";
import type { Product } from "../types";
//import { PasswordModal } from "../components/PasswordModal";
import { db } from "../firebase.ts";
import { ref as dbRef, update, set } from "firebase/database";

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

export function ProductManager({
  products,
  onAdd,
  onUpdate,
  onDelete,
  onReset,
  onClose,
}: ProductManagerProps) {
  const [editingBarcode, setEditingBarcode] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [editForm, setEditForm] = useState<Product | null>(null);
  const [error, setError] = useState("");
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [showChangePw, setShowChangePw] = useState(false);
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState(false);

  // <-- 검색어 상태 추가 -->
  const [searchTerm, setSearchTerm] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleAdd() {
    setError("");
    if (!form.barcode.trim()) {
      setError("바코드를 입력하세요.");
      return;
    }
    if (!form.code.trim()) {
      setError("상품코드를 입력하세요.");
      return;
    }
    if (!form.name.trim()) {
      setError("상품명을 입력하세요.");
      return;
    }
    if (products.find((p) => p.barcode === form.barcode)) {
      setError("이미 존재하는 바코드입니다.");
      return;
    }
    onAdd({ barcode: form.barcode, code: form.code, name: form.name });
    setForm({ ...EMPTY_FORM });
    setShowAdd(false);
  }

  function startEdit(product: Product) {
    setEditingBarcode(product.code || product.barcode);
    setEditForm({ ...product });
  }

  function saveEdit() {
    if (!editForm) return;
    onUpdate(editingBarcode!, editForm);
    setEditingBarcode(null);
    setEditForm(null);
  }

  async function handleChangePw() {
    setPwError("");

    if (pwForm.next.length < 4) {
      setPwError("새 비밀번호는 4자리 이상이어야 합니다.");
      return;
    }
    if (pwForm.next !== pwForm.confirm) {
      setPwError("새 비밀번호가 일치하지 않습니다.");
      return;
    }

    try {
      const updates = {};
      (updates as any)["/admin_settings/config/adminPassword"] = pwForm.next;

      await update(dbRef(db), updates);

      setPwForm({ current: "", next: "", confirm: "" });
      setPwSuccess(true);
      setTimeout(() => {
        setPwSuccess(false);
        setShowChangePw(false);
      }, 1500);
    } catch (error) {
      setPwError("DB 업데이트에 실패했습니다.");
      console.error(error);
    }
  }

  function downloadTemplate() {
    const template = [
      { 바코드: "8801043015899", 상품코드: "101002333", 상품명: "안성탕면컵" },
      { 바코드: "8801043015936", 상품코드: "101003561", 상품명: "김치큰사발" },
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    ws["!cols"] = [{ wch: 18 }, { wch: 12 }, { wch: 24 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "상품목록");
    XLSX.writeFile(wb, "상품목록_템플릿.xlsx");
  }

  function downloadProducts() {
    if (products.length === 0) {
      alert("다운로드할 상품 데이터가 없습니다.");
      return;
    }

    const excelData = products.map((p) => ({
      바코드: p.barcode,
      상품코드: p.code,
      상품명: p.name,
    }));

    const ws = XLSX.utils.json_to_sheet(excelData);
    ws["!cols"] = [{ wch: 18 }, { wch: 15 }, { wch: 30 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "현재상품목록");

    const today = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `상품목록_${today}.xlsx`);
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm("엑셀 업로드 시 기존 상품 목록이 모두 지워지고 새 목록으로 교체됩니다. 진행하시겠습니까?")) {
      e.target.value = "";
      return;
    }

    setUploadResult(null);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);

        const newProducts: Record<string, Product> = {};
        let added = 0;
        const errors: string[] = [];

        rows.forEach((row, idx) => {
            const rowNum = idx + 2;
            const barcode = String(row["바코드"] ?? row["barcode"] ?? "").trim();
            const code = String(row["상품코드"] ?? row["code"] ?? "").trim();
            const name = String(row["상품명"] ?? row["name"] ?? "").trim();

            if (!name) {
              errors.push(`${rowNum}행: 상품명 누락으로 제외됨`);
              return;
            }

            const key = code || barcode;

            if (!key) {
              errors.push(`${rowNum}행: 바코드와 상품코드 모두 없어 제외됨`);
              return;
            }

            newProducts[key] = { barcode, code, name };
            added++;
          });

        await set(dbRef(db, "products"), null);

        const entries = Object.entries(newProducts);
        const CHUNK_SIZE = 300;

        for (let i = 0; i < entries.length; i += CHUNK_SIZE) {
          const chunk = Object.fromEntries(entries.slice(i, i + CHUNK_SIZE));
          await update(dbRef(db, "products"), chunk);
          console.log(`완료: ${Math.min(i + CHUNK_SIZE, entries.length)} / ${entries.length}`);

          await new Promise(res => setTimeout(res, 1000));
        }

        setUploadResult({ added, skipped: 0, errors });
        alert("상품 목록이 엑셀 데이터로 완전히 교체되었습니다.");
      } catch (err) {
        console.error(err);
        setUploadResult({
          added: 0,
          skipped: 0,
          errors: ["파일 처리 중 오류가 발생했습니다."],
        });
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  }

  // <-- 검색 필터링 로직 -->
  const filteredProducts = products.filter((p) => {
    const term = searchTerm.toLowerCase();
    const matchName = String(p.name).toLowerCase().includes(term);
    const matchCode = String(p.code).toLowerCase().includes(term);
    const matchBarcode = String(p.barcode).toLowerCase().includes(term);
    return matchName || matchCode || matchBarcode;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-card rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            <span className="font-bold text-lg text-card-foreground">
              상품 목록 관리
            </span>
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
              {products.length}개
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 버튼 영역 */}
        <div className="px-5 py-3 border-b border-border shrink-0 flex flex-wrap gap-2">
          <button
            onClick={() => {
              setShowAdd(!showAdd);
              setError("");
              setUploadResult(null);
            }}
            className="flex items-center gap-1.5 px-2 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            상품 추가
          </button>

          <button
            onClick={downloadProducts}
            className="flex items-center gap-1.5 px-1 py-2 bg-sidebar text-sidebar-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Download className="w-4 h-4" />
            엑셀 다운로드
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-1 py-2 bg-sidebar text-sidebar-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
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
            onClick={() => {
              if (confirm("기본 샘플 데이터로 초기화하시겠습니까?")) onReset();
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-muted text-muted-foreground rounded-lg text-sm font-medium hover:bg-muted/80 transition-colors"
          >
            초기화
          </button>

          <button
            onClick={() => {
              setShowChangePw((v) => !v);
              setPwError("");
              setPwSuccess(false);
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-muted text-muted-foreground rounded-lg text-sm font-medium hover:bg-muted/80 transition-colors ml-auto"
          >
            <KeyRound className="w-4 h-4" />
          </button>
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-1.5 px-2.5 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            템플릿
          </button>
        </div>

        {/* <-- 검색창 영역 시작 --> */}
        <div className="px-5 py-3 border-b border-border bg-background shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="상품명, 상품코드 또는 바코드로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-10 py-2 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-muted"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
        {/* <-- 검색창 영역 끝 --> */}

        {/* 비밀번호 변경 영역 (기존 동일) */}
        {showChangePw && (
          <div className="px-5 py-4 border-b border-border bg-muted/20 shrink-0">
            <p className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5" />
              비밀번호 변경
            </p>
            {pwSuccess ? (
              <div className="flex items-center gap-2 text-green-600 text-sm font-medium py-1">
                <Check className="w-4 h-4" /> 비밀번호가 변경되었습니다.
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">현재 비밀번호</label>
                  <input
                    type="password"
                    className="w-full mt-1 px-3 py-1.5 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="현재 비밀번호"
                    value={pwForm.current}
                    onChange={(e) => setPwForm((f) => ({ ...f, current: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">새 비밀번호</label>
                  <input
                    type="password"
                    className="w-full mt-1 px-3 py-1.5 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="새 비밀번호 (4자 이상)"
                    value={pwForm.next}
                    onChange={(e) => setPwForm((f) => ({ ...f, next: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">새 비밀번호 확인</label>
                  <input
                    type="password"
                    className="w-full mt-1 px-3 py-1.5 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="비밀번호 확인"
                    value={pwForm.confirm}
                    onChange={(e) => setPwForm((f) => ({ ...f, confirm: e.target.value }))}
                  />
                </div>
                {pwError && (
                  <p className="col-span-3 text-xs text-destructive">{pwError}</p>
                )}
                <div className="col-span-3 flex gap-2">
                  <button
                    onClick={handleChangePw}
                    className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90"
                  >
                    변경
                  </button>
                  <button
                    onClick={() => {
                      setShowChangePw(false);
                      setPwError("");
                    }}
                    className="px-4 py-1.5 bg-muted text-muted-foreground rounded-lg text-sm hover:bg-muted/80"
                  >
                    취소
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 엑셀 업로드 결과 (기존 동일) */}
        {uploadResult && (
          <div className="px-5 py-3 border-b border-border bg-muted/20 shrink-0 space-y-1">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Upload className="w-4 h-4 text-primary" />
              업로드 결과:{" "}
              <span className="text-green-600">{uploadResult.added}개로 변경</span>
              {uploadResult.skipped > 0 && (
                <span className="text-muted-foreground">
                  / {uploadResult.skipped}개 중복 건너뜀
                </span>
              )}
            </div>
            {uploadResult.errors.map((e, i) => (
              <div key={i} className="flex items-start gap-1.5 text-xs text-destructive">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                {e}
              </div>
            ))}
          </div>
        )}

        {/* 상품 추가 영역 (기존 동일) */}
        {showAdd && (
          <div className="px-5 py-3 border-b border-border bg-muted/30 shrink-0">
            <div className="grid grid-cols-3 gap-2 mb-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground">박스바코드 *</label>
                <input
                  className="w-full mt-1 px-3 py-1.5 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="바코드"
                  value={form.barcode}
                  onChange={(e) => setForm((f) => ({ ...f, barcode: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">상품코드 *</label>
                <input
                  className="w-full mt-1 px-3 py-1.5 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="상품코드"
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
              <button
                onClick={handleAdd}
                className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90"
              >
                저장
              </button>
              <button
                onClick={() => {
                  setShowAdd(false);
                  setError("");
                }}
                className="px-4 py-1.5 bg-muted text-muted-foreground rounded-lg text-sm hover:bg-muted/80"
              >
                취소
              </button>
            </div>
          </div>
        )}

        {/* 테이블 영역 (products 대신 filteredProducts 배열 렌더링) */}
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm shadow-sm z-10">
              <tr>
                <th className="px-4 py-2.5 font-medium text-muted-foreground text-xs text-center w-1/3">
                  바코드
                </th>
                <th className="px-3 py-2.5 font-medium text-muted-foreground text-xs text-center">
                  상품명 / 코드
                </th>
                <th className="px-3 py-2.5 w-20" />
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-center py-10 text-muted-foreground">
                    {searchTerm ? "검색 결과가 없습니다." : "등록된 상품이 없습니다."}
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => (
                  <tr
                    key={p.code || p.barcode}
                    className="border-t border-border hover:bg-muted/30 transition-colors"
                  >
                    {editingBarcode === (p.code || p.barcode) && editForm ? (
                      <>
                        <td className="px-4 py-2 font-mono text-xs text-muted-foreground text-center">
                          {p.barcode}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <div className="text-sm font-bold">{editForm.name}</div>
                          <input
                            className="w-full mt-1 px-2 py-1 text-xs border border-input rounded bg-background"
                            value={editForm.code}
                            onChange={(e) =>
                              setEditForm((f) => (f ? { ...f, code: e.target.value } : f))
                            }
                          />
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex gap-1 justify-end">
                            <button
                              onClick={saveEdit}
                              className="p-1 text-green-600 hover:bg-green-50 rounded"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingBarcode(null)}
                              className="p-1 text-muted-foreground hover:bg-muted rounded"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground text-center">
                          {p.barcode}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <div className="text-sm font-bold text-foreground">
                            {p.name}
                          </div>
                          <div className="text-sm font-bold text-muted-foreground">
                            {p.code}
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex gap-1 justify-end">
                            <button
                              onClick={() => startEdit(p)}
                              className="p-1 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`"${p.name}"을(를) 삭제하시겠습니까?`))
                                  onDelete(p.code || p.barcode);
                              }}
                              className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
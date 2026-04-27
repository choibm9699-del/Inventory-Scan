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
} from "lucide-react";
import * as XLSX from "xlsx";
import type { Product } from "../types";
//import { PasswordModal } from "../components/PasswordModal";
import { db } from "../firebase.ts";
import {
  ref as dbRef,
  update,
} from "firebase/database";

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
    setEditingBarcode(product.barcode);
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

    // 주의: 여기서는 DB에 있는 현재 암호를 미리 알고 있어야 비교가 가능합니다.
    // 만약 지금 당장 복잡하다면, 현재 비밀번호 체크 로직만 빼고 새 비밀번호로 덮어쓰게 할 수도 있습니다.

    if (pwForm.next.length < 4) {
      setPwError("새 비밀번호는 4자리 이상이어야 합니다.");
      return;
    }
    if (pwForm.next !== pwForm.confirm) {
      setPwError("새 비밀번호가 일치하지 않습니다.");
      return;
    }

    try {
      // 2. Firebase DB의 암호를 업데이트합니다.
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

    // 1. DB 데이터를 엑셀용 데이터로 변환 (한글 헤더 적용)
    const excelData = products.map((p) => ({
      바코드: p.barcode,
      상품코드: p.code,
      상품명: p.name,
    }));

    // 2. 워크시트 생성
    const ws = XLSX.utils.json_to_sheet(excelData);

    // 3. 열 너비 자동 조절 (보기 좋게)
    ws["!cols"] = [{ wch: 18 }, { wch: 15 }, { wch: 30 }];

    // 4. 워크북 생성 및 저장
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "현재상품목록");

    // 파일명에 오늘 날짜를 넣어주면 관리하기 편합니다.
    const today = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `상품목록_${today}.xlsx`);
  }


  
  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. 사용자 확인 (기존 데이터 삭제 경고)
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

        const newProducts: Record<string, Product> = {}; // DB에 통째로 넣을 객체
        let added = 0;
        const errors: string[] = [];

        rows.forEach((row, idx) => {
            const rowNum = idx + 2;
            const barcode = String(row["바코드"] ?? row["barcode"] ?? "").trim();
            const code = String(row["상품코드"] ?? row["code"] ?? "").trim();
            const name = String(row["상품명"] ?? row["name"] ?? "").trim();

            // 상품명이 없으면 제외 (최소한 이름은 있어야 함)
            if (!name) {
              errors.push(`${rowNum}행: 상품명 누락으로 제외됨`);
              return;
            }

            // 바코드가 있으면 바코드를 키로, 없으면 상품코드를 키로 사용
            const key = barcode || code;

            if (!key) {
              errors.push(`${rowNum}행: 바코드와 상품코드 모두 없어 제외됨`);
              return;
            }

            newProducts[key] = { barcode, code, name };
            added++;
          });

        // 2. 핵심 변경 사항: update 대신 'set'을 사용하여 products 경로를 통째로 교체
        // 'set'은 해당 경로의 이전 데이터를 싹 지우고 새로 들어온 데이터만 저장합니다.
        const { set, ref: dbRef_orig } = await import("firebase/database");
        await set(dbRef_orig(db, "products"), newProducts);

        setUploadResult({ added, skipped: 0, errors });
        alert("상품 목록이 엑셀 데이터로 완전히 교체되었습니다.");

        // 화면을 새로고침하거나 부모 상태를 업데이트하기 위해 onClose 호출 (선택 사항)
        // onClose(); 
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
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-card rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
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
          
          {/* 현데이터 다운로드 버튼 - 업로드 버튼과 같은 스타일 적용 */}
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
                  <label className="text-xs text-muted-foreground">
                    현재 비밀번호
                  </label>
                  <input
                    type="password"
                    className="w-full mt-1 px-3 py-1.5 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="현재 비밀번호"
                    value={pwForm.current}
                    onChange={(e) =>
                      setPwForm((f) => ({ ...f, current: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">
                    새 비밀번호
                  </label>
                  <input
                    type="password"
                    className="w-full mt-1 px-3 py-1.5 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="새 비밀번호 (4자 이상)"
                    value={pwForm.next}
                    onChange={(e) =>
                      setPwForm((f) => ({ ...f, next: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">
                    새 비밀번호 확인
                  </label>
                  <input
                    type="password"
                    className="w-full mt-1 px-3 py-1.5 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="비밀번호 확인"
                    value={pwForm.confirm}
                    onChange={(e) =>
                      setPwForm((f) => ({ ...f, confirm: e.target.value }))
                    }
                  />
                </div>
                {pwError && (
                  <p className="col-span-3 text-xs text-destructive">
                    {pwError}
                  </p>
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

        {uploadResult && (
          <div className="px-5 py-3 border-b border-border bg-muted/20 shrink-0 space-y-1">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Upload className="w-4 h-4 text-primary" />
              업로드 결과:{" "}
              <span className="text-green-600">
                {uploadResult.added}개로 변경
              </span>
              {uploadResult.skipped > 0 && (
                <span className="text-muted-foreground">
                  / {uploadResult.skipped}개 중복 건너뜀
                </span>
              )}
            </div>
            {uploadResult.errors.map((e, i) => (
              <div
                key={i}
                className="flex items-start gap-1.5 text-xs text-destructive"
              >
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
                <label className="text-xs font-medium text-muted-foreground">
                  박스바코드 *
                </label>
                <input
                  className="w-full mt-1 px-3 py-1.5 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="바코드"
                  value={form.barcode}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, barcode: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  상품코드 *
                </label>
                <input
                  className="w-full mt-1 px-3 py-1.5 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="상품코드"
                  value={form.code}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, code: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  상품명 *
                </label>
                <input
                  className="w-full mt-1 px-3 py-1.5 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="상품명"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
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

        <div className="overflow-y-auto flex-1">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
              <tr>
                <th className="px-4 py-2.5 font-medium text-muted-foreground text-xs text-center">
                  바코드
                </th>
                <th className="px-3 py-2.5 font-medium text-muted-foreground text-xs text-center">
                  상품명 / 코드
                </th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr
                  key={p.barcode}
                  className="border-t border-border hover:bg-muted/30 transition-colors"
                >
                  {editingBarcode === p.barcode && editForm ? (
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
                            setEditForm((f) =>
                              f ? { ...f, code: e.target.value } : f,
                            )
                          }
                        />
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
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
                        <div className="flex gap-1">
                          <button
                            onClick={() => startEdit(p)}
                            className="p-1 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (
                                confirm(`"${p.name}"을(를) 삭제하시겠습니까?`)
                              )
                                onDelete(p.barcode);
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
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

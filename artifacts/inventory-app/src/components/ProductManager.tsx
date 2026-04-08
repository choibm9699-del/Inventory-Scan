import { useState } from "react";
import { Plus, Pencil, Trash2, X, Check, Package } from "lucide-react";
import type { Product } from "../types";

interface ProductManagerProps {
  products: Product[];
  onAdd: (product: Product) => void;
  onUpdate: (barcode: string, updates: Partial<Product>) => void;
  onDelete: (barcode: string) => void;
  onReset: () => void;
  onClose: () => void;
}

const CATEGORIES = ["음료", "식품", "냉동식품", "생활용품", "기타"];
const UNITS = ["개", "병", "봉", "박스", "통", "kg", "g", "L", "ml", "세트"];

const EMPTY_FORM: Omit<Product, "barcode"> & { barcode: string } = {
  barcode: "",
  code: "",
  name: "",
  category: "기타",
  unit: "개",
};

export function ProductManager({ products, onAdd, onUpdate, onDelete, onReset, onClose }: ProductManagerProps) {
  const [editingBarcode, setEditingBarcode] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [editForm, setEditForm] = useState<Product | null>(null);
  const [error, setError] = useState("");

  function handleAdd() {
    setError("");
    if (!form.barcode.trim()) { setError("바코드를 입력하세요."); return; }
    if (!form.code.trim()) { setError("상품코드를 입력하세요."); return; }
    if (!form.name.trim()) { setError("상품명을 입력하세요."); return; }
    if (products.find((p) => p.barcode === form.barcode)) {
      setError("이미 존재하는 바코드입니다."); return;
    }
    onAdd({ ...form });
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

        <div className="px-5 py-3 border-b border-border shrink-0 flex gap-2">
          <button
            onClick={() => { setShowAdd(!showAdd); setError(""); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            상품 추가
          </button>
          <button
            onClick={() => { if (confirm("기본 샘플 데이터로 초기화하시겠습니까?")) onReset(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-muted text-muted-foreground rounded-lg text-sm font-medium hover:bg-muted/80 transition-colors"
          >
            초기화
          </button>
        </div>

        {showAdd && (
          <div className="px-5 py-3 border-b border-border bg-muted/30 shrink-0">
            <div className="grid grid-cols-2 gap-2 mb-2">
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
              <div>
                <label className="text-xs font-medium text-muted-foreground">분류</label>
                <select
                  className="w-full mt-1 px-3 py-1.5 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                >
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">단위</label>
                <select
                  className="w-full mt-1 px-3 py-1.5 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  value={form.unit}
                  onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                >
                  {UNITS.map((u) => <option key={u}>{u}</option>)}
                </select>
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
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground text-xs">분류</th>
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground text-xs">단위</th>
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
                        <input className="w-20 px-2 py-1 text-xs border border-input rounded bg-background" value={editForm.code} onChange={(e) => setEditForm((f) => f ? { ...f, code: e.target.value } : f)} />
                      </td>
                      <td className="px-3 py-2">
                        <input className="w-32 px-2 py-1 text-xs border border-input rounded bg-background" value={editForm.name} onChange={(e) => setEditForm((f) => f ? { ...f, name: e.target.value } : f)} />
                      </td>
                      <td className="px-3 py-2">
                        <select className="text-xs border border-input rounded px-1 py-1 bg-background" value={editForm.category} onChange={(e) => setEditForm((f) => f ? { ...f, category: e.target.value } : f)}>
                          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <select className="text-xs border border-input rounded px-1 py-1 bg-background" value={editForm.unit} onChange={(e) => setEditForm((f) => f ? { ...f, unit: e.target.value } : f)}>
                          {UNITS.map((u) => <option key={u}>{u}</option>)}
                        </select>
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
                        <span className="inline-block px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">{p.category || "기타"}</span>
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">{p.unit || "개"}</td>
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

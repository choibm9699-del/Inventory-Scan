import { useState, useEffect, useCallback } from "react";
import { db } from "../firebase.ts";
import {
  ref,
  onValue,
  set,
  remove,
  update,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { defaultProducts } from "../data/products";
import type { Product } from "../types";

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);

  // 1. 실시간 상품 목록 불러오기 (Read)
  useEffect(() => {
    const productsRef = ref(db, "products");

    const unsubscribe = onValue(productsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Firebase 객체를 배열로 변환
        const list = Object.keys(data).map((key) => ({
          ...data[key],
        })) as Product[];
        setProducts(list);
      } else {
        // 데이터가 없으면 기본 상품들로 DB 세팅 (선택 사항)
        setProducts([]);
      }
    });

    return () => unsubscribe();
  }, []);

  // 2. 상품 추가 (Create/Update)
  // 바코드를 고유 키로 사용하여 중복 등록 방지
  const addProduct = useCallback(async (product: Product) => {
    try {
      const productRef = ref(db, `products/${product.barcode}`);
      await set(productRef, product);
    } catch (error) {
      console.error("상품 추가 실패:", error);
    }
  }, []);

  // 3. 상품 정보 수정
  const updateProduct = useCallback(
    async (barcode: string, updates: Partial<Product>) => {
      try {
        const productRef = ref(db, `products/${barcode}`);
        await update(productRef, updates);
      } catch (error) {
        console.error("상품 수정 실패:", error);
      }
    },
    [],
  );

  // 4. 상품 삭제
  const deleteProduct = useCallback(async (barcode: string) => {
    try {
      const productRef = ref(db, `products/${barcode}`);
      await remove(productRef);
    } catch (error) {
      console.error("상품 삭제 실패:", error);
    }
  }, []);

  // 5. 바코드로 검색
  const searchByBarcode = useCallback(
    (barcode: string): Product | undefined => {
      return products.find((p) => p.barcode === barcode);
    },
    [products],
  );

  // 6. 기본 상품으로 리셋 (DB 전체 덮어쓰기)
  const resetToDefault = useCallback(async () => {
    if (window.confirm("상품 목록을 기본값으로 초기화하시겠습니까?")) {
      try {
        const productsRef = ref(db, "products");
        const defaultData = defaultProducts.reduce((acc, curr) => {
          acc[curr.barcode] = curr;
          return acc;
        }, {} as any);

        await set(productsRef, defaultData);
      } catch (error) {
        console.error("리셋 실패:", error);
      }
    }
  }, []);

  return {
    products,
    addProduct,
    updateProduct,
    deleteProduct,
    searchByBarcode,
    resetToDefault,
  };
}

import { useState, useCallback } from "react";
import { defaultProducts } from "../data/products";
import type { Product } from "../types";

const STORAGE_KEY = "inventory_products";

function loadProducts(): Product[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored) as Product[];
  } catch {}
  return defaultProducts;
}

function saveProducts(products: Product[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
}

export function useProducts() {
  const [products, setProducts] = useState<Product[]>(loadProducts);

  const addProduct = useCallback((product: Product) => {
    setProducts((prev) => {
      const updated = [...prev, product];
      saveProducts(updated);
      return updated;
    });
  }, []);

  const updateProduct = useCallback((barcode: string, updates: Partial<Product>) => {
    setProducts((prev) => {
      const updated = prev.map((p) => (p.barcode === barcode ? { ...p, ...updates } : p));
      saveProducts(updated);
      return updated;
    });
  }, []);

  const deleteProduct = useCallback((barcode: string) => {
    setProducts((prev) => {
      const updated = prev.filter((p) => p.barcode !== barcode);
      saveProducts(updated);
      return updated;
    });
  }, []);

  const searchByBarcode = useCallback(
    (barcode: string): Product | undefined => {
      return products.find((p) => p.barcode === barcode);
    },
    [products]
  );

  const resetToDefault = useCallback(() => {
    saveProducts(defaultProducts);
    setProducts(defaultProducts);
  }, []);

  return { products, addProduct, updateProduct, deleteProduct, searchByBarcode, resetToDefault };
}

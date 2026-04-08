export interface Product {
  barcode: string;
  code: string;
  name: string;
  unit?: string;
  category?: string;
}

export interface InventoryRecord {
  id: string;
  barcode: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  date: string;
  time: string;
}

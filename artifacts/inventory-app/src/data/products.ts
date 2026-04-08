import type { Product } from "../types";

export const defaultProducts: Product[] = [
  { barcode: "8801234567890", code: "P001", name: "생수 500ml", category: "음료", unit: "병" },
  { barcode: "8809876543210", code: "P002", name: "콜라 1.5L", category: "음료", unit: "병" },
  { barcode: "8801111111111", code: "P003", name: "라면 120g", category: "식품", unit: "개" },
  { barcode: "8802222222222", code: "P004", name: "과자 200g", category: "식품", unit: "봉" },
  { barcode: "8803333333333", code: "P005", name: "세제 1kg", category: "생활용품", unit: "통" },
  { barcode: "8804444444444", code: "P006", name: "샴푸 400ml", category: "생활용품", unit: "개" },
  { barcode: "8805555555555", code: "P007", name: "티슈 200매", category: "생활용품", unit: "박스" },
  { barcode: "8806666666666", code: "P008", name: "아이스크림", category: "냉동식품", unit: "개" },
  { barcode: "123456", code: "P009", name: "상품A", category: "기타", unit: "개" },
  { barcode: "789012", code: "P010", name: "상품B", category: "기타", unit: "개" },
];

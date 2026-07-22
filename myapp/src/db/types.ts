export type DbBool = 0 | 1;

export interface Store {
  id: number;
  name: string;
  createdAt: string;
}

export interface Item {
  id: number;
  name: string;
  imagePath: string | null;
  favorite: boolean;
}

export interface StoreItem {
  id: number;
  storeId: number;
  itemId: number;
  latestPrice: number;
  updatedAt: string;
}

export interface ShoppingSession {
  id: number;
  storeId: number;
  budget: number;
  total: number;
  createdAt: string;
  finishedAt: string | null;
}

export interface ShoppingSessionItem {
  id: number;
  sessionId: number;
  itemId: number;
  quantity: number;
  price: number;
  subtotal: number;
  purchased: boolean;
}

export function toDbBool(value: boolean): DbBool {
  return value ? 1 : 0;
}

export function toBoolean(value: unknown): boolean {
  return value === 1 || value === true;
}
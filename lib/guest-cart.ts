/**
 * Guest cart utilities - localStorage-based cart for unauthenticated users.
 * Structure: Array<{ productId, variantId, quantity }>
 */

const GUEST_CART_KEY = "blackkin_guest_cart";

export interface GuestCartItem {
  productId: string;
  variantId: string;
  quantity: number;
}

export function getGuestCart(): GuestCartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(GUEST_CART_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as GuestCartItem[];
  } catch {
    return [];
  }
}

export function setGuestCart(items: GuestCartItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
}

export function addToGuestCart(
  productId: string,
  variantId: string,
  quantity: number
) {
  const cart = getGuestCart();
  const existing = cart.find((i) => i.variantId === variantId);
  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.push({ productId, variantId, quantity });
  }
  setGuestCart(cart);
}

export function updateGuestCartQuantity(variantId: string, quantity: number) {
  const cart = getGuestCart();
  const item = cart.find((i) => i.variantId === variantId);
  if (item) {
    item.quantity = quantity;
    setGuestCart(cart);
  }
}

export function removeFromGuestCart(variantId: string) {
  setGuestCart(getGuestCart().filter((i) => i.variantId !== variantId));
}

export function clearGuestCart() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(GUEST_CART_KEY);
}

export function getGuestCartCount(): number {
  return getGuestCart().reduce((sum, i) => sum + i.quantity, 0);
}

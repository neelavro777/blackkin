"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import {
  getGuestCart,
  clearGuestCart,
  getGuestCartCount,
  addToGuestCart,
  removeFromGuestCart,
  updateGuestCartQuantity,
} from "@/lib/guest-cart";

interface CartContextValue {
  guestItemCount: number;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  addGuestItem: (productId: string, variantId: string, quantity: number) => void;
  removeGuestItem: (variantId: string) => void;
  updateGuestQuantity: (variantId: string, quantity: number) => void;
}

const CartContext = createContext<CartContextValue>({
  guestItemCount: 0,
  isOpen: false,
  setIsOpen: () => {},
  addGuestItem: () => {},
  removeGuestItem: () => {},
  updateGuestQuantity: () => {},
});

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = authClient.useSession();
  const mergeGuestCart = useMutation(api.cart.mergeGuestCart);
  const mergedRef = useRef(false);
  const [guestItemCount, setGuestItemCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  // Sync guest item count from localStorage
  const syncCount = useCallback(() => {
    setGuestItemCount(getGuestCartCount());
  }, []);

  useEffect(() => {
    syncCount();
  }, [syncCount]);

  // Merge guest cart on login
  useEffect(() => {
    if (!session) {
      mergedRef.current = false;
      syncCount();
      return;
    }

    if (mergedRef.current) return;
    mergedRef.current = true;

    const guestItems = getGuestCart();
    if (guestItems.length === 0) return;

    mergeGuestCart({ items: guestItems })
      .then(() => {
        clearGuestCart();
        setGuestItemCount(0);
      })
      .catch(console.error);
  }, [session, mergeGuestCart, syncCount]);

  const addGuestItem = useCallback(
    (productId: string, variantId: string, quantity: number) => {
      addToGuestCart(productId, variantId, quantity);
      syncCount();
    },
    [syncCount]
  );

  const removeGuestItem = useCallback(
    (variantId: string) => {
      removeFromGuestCart(variantId);
      syncCount();
    },
    [syncCount]
  );

  const updateGuestQuantity = useCallback(
    (variantId: string, quantity: number) => {
      updateGuestCartQuantity(variantId, quantity);
      syncCount();
    },
    [syncCount]
  );

  return (
    <CartContext.Provider
      value={{
        guestItemCount,
        isOpen,
        setIsOpen,
        addGuestItem,
        removeGuestItem,
        updateGuestQuantity,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}

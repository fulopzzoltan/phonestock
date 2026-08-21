import { useEffect, useState } from "react";

const KEY = "telefonos_cart_v1";
const EVENT = "telefonos-cart-change";

export function getCart() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || [];
  } catch {
    return [];
  }
}

function save(items) {
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(EVENT));
}

export function addToCart(product) {
  const items = getCart();
  if (items.some((p) => p.id === product.id)) return items;
  const next = [...items, product];
  save(next);
  return next;
}

export function removeFromCart(id) {
  const next = getCart().filter((p) => p.id !== id);
  save(next);
  return next;
}

export function clearCart() {
  save([]);
}

export function isInCart(id) {
  return getCart().some((p) => p.id === id);
}

export function cartTotal(items) {
  return (items || getCart()).reduce((sum, p) => sum + (Number(p.salePrice) || 0), 0);
}

export function useCart() {
  const [items, setItems] = useState(getCart);
  useEffect(() => {
    const onChange = () => setItems(getCart());
    window.addEventListener(EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);
  return items;
}

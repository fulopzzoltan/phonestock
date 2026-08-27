import { useEffect, useState } from "react";

const KEY = "telefonos_wishlist_v1";
const EVENT = "telefonos-wishlist-change";

export function getWishlist() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || [];
  } catch {
    return [];
  }
}

function save(ids) {
  localStorage.setItem(KEY, JSON.stringify(ids));
  window.dispatchEvent(new Event(EVENT));
}

export function toggleWishlist(id) {
  const ids = getWishlist();
  const next = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
  save(next);
  return next;
}

export function isInWishlist(id) {
  return getWishlist().includes(id);
}

export function useWishlist() {
  const [ids, setIds] = useState(getWishlist);
  useEffect(() => {
    const onChange = () => setIds(getWishlist());
    window.addEventListener(EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);
  return ids;
}

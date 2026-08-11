import { useState } from "react";
import { CallIcon } from "./icons";

export default function CallLink({ phone, className = "call-link" }) {
  const [copied, setCopied] = useState(false);
  if (!phone) return null;

  async function handleClick(e) {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(phone);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable — tel: link still navigates
    }
  }

  return (
    <a className={className} href={`tel:${phone.replace(/\s/g, "")}`} onClick={handleClick}>
      <CallIcon />{copied ? "Másolva!" : "Hívás"}
    </a>
  );
}

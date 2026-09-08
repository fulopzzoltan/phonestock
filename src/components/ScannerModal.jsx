import { useEffect, useRef, useState } from "react";
import { BarcodeDetector } from "barcode-detector";
import { CloseIcon } from "./icons";

// QR + Code128 kamerás beolvasás — ld. QR_SZKENNELES_ES_NYOMTATO_JAVASLAT.md. A
// `barcode-detector` csomag ponyfill-je mindenhol ugyanazt az API-t adja (natív
// BarcodeDetector Chrome/Edge alatt, WASM-os ZXing máshol, pl. iOS Safari PWA-ban),
// úgyhogy nem kell böngészőnként külön ágra elágazni.
export default function ScannerModal({ open, onClose, onDetect }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const firedRef = useRef(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    firedRef.current = false;
    setError("");
    const detector = new BarcodeDetector({ formats: ["qr_code", "code_128"] });

    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
      .then((stream) => {
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        timerRef.current = setInterval(async () => {
          if (firedRef.current || !videoRef.current || videoRef.current.readyState < 2) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes.length > 0 && !firedRef.current) {
              firedRef.current = true;
              onDetect(codes[0].rawValue);
            }
          } catch {
            // Egy sikertelen keret nem gond, a következő próbálkozás úgyis jön 350ms múlva.
          }
        }, 350);
      })
      .catch(() => setError("Nem sikerült elérni a kamerát — engedélyezd a böngészőben, vagy zárd be és próbáld újra."));

    return () => {
      cancelled = true;
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [open, onDetect]);

  if (!open) return null;

  return (
    <div className="scan-overlay" onClick={onClose}>
      <div className="scan-modal" onClick={(e) => e.stopPropagation()}>
        <div className="scan-head">
          <span>Szkennelés</span>
          <button type="button" className="scan-close" onClick={onClose}><CloseIcon width={18} height={18} /></button>
        </div>
        {error ? (
          <div className="scan-error">{error}</div>
        ) : (
          <div className="scan-video-wrap">
            <video ref={videoRef} playsInline muted className="scan-video" />
            <div className="scan-frame" />
          </div>
        )}
        <div className="scan-hint">Tartsd a munkalap/telefon/alkatrész QR- vagy vonalkódját a keret elé.</div>
      </div>
    </div>
  );
}

"use client";
import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff, Loader } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface BarcodeScannerProps {
  onDetected: (barcode: string) => void;
  loading: boolean;
}

export function BarcodeScanner({ onDetected, loading }: BarcodeScannerProps) {
  const [scanning, setScanning] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const scannerRef = useRef<unknown>(null);

  async function startScanner() {
    const { Html5Qrcode } = await import("html5-qrcode");
    const scanner = new Html5Qrcode("qr-reader");
    scannerRef.current = scanner;
    try {
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 150 } },
        (decodedText: string) => {
          stopScanner();
          onDetected(decodedText);
        },
        undefined
      );
      setScanning(true);
    } catch {
      setPermissionDenied(true);
    }
  }

  async function stopScanner() {
    if (scannerRef.current) {
      const s = scannerRef.current as { stop: () => Promise<void> };
      await s.stop().catch(() => {});
      scannerRef.current = null;
    }
    setScanning(false);
  }

  useEffect(() => () => { stopScanner(); }, []);

  if (permissionDenied) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <CameraOff size={40} className="text-stone-400" />
        <p className="text-sm text-stone-500">Camera permission denied. Enter the barcode manually below.</p>
        <div className="flex gap-2 w-full max-w-xs">
          <input
            type="text"
            placeholder="Barcode number"
            className="flex-1 rounded-xl border border-stone-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
          />
          <Button onClick={() => manualCode && onDetected(manualCode)} disabled={!manualCode || loading} size="sm">Go</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div id="qr-reader" className={scanning ? "rounded-xl overflow-hidden" : "hidden"} />
      {loading && (
        <div className="flex items-center gap-2 justify-center py-4 text-sm text-stone-500">
          <Loader size={16} className="animate-spin" />
          Looking up product…
        </div>
      )}
      {!scanning && !loading && (
        <button
          onClick={startScanner}
          className="flex flex-col items-center gap-3 py-12 border-2 border-dashed border-stone-200 rounded-xl hover:border-primary hover:bg-primary-soft/30 transition-colors"
        >
          <Camera size={36} className="text-stone-400" />
          <span className="text-sm text-stone-500">Tap to scan barcode</span>
        </button>
      )}
      {scanning && (
        <Button variant="secondary" onClick={stopScanner} size="sm" className="self-center">Cancel</Button>
      )}
    </div>
  );
}

"use client";
import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff, Loader } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface BarcodeScannerProps {
  onDetected: (barcode: string) => void;
  loading: boolean;
}

type Phase = "idle" | "starting" | "scanning" | "denied";

type Html5QrcodeScanner = {
  start: (
    constraint: object,
    config: object,
    onSuccess: (text: string) => void,
    onError: undefined
  ) => Promise<void>;
  stop: () => Promise<void>;
  isScanning: boolean;
};

export function BarcodeScanner({ onDetected, loading }: BarcodeScannerProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [manualCode, setManualCode] = useState("");
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  async function startScanner() {
    setPhase("starting");

    // Wait for React to paint the #qr-reader div before initialising the scanner
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    );

    const { Html5Qrcode } = await import("html5-qrcode");
    const scanner = new Html5Qrcode("qr-reader") as unknown as Html5QrcodeScanner;
    scannerRef.current = scanner;

    try {
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 150 } },
        async (decodedText: string) => {
          await stopScanner();
          onDetected(decodedText);
        },
        undefined
      );
      setPhase("scanning");
    } catch {
      scannerRef.current = null;
      setPhase("denied");
    }
  }

  async function stopScanner() {
    if (scannerRef.current?.isScanning) {
      await scannerRef.current.stop().catch(() => {});
      scannerRef.current = null;
    }
    setPhase("idle");
  }

  if (phase === "denied") {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <CameraOff size={40} className="text-stone-400" />
        <p className="text-sm text-stone-500">
          Camera permission denied. Enter the barcode manually below.
        </p>
        <div className="flex gap-2 w-full max-w-xs">
          <input
            type="text"
            placeholder="Barcode number"
            className="flex-1 rounded-xl border border-stone-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
          />
          <Button
            onClick={() => manualCode && onDetected(manualCode)}
            disabled={!manualCode || loading}
            size="sm"
          >
            Go
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Render #qr-reader in the DOM as soon as we leave idle so html5-qrcode
          always finds a visible element when it initialises */}
      {phase !== "idle" && (
        <div id="qr-reader" className="rounded-xl overflow-hidden" />
      )}

      {loading && (
        <div className="flex items-center gap-2 justify-center py-4 text-sm text-stone-500">
          <Loader size={16} className="animate-spin" />
          Looking up product…
        </div>
      )}

      {phase === "idle" && !loading && (
        <button
          onClick={startScanner}
          className="flex flex-col items-center gap-3 py-12 border-2 border-dashed border-stone-200 rounded-xl hover:border-primary hover:bg-primary-soft/30 transition-colors"
        >
          <Camera size={36} className="text-stone-400" />
          <span className="text-sm text-stone-500">Tap to scan barcode</span>
        </button>
      )}

      {phase === "starting" && (
        <div className="flex items-center gap-2 justify-center py-3 text-sm text-stone-400">
          <Loader size={14} className="animate-spin" />
          Starting camera…
        </div>
      )}

      {phase === "scanning" && (
        <Button
          variant="secondary"
          onClick={stopScanner}
          size="sm"
          className="self-center"
        >
          Cancel
        </Button>
      )}
    </div>
  );
}

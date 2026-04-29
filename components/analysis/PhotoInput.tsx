"use client";
import { useRef, useState } from "react";
import { Camera, ImagePlus, RotateCcw, Loader } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface PhotoInputProps {
  onSubmit: (imageData: string, mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif") => void;
  loading: boolean;
}

function resizeImage(
  file: File,
  maxDim = 800
): Promise<{ data: string; mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif" }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas not available")); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      resolve({ data: dataUrl.split(",")[1], mediaType: "image/jpeg" });
    };
    img.onerror = reject;
    img.src = objectUrl;
  });
}

export function PhotoInput({ onSubmit, loading }: PhotoInputProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [imageData, setImageData] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image/jpeg" | "image/png" | "image/webp" | "image/gif">("image/jpeg");
  const [processing, setProcessing] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setProcessing(true);
    try {
      const { data, mediaType: mt } = await resizeImage(file);
      setImageData(data);
      setMediaType(mt);
      setPreview(`data:${mt};base64,${data}`);
    } finally {
      setProcessing(false);
    }
  }

  function handleReset() {
    setPreview(null);
    setImageData(null);
    if (cameraRef.current) cameraRef.current.value = "";
    if (galleryRef.current) galleryRef.current.value = "";
  }

  // Hidden inputs — one opens camera, one opens gallery
  const hiddenInputs = (
    <>
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
    </>
  );

  if (preview && imageData) {
    return (
      <div className="flex flex-col gap-4">
        {hiddenInputs}
        {/* Image preview */}
        <div className="relative rounded-xl overflow-hidden border border-stone-200 bg-stone-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Nutrition label preview" className="w-full max-h-72 object-contain" />
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="flex items-center gap-1.5"
          >
            <RotateCcw size={14} />
            Retake
          </Button>
          <Button
            onClick={() => onSubmit(imageData, mediaType)}
            disabled={loading}
            size="lg"
            className="flex-1"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader size={14} className="animate-spin" /> Analyzing image…
              </span>
            ) : (
              "Analyze Label"
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {hiddenInputs}
      {processing ? (
        <div className="flex items-center gap-2 justify-center py-12 text-sm text-stone-400">
          <Loader size={16} className="animate-spin" />
          Processing image…
        </div>
      ) : (
        <>
          {/* Camera — opens rear camera directly on mobile */}
          <button
            onClick={() => cameraRef.current?.click()}
            className="flex flex-col items-center gap-3 py-10 border-2 border-dashed border-stone-200 rounded-xl hover:border-primary hover:bg-primary-soft/30 transition-colors"
          >
            <Camera size={36} className="text-stone-400" />
            <div>
              <p className="text-sm font-medium text-stone-600">Take a photo</p>
              <p className="text-xs text-stone-400 mt-0.5">Point your camera at the nutrition label</p>
            </div>
          </button>

          {/* Gallery — file picker for desktop or choosing from gallery */}
          <button
            onClick={() => galleryRef.current?.click()}
            className="flex items-center justify-center gap-2 py-3 border border-stone-200 rounded-xl text-sm text-stone-500 hover:border-primary hover:text-primary transition-colors"
          >
            <ImagePlus size={16} />
            Choose from gallery
          </button>
        </>
      )}
    </div>
  );
}

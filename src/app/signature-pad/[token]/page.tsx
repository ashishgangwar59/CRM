"use client";

import { useEffect, useRef, useState, use } from "react";
import { CheckCircle2, RotateCcw, PenTool, Lock } from "lucide-react";

export default function SignaturePadPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas dimensions based on container width
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2; // High DPI resolution
    canvas.height = 300 * 2;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.scale(2, 2);
      ctx.strokeStyle = "#0c1c3d";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    }
  }, []);

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ("touches" in e) {
      if (e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      }
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setIsDrawing(true);
    setHasDrawn(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleSubmit = async () => {
    if (!hasDrawn) {
      alert("Please draw your signature before submitting.");
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");

    setSubmitting(true);
    setErrorMsg("");

    try {
      // 1. Upload signature image to server storage
      const uploadRes = await fetch("/api/employees/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64: dataUrl, fileName: `signature_${token}.png` })
      });
      const uploadData = await uploadRes.json();
      const finalSignatureUrl = uploadData.success ? uploadData.url : dataUrl;

      // 2. Submit signature to the active QR session
      const res = await fetch(`/api/signature-session/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signatureUrl: finalSignatureUrl })
      });

      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
      } else {
        setErrorMsg(data.error || "Failed to submit signature.");
      }
    } catch (e) {
      console.error(e);
      setErrorMsg("Error connecting to server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow-xl max-w-md w-full text-center space-y-4 border border-slate-100">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Signature Submitted!</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Your digital signature has been successfully transferred to your application form.
          </p>
          <div className="p-3 bg-emerald-50 rounded-lg text-xs font-semibold text-emerald-800 border border-emerald-200">
            ✓ You can now close this tab on your phone.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between p-4 max-w-md mx-auto">
      {/* Header */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 text-center space-y-1">
        <div className="flex items-center justify-center space-x-2 text-[#0c1c3d]">
          <PenTool className="w-5 h-5 text-amber-500" />
          <h1 className="text-lg font-bold">NIVENTRA CAPITAL</h1>
        </div>
        <p className="text-xs text-slate-500 font-medium">Draw applicant signature below</p>
      </div>

      {/* Signature Canvas Box */}
      <div className="my-4 bg-white rounded-xl shadow-md border-2 border-slate-300 p-2 space-y-2 relative">
        <div className="flex justify-between items-center px-2 py-1 text-xs text-slate-400 font-medium border-b border-slate-100">
          <span>SIGNATURE AREA</span>
          <button 
            onClick={clearCanvas} 
            className="flex items-center text-rose-600 hover:text-rose-700 font-bold text-xs"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" /> Clear
          </button>
        </div>

        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-[280px] bg-amber-50/20 rounded cursor-crosshair touch-none border border-dashed border-slate-200"
        />

        <div className="text-center text-[10px] text-slate-400 font-mono">
          Sign inside the box using your finger or stylus
        </div>
      </div>

      {errorMsg && (
        <p className="text-xs font-bold text-rose-600 text-center bg-rose-50 p-2 rounded border border-rose-200">
          {errorMsg}
        </p>
      )}

      {/* Footer Submit Button */}
      <div className="space-y-2">
        <button
          onClick={handleSubmit}
          disabled={submitting || !hasDrawn}
          className={`w-full py-3.5 rounded-xl font-bold text-white shadow-lg transition-all text-sm flex items-center justify-center ${
            submitting || !hasDrawn 
              ? "bg-slate-300 cursor-not-allowed" 
              : "bg-[#0c1c3d] hover:bg-[#152a55] active:scale-[0.98]"
          }`}
        >
          {submitting ? "Transferring Signature..." : "Submit Signature to Application"}
        </button>

        <div className="flex items-center justify-center text-[11px] text-slate-400 space-x-1">
          <Lock className="w-3 h-3 text-slate-400" />
          <span>256-Bit Encrypted Mobile Signature Link</span>
        </div>
      </div>
    </div>
  );
}

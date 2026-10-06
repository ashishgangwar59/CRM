"use client";

import { useState, useRef, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import Cropper from "react-easy-crop";
import { getCroppedImg } from "@/lib/cropImage";
import { CheckCircle2, QrCode, Upload, Eye, X, RotateCcw, RotateCw, Loader2 } from "lucide-react";

export default function DashboardPhotoSignatureUploader({ kycDocs, setKycDocs, investor }: any) {
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [cropTargetField, setCropTargetField] = useState<"signatureUrl" | "passportPhotoUrl">("signatureUrl");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);

  const [qrToken, setQrToken] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [pollingQr, setPollingQr] = useState(false);

  const [toastMsg, setToastMsg] = useState<{ message: string, type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (toastMsg) {
      const timer = setTimeout(() => setToastMsg(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMsg]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      streamRef.current = stream;
      setShowCamera(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err) {
      alert("Camera access denied or unavailable.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  };

  const captureSnapshot = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 400;
    canvas.height = video.videoHeight || 400;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);

    stopCamera();

    setCropTargetField("passportPhotoUrl");
    setCropImageSrc(dataUrl);
    setCropModalOpen(true);
  };

  const startQrSignature = async () => {
    try {
      const res = await fetch("/api/signature-session", { method: "POST" });
      const data = await res.json();
      if (data.success && data.token) {
        setQrToken(data.token);
        const fullQrUrl = `${window.location.origin}/sign/${data.token}`;
        setQrUrl(fullQrUrl);
        setShowQrModal(true);
        setPollingQr(true);
      } else {
        alert("Failed to generate QR code session.");
      }
    } catch (e) {
      alert("Error starting QR code signature session.");
    }
  };

  useEffect(() => {
    if (!pollingQr || !qrToken) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/signature-session/${qrToken}`);
        const data = await res.json();
        if (data.success && data.status === "COMPLETED" && data.signatureUrl) {
          setKycDocs((prev: any) => ({ ...prev, signatureUrl: data.signatureUrl }));
          setPollingQr(false);
          setShowQrModal(false);

          const canvas = canvasRef.current;
          if (canvas) {
            const ctx = canvas.getContext("2d");
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
              ctx?.clearRect(0, 0, canvas.width, canvas.height);
              ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
            };
            img.src = data.signatureUrl;
          }

          setToastMsg({ message: "Signature successfully captured from mobile device!", type: "success" });
        }
      } catch (e) {
        console.error("Polling QR signature error:", e);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [pollingQr, qrToken, setKycDocs]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || kycDocs.signatureUrl) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#00008b";

    const getPos = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      if ("touches" in e) {
        return {
          x: e.touches[0].clientX - rect.left,
          y: e.touches[0].clientY - rect.left,
        };
      }
      return {
        x: (e as MouseEvent).clientX - rect.left,
        y: (e as MouseEvent).clientY - rect.top,
      };
    };

    const start = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      isDrawing.current = true;
      const pos = getPos(e);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    };

    const move = (e: MouseEvent | TouchEvent) => {
      if (!isDrawing.current) return;
      e.preventDefault();
      const pos = getPos(e);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    };

    const end = () => {
      isDrawing.current = false;
      const signatureDataUrl = canvas.toDataURL("image/png");
      if (signatureDataUrl !== document.createElement("canvas").toDataURL("image/png")) {
        setKycDocs((prev: any) => ({ ...prev, signatureUrl: signatureDataUrl }));
      }
    };

    canvas.addEventListener("mousedown", start);
    canvas.addEventListener("mousemove", move);
    window.addEventListener("mouseup", end);
    canvas.addEventListener("touchstart", start as any, { passive: false });
    canvas.addEventListener("touchmove", move as any, { passive: false });
    canvas.addEventListener("touchend", end);

    return () => {
      canvas.removeEventListener("mousedown", start);
      canvas.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", end);
    };
  }, [kycDocs.signatureUrl, setKycDocs]);

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleCropUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: "signatureUrl" | "passportPhotoUrl") => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    if (file.size > 100 * 1024 * 1024) return;
    if (!file.type.includes("image/")) return;
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      setCropTargetField(field);
      setCropImageSrc(reader.result?.toString() || "");
      setCropModalOpen(true);
    });
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCropConfirm = async () => {
    if (!cropImageSrc || !croppedAreaPixels) return;
    try {
      const croppedBlob = await getCroppedImg(cropImageSrc, croppedAreaPixels, rotation);
      if (!croppedBlob) return;
      const file = new File([croppedBlob], `photo_${Date.now()}.jpg`, { type: "image/jpeg" });

      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await fetch("/api/employees/upload", { method: "POST", body: formData });
      const uploadJson = await uploadRes.json();

      if (uploadJson.success && uploadJson.url) {
        setKycDocs((prev: any) => ({ ...prev, [cropTargetField]: uploadJson.url }));
        setToastMsg({ message: "Successfully uploaded", type: "success" });

        if (cropTargetField === "signatureUrl") {
          const canvas = canvasRef.current;
          if (canvas) {
            const ctx = canvas.getContext("2d");
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
              ctx?.clearRect(0, 0, canvas.width, canvas.height);
              ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
            };
            img.src = uploadJson.url;
          }
        }
      }
      setCropModalOpen(false);
      setCropImageSrc(null);
      setRotation(0);
    } catch (e) {
      alert("Error processing image crop.");
    }
  };

  return (
    <>
      <div className="mt-8 flex flex-wrap justify-between items-end gap-6 pt-6 border-t border-[#eee]">
        {/* Photo Block */}
        <div className="flex gap-4 items-end">
          <div className="flex flex-col items-center">
            <div className="w-[120px] h-[140px] border border-dashed border-[#b89547] flex items-center justify-center p-1 bg-white mb-2">
              {kycDocs.passportPhotoUrl ? (
                <img
                  src={kycDocs.passportPhotoUrl}
                  alt="Applicant Passport Photo"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xs text-center text-[#b89547]">
                  Affix<br />Recent Passport<br />Size Photograph
                </span>
              )}
            </div>

            <div className="flex flex-col gap-1.5 w-[130px]">
              <label
                htmlFor="photoInputDashboardExt"
                className="cursor-pointer text-[11px] font-bold text-center py-1 px-2 rounded bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 text-zinc-800 transition-colors"
              >
                📁 Upload Photo
              </label>
              <input
                type="file"
                accept="image/*"
                id="photoInputDashboardExt"
                className="hidden"
                onChange={(e) => handleCropUpload(e, "passportPhotoUrl")}
                disabled={investor.status === "Verified"}
              />

              <button
                type="button"
                onClick={startCamera}
                className="text-[11px] font-bold text-center py-1 px-2 rounded bg-[#0c1c3d] text-white hover:bg-[#132a5c] transition-colors"
                disabled={investor.status === "Verified"}
              >
                📷 Live Capture
              </button>

              {kycDocs.passportPhotoUrl && (
                <button
                  type="button"
                  onClick={() => setKycDocs((prev: any) => ({ ...prev, passportPhotoUrl: "" }))}
                  className="text-[10px] text-rose-600 hover:underline text-center mt-1"
                  disabled={investor.status === "Verified"}
                >
                  Remove Photo
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Signature Block */}
        <div className="flex flex-col gap-4">
          <div className="relative">
            {kycDocs.signatureUrl ? (
              <div className="relative w-[220px] h-[60px] bg-white border border-slate-300 rounded flex items-center justify-center overflow-hidden">
                <img src={kycDocs.signatureUrl} alt="Applicant Signature" className="w-full h-full object-contain p-1" />
              </div>
            ) : (
              <canvas className="w-[220px] h-[60px] bg-white border border-slate-300 rounded cursor-crosshair touch-none" ref={canvasRef} width={220} height={60}></canvas>
            )}
            <div style={{ fontWeight: 600, marginTop: "2px", fontSize: "14px" }}>Signature of Applicant</div>
            <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
              <button
                type="button"
                onClick={() => {
                  clearSignature();
                  setKycDocs((prev: any) => ({ ...prev, signatureUrl: "" }));
                }}
                className="text-[10px] px-2 py-0.5 rounded border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors"
                disabled={investor.status === "Verified"}
              >
                Clear signature
              </button>
              <button
                type="button"
                onClick={startQrSignature}
                className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors"
                disabled={investor.status === "Verified"}
              >
                <QrCode className="w-3 h-3 mr-1" /> Sign via Mobile QR
              </button>
              <label
                htmlFor="sigUploadInputDashboardExt"
                className="cursor-pointer inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
              >
                <Upload className="w-3 h-3 mr-1" /> Upload Image
              </label>
              <input
                type="file"
                id="sigUploadInputDashboardExt"
                accept="image/png, image/jpeg"
                className="hidden"
                onChange={(e) => handleCropUpload(e, "signatureUrl")}
                disabled={investor.status === "Verified"}
              />
              {kycDocs.signatureUrl && (
                <button
                  type="button"
                  onClick={() => window.open(kycDocs.signatureUrl, '_blank')}
                  className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 transition-colors"
                >
                  <Eye className="w-3 h-3 mr-1 text-sky-600" /> View Large
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Camera Modal */}
      {showCamera && (
        <div className="fixed inset-0 z-[60] bg-black/90 flex flex-col items-center justify-center p-4">
          <div className="bg-white p-4 rounded-xl max-w-lg w-full flex flex-col items-center relative shadow-2xl">
            <button onClick={stopCamera} className="absolute -top-4 -right-4 bg-white text-rose-500 rounded-full p-2 shadow-lg hover:bg-rose-50"><X className="w-5 h-5" /></button>
            <h3 className="text-xl font-bold text-zinc-900 mb-4 flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-rose-500 animate-pulse"></div> Live Camera Capture</h3>
            <div className="w-full aspect-[3/4] bg-zinc-900 rounded-lg overflow-hidden border-4 border-zinc-100 shadow-inner relative">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]"></video>
              <div className="absolute inset-0 border-[40px] border-black/40 rounded-lg pointer-events-none"></div>
            </div>
            <button onClick={captureSnapshot} className="mt-6 w-16 h-16 rounded-full bg-white border-4 border-rose-500 flex items-center justify-center shadow-xl hover:scale-105 transition-transform">
              <div className="w-12 h-12 rounded-full bg-rose-500"></div>
            </button>
            <p className="mt-4 text-sm text-zinc-500 font-medium">Position your face inside the frame</p>
          </div>
        </div>
      )}

      {/* QR Modal */}
      {showQrModal && qrUrl && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-xl max-w-sm w-full text-center relative shadow-2xl">
            <button onClick={() => { setShowQrModal(false); setPollingQr(false); }} className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600"><X className="w-5 h-5" /></button>
            <h3 className="text-xl font-bold text-indigo-900 mb-2">Mobile QR Signature</h3>
            <p className="text-sm text-zinc-500 mb-6">Scan this QR code with your mobile phone camera to draw your signature.</p>
            <div className="bg-white p-4 rounded-xl border shadow-sm inline-block mb-4"><QRCodeSVG value={qrUrl} size={200} /></div>
            <div className="flex items-center justify-center gap-2 text-indigo-600 text-sm font-semibold">
              <Loader2 className="w-4 h-4 animate-spin" /> Waiting for signature...
            </div>
          </div>
        </div>
      )}

      {/* Crop Modal */}
      {cropModalOpen && cropImageSrc && (
        <div className="fixed inset-0 z-[70] bg-black/90 flex flex-col items-center justify-center p-2 sm:p-4">
          <div className="bg-zinc-950 p-2 sm:p-4 rounded-xl w-full max-w-3xl h-[85vh] sm:h-[600px] flex flex-col shadow-2xl relative border border-zinc-800">
            <h3 className="text-white text-lg font-bold px-4 mb-2">Crop {cropTargetField === "signatureUrl" ? "Signature" : "Photo"}</h3>
            <div className="relative flex-1 bg-black rounded-lg overflow-hidden w-full">
              <Cropper
                image={cropImageSrc}
                crop={crop}
                zoom={zoom}
                rotation={rotation}
                aspect={cropTargetField === "signatureUrl" ? 220 / 60 : 3 / 4}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onRotationChange={setRotation}
                onCropComplete={(_, croppedPixels) => setCroppedAreaPixels(croppedPixels)}
                style={{ containerStyle: { background: "#000" } }}
              />
            </div>
            <div className="mt-4 px-4 pb-4 space-y-4">
              <div className="flex items-center gap-4">
                <span className="text-zinc-400 text-xs w-12 shrink-0">Zoom</span>
                <input type="range" value={zoom} min={1} max={3} step={0.1} aria-labelledby="Zoom" onChange={(e) => setZoom(Number(e.target.value))} className="w-full accent-indigo-500" />
              </div>
              <div className="flex items-center gap-4">
                <span className="text-zinc-400 text-xs w-12 shrink-0">Rotate</span>
                <button onClick={() => setRotation(r => r - 90)} className="p-2 bg-zinc-800 text-white rounded-full hover:bg-zinc-700 transition-colors"><RotateCcw className="w-4 h-4" /></button>
                <input type="range" value={rotation} min={0} max={360} step={1} aria-labelledby="Rotation" onChange={(e) => setRotation(Number(e.target.value))} className="w-full accent-indigo-500" />
                <button onClick={() => setRotation(r => r + 90)} className="p-2 bg-zinc-800 text-white rounded-full hover:bg-zinc-700 transition-colors"><RotateCw className="w-4 h-4" /></button>
              </div>
              <div className="flex gap-3 justify-end pt-2 border-t border-zinc-800">
                <button onClick={() => { setCropModalOpen(false); setCropImageSrc(null); setRotation(0); }} className="px-6 py-2.5 rounded-lg text-sm font-bold bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors">Cancel</button>
                <button onClick={handleCropConfirm} className="px-6 py-2.5 rounded-lg text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-900/50 transition-colors">Confirm & Upload</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

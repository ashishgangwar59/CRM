"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { CheckCircle2, UserCheck, QrCode, Smartphone, RefreshCw, X, Copy, Check, PenTool } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

function DebentureFormContent() {
  const searchParams = useSearchParams();
  const refCodeParam = searchParams.get("ref") || "";

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);

  const [form, setForm] = useState({
    applicationNo: "",
    fullName: "",
    fatherSpouseName: "",
    dob: "",
    address: "",
    city: "",
    state: "",
    pinCode: "",
    panNumber: "",
    phone: "",
    email: "",
    occupation: "",
    typeOfDebenture: "Secured",
    typeSecured: true,
    typeNonConvertible: false,
    typeRedeemable: false,
    faceValue: 1000,
    noOfDebentures: 1,
    numDebenturesWords: "One",
    totalApplicationAmount: 1000,
    totalApplicationAmountWords: "One Thousand Only",
    modeOfPayment: "NEFT/RTGS",
    paymentModeOther: "",
    chequeDdNo: "",
    chequeDdDate: "",
    transactionUtrNo: "",
    drawnOnBank: "",
    bankName: "",
    accountNo: "",
    ifscCode: "",
    refEmpCode: refCodeParam,
    passportPhotoUrl: "",
    panDocUrl: "",
    aadharDocUrl: "",
    bankPassbookUrl: "",
    place: "",
    declDay: new Date().getDate().toString().padStart(2, "0"),
    declMonth: (new Date().getMonth() + 1).toString().padStart(2, "0"),
    declYear: new Date().getFullYear().toString(),
  });

  useEffect(() => {
    if (!form.applicationNo) {
      const year = new Date().getFullYear();
      const rand = Math.floor(1000 + Math.random() * 9000);
      setForm((prev) => ({
        ...prev,
        applicationNo: `APP-${year}-${rand}`,
      }));
    }
  }, []);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const isDrawing = useRef(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);

  const startCamera = async () => {
    setCameraActive(true);
    setCameraLoading(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 640 }, facingMode: "user" }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      alert("Could not access camera. Please make sure camera permissions are enabled in your browser.");
      setCameraActive(false);
    } finally {
      setCameraLoading(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  // Mobile QR Code Signature States
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrToken, setQrToken] = useState("");
  const [qrUrl, setQrUrl] = useState("");
  const [pollingQr, setPollingQr] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const startQrSignature = async () => {
    try {
      const res = await fetch("/api/signature-session/create", { method: "POST" });
      const data = await res.json();
      if (data.success && data.sessionToken) {
        const fullQrUrl = `${window.location.origin}/signature-pad/${data.sessionToken}`;
        setQrToken(data.sessionToken);
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
          setForm((prev) => ({ ...prev, signatureUrl: data.signatureUrl }));
          setPollingQr(false);
          setShowQrModal(false);

          // Draw signature onto canvas preview
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

          alert("Signature successfully captured from mobile device!");
        }
      } catch (e) {
        console.error("Polling QR signature error:", e);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [pollingQr, qrToken]);

  const dataURItoBlob = (dataURI: string): Blob => {
    const byteString = atob(dataURI.split(",")[1]);
    const mimeString = dataURI.split(",")[0].split(":")[1].split(";")[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeString });
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

    try {
      // 1. Try pure JavaScript Blob conversion (works cross-platform on phone/tablet)
      let blob: Blob | null = null;
      try {
        blob = dataURItoBlob(dataUrl);
      } catch (err) {
        console.error("dataURItoBlob failed:", err);
      }

      if (blob) {
        const file = new File([blob], `passport_photo_${Date.now()}.jpg`, { type: "image/jpeg" });
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/employees/upload", { method: "POST", body: formData });
        const json = await res.json();
        if (json.success) {
          setForm((prev) => ({ ...prev, passportPhotoUrl: json.url }));
          return;
        }
      }

      // 2. Base64 JSON fallback for WebViews or browsers where Blob fails
      const res = await fetch("/api/employees/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64: dataUrl, fileName: `live_photo_${Date.now()}.jpg` })
      });
      const json = await res.json();
      if (json.success) {
        setForm((prev) => ({ ...prev, passportPhotoUrl: json.url }));
      } else {
        alert(json.error || "Failed to upload live photo.");
      }
    } catch (e) {
      console.error(e);
      alert("Error saving live photo. Please try again.");
    }
  };

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.employee) {
          const empCode = data.employee.employeeCode || data.employee.email;
          setForm((prev) => ({ ...prev, refEmpCode: prev.refEmpCode || empCode }));
        } else if (!refCodeParam && !data.success) {
          setUnauthorized(true);
        }
      })
      .catch(() => {
        if (!refCodeParam) setUnauthorized(true);
      });

    if (refCodeParam) {
      setForm((prev) => ({ ...prev, refEmpCode: refCodeParam }));
    }
  }, [refCodeParam]);

  // Setup Canvas Signature
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.strokeStyle = "#0c1c3d";
    ctx.lineWidth = 1.6;
    ctx.lineCap = "round";

    function pos(e: MouseEvent | TouchEvent) {
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      return { x: clientX - rect.left, y: clientY - rect.top };
    }

    function start(e: MouseEvent | TouchEvent) {
      isDrawing.current = true;
      const p = pos(e);
      ctx?.beginPath();
      ctx?.moveTo(p.x, p.y);
    }

    function move(e: MouseEvent | TouchEvent) {
      if (!isDrawing.current) return;
      const p = pos(e);
      ctx?.lineTo(p.x, p.y);
      ctx?.stroke();
    }

    function end() {
      isDrawing.current = false;
    }

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
  }, [unauthorized, submitted]);

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const numberToWords = (num: number, isCurrency = false): string => {
    if (num === 0) return isCurrency ? "Rupees Zero Only" : "Zero";
    if (isNaN(num) || num < 0) return "";

    const ones = [
      "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
      "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"
    ];
    const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

    const convertLessThanOneThousand = (n: number): string => {
      if (n === 0) return "";
      let temp = "";
      if (n >= 100) {
        temp += ones[Math.floor(n / 100)] + " Hundred ";
        n %= 100;
      }
      if (n >= 20) {
        temp += tens[Math.floor(n / 10)] + " ";
        n %= 10;
      }
      if (n > 0) {
        temp += ones[n] + " ";
      }
      return temp.trim();
    };

    let str = "";
    let n = Math.floor(num);

    if (n >= 10000000) { // Crore
      str += convertLessThanOneThousand(Math.floor(n / 10000000)) + " Crore ";
      n %= 10000000;
    }
    if (n >= 100000) { // Lakh
      str += convertLessThanOneThousand(Math.floor(n / 100000)) + " Lakh ";
      n %= 100000;
    }
    if (n >= 1000) { // Thousand
      str += convertLessThanOneThousand(Math.floor(n / 1000)) + " Thousand ";
      n %= 1000;
    }
    if (n > 0) {
      str += convertLessThanOneThousand(n);
    }

    const result = str.trim();
    return isCurrency ? `Rupees ${result} Only` : result;
  };

  const handleDebentureCalc = (qty: number, faceVal: number) => {
    const total = qty * faceVal;
    setForm((prev) => ({
      ...prev,
      noOfDebentures: qty,
      faceValue: faceVal,
      numDebenturesWords: numberToWords(qty),
      totalApplicationAmount: total,
      totalApplicationAmountWords: numberToWords(total, true),
    }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/employees/upload", { method: "POST", body: formData });
      const json = await res.json();
      if (json.success) {
        setForm((prev) => ({ ...prev, [field]: json.url }));
      } else {
        alert(json.error || "File upload failed.");
      }
    } catch (e) {
      alert("Error uploading file.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Client-side validations
    if (!form.fullName || !form.fullName.trim()) {
      setError("Please enter the Full Name (Applicant).");
      return;
    }

    if (!form.email || !form.email.trim()) {
      setError("Please enter your Email address.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email.trim())) {
      setError("Please enter a valid Email address.");
      return;
    }

    if (!form.phone || !form.phone.trim()) {
      setError("Please enter your 10-digit Mobile Number.");
      return;
    }
    const cleanPhone = form.phone.trim().replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      setError("Mobile Number must be at least 10 digits.");
      return;
    }

    if (form.panNumber && form.panNumber.trim().length > 0 && form.panNumber.trim().length !== 10) {
      setError("PAN Number must be exactly 10 characters.");
      return;
    }

    if (!form.noOfDebentures || Number(form.noOfDebentures) <= 0) {
      setError("No. of Debentures Applied must be at least 1.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/debenture-application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const json = await res.json();
      if (json.success) {
        setSubmitted(json.data);
      } else {
        setError(json.error || "Failed to submit Debenture Application.");
      }
    } catch (e) {
      setError("An error occurred while submitting the form.");
    } finally {
      setLoading(false);
    }
  };

  if (unauthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "#e7e7e7" }}>
        <Card
          className="max-w-md w-full shadow-xl text-center p-8 space-y-4"
          style={{ background: "#fffdf8", border: "2px solid #0c1c3d" }}
        >
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto text-2xl"
            style={{ background: "#fdecea", border: "1px solid #f3b9b0", color: "#b3261e" }}
          >
            🔒
          </div>
          <h2 className="text-2xl font-black" style={{ color: "#0c1c3d" }}>Access Denied</h2>
          <p className="text-sm text-zinc-600">
            Direct access to the Debenture Application Form is restricted. Please log in to your
            employee account or access the form using a valid Employee Referral link.
          </p>
          <div className="pt-4">
            <a
              href="/login"
              className="inline-block text-white px-6 py-2.5 rounded-sm font-bold text-sm"
              style={{ background: "#0c1c3d" }}
            >
              Go to Login
            </a>
          </div>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "#e7e7e7" }}>
        <Card
          className="max-w-lg w-full shadow-xl text-center p-8 space-y-4"
          style={{ background: "#fffdf8", border: "2px solid #0c1c3d" }}
        >
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
            style={{ background: "#fdf6e3", border: "1px solid #c9972f" }}
          >
            <CheckCircle2 className="w-10 h-10" style={{ color: "#0c1c3d" }} />
          </div>
          <h2 className="text-2xl font-black" style={{ color: "#0c1c3d" }}>Application Submitted!</h2>
          <p className="text-sm text-zinc-600">
            Your Debenture Application has been successfully registered under Application No:
          </p>
          <div
            className="p-3 rounded-sm font-mono font-bold text-lg"
            style={{ background: "#fbf6e8", border: "1px solid #c9972f", color: "#0c1c3d" }}
          >
            {submitted.applicationNo}
          </div>
          <p className="text-xs text-zinc-500">
            Our team will review your application and documents. Check your registered email for
            instructions on setting up your account password.
          </p>
          <div className="pt-4">
            <a
              href="/login"
              className="inline-block text-white px-6 py-2.5 rounded-sm font-bold text-sm"
              style={{ background: "#0c1c3d" }}
            >
              Go to Login Portal
            </a>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="py-6 px-4" style={{ background: "#e7e7e7", fontFamily: "'Segoe UI', Arial, sans-serif" }}>
      <style jsx global>{`
        :root {
          --navy: #0c1c3d;
          --gold: #c9972f;
          --gold-light: #e8b84b;
          --cream: #fffdf8;
          --text: #1c1c1c;
        }
        .sheet {
          max-width: 900px;
          margin: 0 auto;
          background: var(--cream);
          border: 2px solid var(--navy);
          position: relative;
          color: var(--text);
        }

        .sheet input[type="text"],
        .sheet input[type="email"],
        .sheet input[type="tel"],
        .sheet input[type="number"],
        .sheet input[type="date"],
        .sheet textarea,
        .sheet select {
          font-family: inherit;
          font-size: 12.5px;
          color: #0c1c3d;
          background: #fbf6e8;
          border: none;
          border-bottom: 1px solid #999;
          padding: 2px 4px;
          outline: none;
          width: 100%;
        }
        .sheet input[type="text"]:focus,
        .sheet input[type="email"]:focus,
        .sheet input[type="tel"]:focus,
        .sheet input[type="number"]:focus,
        .sheet input[type="date"]:focus,
        .sheet textarea:focus,
        .sheet select:focus {
          border-bottom: 1.5px solid var(--navy);
          background: #fff8dc;
        }
        .digit-box {
          width: 20px;
          height: 22px;
          text-align: center;
          padding: 0;
          border: 1px solid #999;
          font-size: 13px;
          text-transform: uppercase;
        }

        /* HEADER */
        .sheet .header {
          background: linear-gradient(180deg, #0c1c3d, #132a5c);
          color: #fff;
          padding: 18px 30px 14px;
          text-align: center;
          border-bottom: 4px solid var(--gold);
          position: relative;
        }
        .sheet .company-name {
          font-size: 28px;
          font-weight: 800;
          letter-spacing: 1px;
          color: var(--gold-light);
          margin: 6px 0 8px;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
        }
        .sheet .addr {
          font-size: 12.5px;
          line-height: 1.5;
          margin: 0 0 8px;
        }
        .sheet .contact-row {
          display: flex;
          justify-content: center;
          gap: 24px;
          font-size: 12px;
          margin-top: 6px;
          flex-wrap: wrap;
        }
        .sheet .logo-badge {
          position: absolute;
          left: 18px;
          top: 14px;
          width: 70px;
          height: 70px;
          border-radius: 50%;
          background: radial-gradient(circle, #12224e 60%, #0c1c3d 100%);
          border: 3px solid var(--gold);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          color: var(--gold-light);
          font-size: 20px;
        }
        .sheet .crest {
          position: absolute;
          right: 18px;
          top: 10px;
          text-align: center;
          color: var(--gold-light);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.5px;
          line-height: 1.3;
        }
        .sheet .crest .crown {
          font-size: 18px;
          display: block;
          margin-bottom: 2px;
        }

        .sheet .divider {
          text-align: center;
          padding: 6px 0;
          color: var(--gold);
          font-size: 14px;
          letter-spacing: 4px;
        }

        /* TITLE */
        .sheet .title-block {
          text-align: center;
          padding: 6px 20px 4px;
        }
        .sheet .title-block h1 {
          color: var(--navy);
          font-size: 24px;
          font-weight: 800;
          letter-spacing: 2px;
          margin: 0;
        }
        .sheet .title-block h2 {
          color: #c05a1e;
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 1px;
          margin: 4px 0 8px;
        }
        .sheet .notice {
          background: var(--navy);
          color: #fff;
          display: inline-block;
          padding: 5px 22px;
          border-radius: 14px;
          font-size: 11px;
          letter-spacing: 0.5px;
          margin-bottom: 10px;
        }

        .sheet .app-no-box {
          position: absolute;
          right: 24px;
          top: 186px;
          border: 1px solid var(--gold);
          padding: 8px 14px;
          font-size: 12.5px;
          width: 200px;
          background: #fffef9;
        }
        .sheet .app-no-box div {
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .sheet .app-no-box div:last-child {
          margin-bottom: 0;
        }

        .sheet .top-info {
          padding: 0 24px;
          font-size: 13px;
          line-height: 1.6;
        }
        .sheet .top-info b {
          display: block;
        }

        /* SECTION HEADERS */
        .sheet .section-header {
          background: var(--navy);
          color: #fff;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.5px;
          padding: 5px 16px;
          margin: 16px 24px 0;
          clip-path: polygon(0 0, 100% 0, 97% 100%, 0% 100%);
          display: inline-block;
          min-width: 260px;
        }

        .sheet .box {
          border: 1px solid var(--gold);
          margin: 0 24px 14px;
          padding: 10px 16px;
          background: #fffef9;
        }

        .sheet .field-row {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12.5px;
          padding: 6px 0;
          border-bottom: 1px dotted #e3c98a;
        }
        .sheet .field-row:last-child {
          border-bottom: none;
        }
        .sheet .field-icon {
          width: 20px;
          color: var(--gold);
          flex-shrink: 0;
          text-align: center;
        }
        .sheet .field-label {
          width: 190px;
          flex-shrink: 0;
          color: #333;
        }
        .sheet .field-colon {
          width: 10px;
          flex-shrink: 0;
        }
        .sheet .field-fill {
          flex: 1;
        }

        .sheet .date-trio {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .sheet .date-trio input {
          width: 36px;
          text-align: center;
        }

        .sheet .pan-boxes,
        .sheet .pin-boxes {
          display: flex;
          gap: 3px;
        }

        .sheet .checkbox-group {
          display: flex;
          gap: 20px;
          flex-wrap: wrap;
          font-size: 12.5px;
        }
        .sheet .checkbox-group label {
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
        }
        .sheet .checkbox-group input[type="checkbox"],
        .sheet .docs-grid input[type="checkbox"] {
          width: 14px;
          height: 14px;
          accent-color: var(--navy);
        }

        .sheet .decl-text {
          font-size: 12px;
          line-height: 1.7;
        }
        .sheet .decl-text ol {
          margin: 6px 0 0 18px;
          padding: 0;
        }

        .sheet .decl-flex {
          display: flex;
          justify-content: space-between;
          gap: 20px;
        }
        .sheet .decl-flex .left {
          flex: 1;
        }
        .sheet .photo-box {
          width: 120px;
          height: 130px;
          border: 1.5px dashed var(--gold);
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          font-size: 11px;
          color: #8a6d1f;
          flex-shrink: 0;
          position: relative;
          overflow: hidden;
          cursor: pointer;
          background: #fffef9;
        }
        .sheet .photo-box img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .sheet .photo-box input[type="file"] {
          position: absolute;
          inset: 0;
          opacity: 0;
          cursor: pointer;
        }

        .sheet .sign-line {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 20px;
          font-size: 12px;
          flex-wrap: wrap;
          gap: 12px;
        }
        .sheet .sig-pad-wrap {
          text-align: center;
        }
        .sheet .sig-pad {
          border: 1px solid #999;
          background: #fff;
          width: 220px;
          height: 60px;
          cursor: crosshair;
          display: block;
        }
        .sheet .sig-clear {
          font-size: 10px;
          color: #0c1c3d;
          background: none;
          border: 1px solid var(--gold);
          border-radius: 3px;
          padding: 1px 8px;
          margin-top: 3px;
          cursor: pointer;
        }

        .sheet .docs-grid {
          display: flex;
          justify-content: space-between;
          font-size: 12.5px;
          gap: 20px;
        }
        .sheet .docs-grid .col {
          flex: 1;
        }
        .sheet .docs-grid label {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 8px;
          cursor: pointer;
        }

        /* OFFICE USE */
        .sheet .office-wrap {
          display: flex;
          margin: 16px 24px 20px;
          border: 1px solid var(--gold);
        }
        .sheet .office-col {
          flex: 1;
          padding: 10px 14px;
          font-size: 11.5px;
        }
        .sheet .office-col + .office-col {
          border-left: 1px solid var(--gold);
        }
        .sheet .office-title {
          background: var(--navy);
          color: #fff;
          text-align: center;
          font-size: 11px;
          font-weight: 700;
          padding: 4px;
          margin: -10px -14px 8px;
        }
        .sheet .office-col div.row {
          margin-bottom: 8px;
          display: flex;
          gap: 6px;
          align-items: center;
        }
        .sheet .office-col .lbl {
          width: 120px;
          flex-shrink: 0;
        }
        .sheet .office-col label {
          display: flex;
          align-items: center;
          gap: 4px;
          margin: 0;
          cursor: pointer;
        }
        .sheet .office-col input[type="radio"] {
          width: 11px;
          height: 11px;
        }

        .sheet .stamp {
          width: 70px;
          height: 70px;
          border: 2px solid var(--navy);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          font-size: 8px;
          color: var(--navy);
          font-weight: 700;
          margin-top: 8px;
          line-height: 1.2;
        }
        .sheet .sign-name {
          font-family: 'Brush Script MT', cursive;
          font-size: 20px;
          color: #1a2c56;
          margin: 6px 0 0;
        }

        small.faded {
          color: #666;
        }

        /* ACTION BAR */
        .action-bar {
          max-width: 900px;
          margin: 16px auto 0;
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }
        .action-bar button {
          font-family: inherit;
          font-size: 13px;
          font-weight: 600;
          padding: 9px 22px;
          border-radius: 4px;
          border: none;
          cursor: pointer;
        }
        #submitBtn {
          background: var(--navy);
          color: #fff;
        }
        #submitBtn:hover {
          background: #132a5c;
        }
        #printBtn {
          background: var(--gold);
          color: #1c1c1c;
        }
        #printBtn:hover {
          background: var(--gold-light);
        }
        #resetBtn {
          background: #eee;
          color: #333;
          border: 1px solid #ccc;
        }

        #statusMsg {
          max-width: 900px;
          margin: 10px auto 0;
          text-align: center;
          font-size: 13px;
          color: #0c6b2d;
          font-weight: 600;
        }

        @media print {
          body {
            background: #fff;
            padding: 0;
          }
          .action-bar,
          #statusMsg {
            display: none;
          }
          .sheet {
            border: none;
          }
          input,
          textarea {
            background: transparent !important;
          }
        }
      `}</style>

      <form className="sheet" id="debentureForm" onSubmit={handleSubmit}>
        {/* HEADER */}
        <div className="header">
          <div className="logo-badge">

            <img
              src="/logo.png"
              alt="Company Logo"
              style={{ width: "100%", height: "100%", objectFit: "contain", padding: "3px", borderRadius: "50%", background: "#fff" }}
              onError={(e) => { (e.target as HTMLElement).style.display = "none"; }}
            />
          </div>


          <div className="crest">
            <span className="crown">&#9819;</span>
            INVEST TODAY<br />PROSPER<br />TOMORROW
          </div>
          <div className="company-name">NIVENTRA CAPITAL ADVISORY INDIA PVT LTD</div>
          <div className="addr">
            A-91, Block A, Gali No. 2, Sewak Park,<br />
            Near Dwarka Mor Metro Station, Gate No. 2,<br />
            Dwarka Mor, New Delhi &ndash; 110059, India
          </div>
          <div className="contact-row">
            <span>&#128222; 011 4051 5660</span>
            <span>&#9993; info@niventracapitaladvisory.com</span>
            <span>&#127760; www.niventracapitaladvisory.com</span>
          </div>
        </div>

        <div className="divider">&#10022; &mdash;&mdash;&mdash;&mdash;&mdash; &#10022; &mdash;&mdash;&mdash;&mdash;&mdash; &#10022;</div>

        {/* TITLE */}
        <div className="title-block">
          <h1>DEBENTURE APPLICATION FORM</h1>
          <h2>(FOR SECURED DEBENTURES)</h2>
          <div className="notice">PLEASE READ THE INSTRUCTIONS CAREFULLY BEFORE FILLING THE FORM</div>
        </div>

        <div className="app-no-box">
          <div>
            Application No.{" "}
            <input
              type="text"
              name="applicationNo"
              value={form.applicationNo || "APP-AUTO"}
              readOnly
              disabled
              style={{
                background: "#e9ecef",
                cursor: "not-allowed",
                fontWeight: "bold",
                color: "#0c1c3d",
                letterSpacing: "0.5px"
              }}
            />
          </div>
          <div>
            Date :
            <span className="date-trio">
              <input type="text" maxLength={2} placeholder="DD" name="declDay" value={form.declDay} onChange={(e) => setForm({ ...form, declDay: e.target.value })} />/
              <input type="text" maxLength={2} placeholder="MM" name="declMonth" value={form.declMonth} onChange={(e) => setForm({ ...form, declMonth: e.target.value })} />/
              <input type="text" maxLength={4} placeholder="YYYY" style={{ width: "44px" }} name="declYear" value={form.declYear} onChange={(e) => setForm({ ...form, declYear: e.target.value })} />
            </span>
          </div>
        </div>

        <div className="top-info">
          <p>
            To,<br />
            The Board of Directors,<br />
            <b>NIVENTRA CAPITAL ADVISORY INDIA PVT LTD</b>
          </p>
          <p>
            I/We hereby apply for the allotment of Secured, Rated, Listed/Unlisted, Redeemable, Non-Convertible Debentures of
            your Company on the terms and conditions as mentioned in the Information Memorandum / Debenture Trust Deed
            and other related documents.
          </p>
        </div>

        {/* Employee Referral Code Info */}
        <div style={{ margin: "10px 24px", padding: "8px 14px", background: "#fbf6e8", border: "1px solid #c9972f", fontSize: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: 600, color: "#0c1c3d" }}>
            <UserCheck className="inline-block w-4 h-4 mr-1 text-[#0c1c3d]" /> Submitting via Employee / Agent Referral Code:
          </span>
          <input
            type="text"
            disabled
            value={form.refEmpCode}
            style={{ width: "160px", fontWeight: "bold", textTransform: "uppercase" }}
          />
        </div>

        {error && (
          <div style={{ margin: "10px 24px", padding: "10px", background: "#fdecea", border: "1px solid #f3b9b0", color: "#b3261e", fontSize: "13px", fontWeight: "bold" }}>
            ⚠️ {error}
          </div>
        )}

        {/* SECTION 1 */}
        <div className="section-header">1. INVESTOR DETAILS</div>
        <div className="box">
          <div className="field-row">
            <div className="field-icon">&#128100;</div>
            <div className="field-label">Full Name (Applicant)</div>
            <div className="field-colon">:</div>
            <div className="field-fill">
              <input
                type="text"
                name="fullName"
                required
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              />
            </div>
          </div>
          <div className="field-row">
            <div className="field-icon">&#128100;</div>
            <div className="field-label">Father's / Spouse Name</div>
            <div className="field-colon">:</div>
            <div className="field-fill">
              <input
                type="text"
                name="parentSpouseName"
                value={form.fatherSpouseName}
                onChange={(e) => setForm({ ...form, fatherSpouseName: e.target.value })}
              />
            </div>
          </div>
          <div className="field-row">
            <div className="field-icon">&#128197;</div>
            <div className="field-label">Date of Birth / Incorporation</div>
            <div className="field-colon">:</div>
            <div className="field-fill" style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
              <input
                type="date"
                name="dob"
                style={{ width: "150px" }}
                value={form.dob}
                onChange={(e) => setForm({ ...form, dob: e.target.value })}
              />
              <span style={{ marginLeft: "10px", whiteSpace: "nowrap" }}>PAN No. &nbsp;:</span>
              <div className="pan-boxes">
                <input
                  type="text"
                  name="panNumber"
                  maxLength={10}
                  style={{ width: "140px", letterSpacing: "3px", fontWeight: "bold", textTransform: "uppercase", textAlign: "center" }}
                  value={form.panNumber}
                  onChange={(e) => setForm({ ...form, panNumber: e.target.value.toUpperCase() })}
                  placeholder="PAN NO."
                />
              </div>
            </div>
          </div>
          <div className="field-row">
            <div className="field-icon">&#128205;</div>
            <div className="field-label">Address</div>
            <div className="field-colon">:</div>
            <div className="field-fill">
              <input
                type="text"
                name="address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
          </div>
          <div className="field-row">
            <div className="field-icon">&#127970;</div>
            <div className="field-label">City</div>
            <div className="field-colon">:</div>
            <div className="field-fill" style={{ maxWidth: "180px" }}>
              <input
                type="text"
                name="city"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </div>
            <div style={{ width: "50px", textAlign: "center" }}>State</div>
            <div style={{ width: "10px" }}>:</div>
            <div className="field-fill" style={{ maxWidth: "150px" }}>
              <input
                type="text"
                name="state"
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
              />
            </div>
            <div style={{ width: "70px", textAlign: "right" }}>PIN Code</div>
            <div style={{ width: "10px", textAlign: "center" }}>:</div>
            <div className="pin-boxes">
              <input
                type="text"
                name="pinCode"
                maxLength={6}
                style={{ width: "80px", letterSpacing: "2px", fontWeight: "bold", textAlign: "center" }}
                value={form.pinCode}
                onChange={(e) => setForm({ ...form, pinCode: e.target.value })}
                placeholder="PIN"
              />
            </div>
          </div>
          <div className="field-row">
            <div className="field-icon">&#128241;</div>
            <div className="field-label">Mobile No.</div>
            <div className="field-colon">:</div>
            <div className="field-fill" style={{ maxWidth: "220px" }}>
              <input
                type="tel"
                name="mobile"
                pattern="[0-9]{10}"
                maxLength={10}
                required
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div style={{ width: "70px", textAlign: "right" }}>Email ID</div>
            <div style={{ width: "10px" }}>:</div>
            <div className="field-fill">
              <input
                type="email"
                name="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
          </div>
          <div className="field-row">
            <div className="field-icon">&#128188;</div>
            <div className="field-label">Occupation / Nature of Business</div>
            <div className="field-colon">:</div>
            <div className="field-fill">
              <input
                type="text"
                name="occupation"
                value={form.occupation}
                onChange={(e) => setForm({ ...form, occupation: e.target.value })}
              />
            </div>
          </div>
          <div className="field-row">
            <div className="field-icon">&#127974;</div>
            <div className="field-label">Bank Name</div>
            <div className="field-colon">:</div>
            <div className="field-fill">
              <input
                type="text"
                name="bankName"
                value={form.bankName}
                onChange={(e) => setForm({ ...form, bankName: e.target.value })}
              />
            </div>
          </div>
          <div className="field-row">
            <div className="field-icon">&#128179;</div>
            <div className="field-label">Account No.</div>
            <div className="field-colon">:</div>
            <div className="field-fill">
              <input
                type="text"
                name="accountNo"
                value={form.accountNo}
                onChange={(e) => setForm({ ...form, accountNo: e.target.value })}
              />
            </div>
          </div>
          <div className="field-row">
            <div className="field-icon">&#128179;</div>
            <div className="field-label">IFSC Code</div>
            <div className="field-colon">:</div>
            <div className="field-fill">
              <input
                type="text"
                name="ifscCode"
                value={form.ifscCode}
                onChange={(e) => setForm({ ...form, ifscCode: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* SECTION 2 */}
        <div className="section-header">2. INVESTMENT DETAILS</div>
        <div className="box">
          <div className="field-row">
            <div className="field-label" style={{ width: "170px" }}>Type of Debenture</div>
            <div className="field-colon">:</div>
            <div className="checkbox-group">
              <label>
                <input
                  type="checkbox"
                  name="typeSecured"
                  checked={form.typeSecured}
                  onChange={(e) => setForm({ ...form, typeSecured: e.target.checked })}
                />
                Secured
              </label>
              <label>
                <input
                  type="checkbox"
                  name="typeNonConvertible"
                  checked={form.typeNonConvertible}
                  onChange={(e) => setForm({ ...form, typeNonConvertible: e.target.checked })}
                />
                Non-Convertible
              </label>
              <label>
                <input
                  type="checkbox"
                  name="typeRedeemable"
                  checked={form.typeRedeemable}
                  onChange={(e) => setForm({ ...form, typeRedeemable: e.target.checked })}
                />
                Redeemable
              </label>
            </div>
          </div>
          <div className="field-row">
            <div className="field-label" style={{ width: "170px" }}>Face Value (Per Debenture)</div>
            <div className="field-colon">:</div>
            <div className="field-fill">
              &#8377;{" "}
              <input
                type="number"
                name="faceValue"
                style={{ width: "200px", display: "inline-block" }}
                min="0"
                value={form.faceValue}
                onChange={(e) => handleDebentureCalc(form.noOfDebentures, Number(e.target.value))}
              />
            </div>
          </div>
          <div className="field-row">
            <div className="field-label" style={{ width: "170px" }}>No. of Debentures Applied</div>
            <div className="field-colon">:</div>
            <div className="field-fill" style={{ display: "flex", gap: "20px", alignItems: "center" }}>
              <input
                type="number"
                name="numDebenturesFigures"
                style={{ maxWidth: "150px" }}
                min="0"
                value={form.noOfDebentures}
                onChange={(e) => handleDebentureCalc(Number(e.target.value), form.faceValue)}
              />
              <small className="faded">(In Figures)</small>
              <input
                type="text"
                name="numDebenturesWords"
                value={form.numDebenturesWords}
                readOnly
              />
              <small className="faded">(In Words)</small>
            </div>
          </div>
          <div className="field-row">
            <div className="field-label" style={{ width: "170px" }}>Total Application Amount</div>
            <div className="field-colon">:</div>
            <div className="field-fill" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              &#8377;{" "}
              <input
                type="number"
                name="totalAmount"
                style={{ maxWidth: "150px", fontWeight: "bold" }}
                min="0"
                value={form.totalApplicationAmount}
                readOnly
              />
              <small className="faded">(In Figures)</small>
              <input
                type="text"
                name="totalAmountWords"
                placeholder="Rupees One Thousand Only"
                value={form.totalApplicationAmountWords}
                readOnly
              />
              <small className="faded">(In Words)</small>
            </div>
          </div>
          <div className="field-row">
            <div className="field-label" style={{ width: "170px" }}>Mode of Payment</div>
            <div className="field-colon">:</div>
            <div className="checkbox-group">
              <label>
                <input
                  type="radio"
                  name="paymentMode"
                  value="NEFT/RTGS"
                  checked={form.modeOfPayment === "NEFT/RTGS"}
                  onChange={(e) => setForm({ ...form, modeOfPayment: e.target.value })}
                />
                NEFT / RTGS
              </label>
              <label>
                <input
                  type="radio"
                  name="paymentMode"
                  value="Cheque"
                  checked={form.modeOfPayment === "Cheque"}
                  onChange={(e) => setForm({ ...form, modeOfPayment: e.target.value })}
                />
                Cheque
              </label>
              <label>
                <input
                  type="radio"
                  name="paymentMode"
                  value="DD"
                  checked={form.modeOfPayment === "DD"}
                  onChange={(e) => setForm({ ...form, modeOfPayment: e.target.value })}
                />
                DD
              </label>
              <label>
                <input
                  type="radio"
                  name="paymentMode"
                  value="Other"
                  checked={form.modeOfPayment === "Other"}
                  onChange={(e) => setForm({ ...form, modeOfPayment: e.target.value })}
                />
                Other{" "}
                <input
                  type="text"
                  name="paymentModeOther"
                  style={{ width: "70px" }}
                  value={form.paymentModeOther}
                  onChange={(e) => setForm({ ...form, paymentModeOther: e.target.value })}
                />
              </label>
            </div>
          </div>
          <div className="field-row">
            <div className="field-label" style={{ width: "170px" }}>Bank Name</div>
            <div className="field-colon">:</div>
            <div className="field-fill" style={{ maxWidth: "220px" }}>
              <input
                type="text"
                name="bankName"
                value={form.bankName}
                onChange={(e) => setForm({ ...form, bankName: e.target.value })}
              />
            </div>
            <div style={{ width: "150px", textAlign: "right" }}>Transaction / UTR No.</div>
            <div style={{ width: "10px" }}>:</div>
            <div className="field-fill">
              <input
                type="text"
                name="utrNo"
                value={form.transactionUtrNo}
                onChange={(e) => setForm({ ...form, transactionUtrNo: e.target.value })}
              />
            </div>
          </div>
          <div className="field-row">
            <div className="field-label" style={{ width: "170px" }}>Cheque / DD No.</div>
            <div className="field-colon">:</div>
            <div className="field-fill" style={{ maxWidth: "180px" }}>
              <input
                type="text"
                name="chequeDdNo"
                value={form.chequeDdNo}
                onChange={(e) => setForm({ ...form, chequeDdNo: e.target.value })}
              />
            </div>
            <div style={{ width: "50px", textAlign: "right" }}>Date</div>
            <div style={{ width: "10px" }}>:</div>
            <div className="field-fill" style={{ maxWidth: "140px" }}>
              <input
                type="date"
                name="chequeDate"
                value={form.chequeDdDate}
                onChange={(e) => setForm({ ...form, chequeDdDate: e.target.value })}
              />
            </div>
            <div style={{ width: "100px", textAlign: "right" }}>Drawn On Bank</div>
            <div style={{ width: "10px" }}>:</div>
            <div className="field-fill">
              <input
                type="text"
                name="drawnOnBank"
                value={form.drawnOnBank}
                onChange={(e) => setForm({ ...form, drawnOnBank: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* SECTION 3 */}
        <div className="section-header">3. DECLARATION</div>
        <div className="box">
          <div className="decl-flex">
            <div className="left decl-text">
              I/We hereby declare and confirm that:
              <ol>
                <li>I/We have read and understood the terms and conditions of the Information Memorandum, Debenture Trust Deed and related documents.</li>
                <li>The information provided by me/us in this application is true, correct and complete.</li>
                <li>I/We agree to be bound by the terms and conditions governing the issue of Secured Debentures.</li>
                <li>I/We authorize the Company to verify any or all of the above information, as it may deem fit.</li>
              </ol>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="photo-box" id="photoBox">
                {form.passportPhotoUrl ? (
                  <img src={form.passportPhotoUrl} alt="Passport Photo" />
                ) : (
                  <span id="photoPlaceholder">
                    Affix<br />Recent Passport<br />Size Photograph
                  </span>
                )}
              </div>

              {/* Action Buttons for Upload & Live Capture */}
              <div className="flex flex-col gap-1.5 w-[130px]">
                <label
                  htmlFor="photoInput"
                  className="cursor-pointer text-[11px] font-bold text-center py-1 px-2 rounded bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 text-zinc-800 transition-colors"
                >
                  📁 Upload Photo
                </label>
                <input
                  type="file"
                  accept="image/*"
                  id="photoInput"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e, "passportPhotoUrl")}
                />

                <button
                  type="button"
                  onClick={startCamera}
                  className="text-[11px] font-bold text-center py-1 px-2 rounded bg-[#0c1c3d] text-white hover:bg-[#132a5c] transition-colors"
                >
                  📷 Live Capture
                </button>

                {form.passportPhotoUrl && (
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, passportPhotoUrl: "" }))}
                    className="text-[10px] text-rose-600 hover:underline text-center"
                  >
                    Remove Photo
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="sign-line">
            <div>
              Place :{" "}
              <input
                type="text"
                name="place"
                value={form.place}
                onChange={(e) => setForm({ ...form, place: e.target.value })}
              />
            </div>
            <div className="sig-pad-wrap">
              <canvas className="sig-pad" ref={canvasRef} width={220} height={60}></canvas>
              <div style={{ fontWeight: 600, marginTop: "2px" }}>Signature of Applicant</div>
              <div className="flex items-center justify-center gap-2 mt-1">
                <button type="button" className="sig-clear" onClick={clearSignature}>
                  Clear signature
                </button>
                <button
                  type="button"
                  onClick={startQrSignature}
                  className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors"
                >
                  <QrCode className="w-3 h-3 mr-1" /> Sign via Mobile QR
                </button>
              </div>
            </div>
          </div>
          <div style={{ fontSize: "12px", marginTop: "10px" }}>
            Date :
            <span className="date-trio">
              <input type="text" maxLength={2} placeholder="DD" name="declDay" value={form.declDay} onChange={(e) => setForm({ ...form, declDay: e.target.value })} />/
              <input type="text" maxLength={2} placeholder="MM" name="declMonth" value={form.declMonth} onChange={(e) => setForm({ ...form, declMonth: e.target.value })} />/
              <input type="text" maxLength={4} placeholder="YYYY" style={{ width: "44px" }} name="declYear" value={form.declYear} onChange={(e) => setForm({ ...form, declYear: e.target.value })} />
            </span>
          </div>
        </div>

        {/* SECTION 4 */}
        <div className="section-header">4. DOCUMENTS TO BE ENCLOSED (SELF ATTESTED)</div>
        <div className="box">
          <div className="docs-grid">
            <div className="col">
              <label>
                <input type="checkbox" name="docPan" defaultChecked /> 1. PAN Card Copy
              </label>
              <label>
                <input type="checkbox" name="docAddress" defaultChecked /> 2. Address Proof (Aadhaar / Voter ID / Passport / Driving Licence)
              </label>
              <label>
                <input type="checkbox" name="docIdentity" defaultChecked /> 3. Identity Proof (Aadhaar / Passport / Driving Licence)
              </label>
            </div>
            <div className="col">
              <label>
                <input type="checkbox" name="docPhoto" defaultChecked /> 4. Photograph
              </label>
              <label>
                <input type="checkbox" name="docCheque" /> 5. Cancelled Cheque / Bank Details Proof
              </label>
              <label>
                <input type="checkbox" name="docOther" /> 6. Other (if applicable) <input type="text" name="docOtherText" style={{ width: "110px" }} />
              </label>
            </div>
          </div>

          <div style={{ marginTop: "12px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
            <div style={{ border: "1px dashed #c9972f", padding: "8px", background: "#fffef9" }}>
              <span style={{ fontSize: "11px", fontWeight: "bold", display: "block", color: "#8a6d1f" }}>Attach PAN Card</span>
              <input type="file" accept=".pdf,image/*" style={{ fontSize: "11px" }} onChange={(e) => handleFileUpload(e, "panDocUrl")} />
              {form.panDocUrl && <span style={{ fontSize: "11px", color: "#0c1c3d", fontWeight: "bold" }}>✔ Attached</span>}
            </div>
            <div style={{ border: "1px dashed #c9972f", padding: "8px", background: "#fffef9" }}>
              <span style={{ fontSize: "11px", fontWeight: "bold", display: "block", color: "#8a6d1f" }}>Attach Aadhaar Card</span>
              <input type="file" accept=".pdf,image/*" style={{ fontSize: "11px" }} onChange={(e) => handleFileUpload(e, "aadharDocUrl")} />
              {form.aadharDocUrl && <span style={{ fontSize: "11px", color: "#0c1c3d", fontWeight: "bold" }}>✔ Attached</span>}
            </div>
            <div style={{ border: "1px dashed #c9972f", padding: "8px", background: "#fffef9" }}>
              <span style={{ fontSize: "11px", fontWeight: "bold", display: "block", color: "#8a6d1f" }}>Attach Bank Proof / Passbook</span>
              <input type="file" accept=".pdf,image/*" style={{ fontSize: "11px" }} onChange={(e) => handleFileUpload(e, "bankPassbookUrl")} />
              {form.bankPassbookUrl && <span style={{ fontSize: "11px", color: "#0c1c3d", fontWeight: "bold" }}>✔ Attached</span>}
            </div>
          </div>
        </div>

        {/* OFFICE USE */}
        <div className="office-wrap">
          <div className="office-col">
            <div className="office-title">FOR OFFICE USE ONLY</div>
            <div className="row">
              <span className="lbl">Application Received On</span>: <input type="date" name="officeReceivedOn" />
            </div>
            <div className="row">
              <span className="lbl">Received By</span>: <input type="text" name="officeReceivedBy" />
            </div>
            <div className="row">
              <span className="lbl">Amount Received</span>: &#8377; <input type="number" name="officeAmountReceived" />
            </div>
            <div className="row">
              <span className="lbl">Payment Mode</span>: <input type="text" name="officePaymentMode" />
            </div>
            <div className="row">
              <span className="lbl">Remark</span>: <input type="text" name="officeRemark" />
            </div>
            <div className="row">
              <span className="lbl">Application Status</span>:
              <label>
                <input type="radio" name="officeStatus" value="Accepted" /> Accepted
              </label>
              <label>
                <input type="radio" name="officeStatus" value="Rejected" /> Rejected
              </label>
            </div>
            <div className="row">
              <span className="lbl">Allotted Debenture No.</span>: <input type="text" name="officeAllottedNo" />
            </div>
          </div>
          <div className="office-col">
            <div className="office-title">VERIFIED BY</div>
            <div className="row">
              <span className="lbl">Name</span>: <input type="text" name="verifiedName" />
            </div>
            <div className="row">
              <span className="lbl">Designation</span>: <input type="text" name="verifiedDesignation" />
            </div>
            <div className="row">
              <span className="lbl">Sign &amp; Date</span>: <input type="text" name="verifiedSignDate" />
            </div>
          </div>
          <div className="office-col">
            <div className="office-title">APPROVED BY</div>
            <div className="row">
              <span className="lbl">Name</span>: <input type="text" name="approvedName" />
            </div>
            <div className="row">
              <span className="lbl">Designation</span>: <input type="text" name="approvedDesignation" />
            </div>
            <div className="row">
              <span className="lbl">Sign &amp; Date</span>: <input type="text" name="approvedSignDate" />
            </div>
            <div style={{ marginTop: "6px", fontWeight: 700 }}>For NIVENTRA CAPITAL ADVISORY INDIA PVT LTD</div>
            <div className="sign-name">Ram Mohan Sharma</div>
            <div style={{ fontSize: "10.5px" }}>
              Ram Mohan Sharma<br />Authorized Signatory
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <div className="stamp">
                <img
                  src="/company-seal.jpg"
                  alt="Company Logo"
                  style={{ width: "100%", height: "100%", objectFit: "contain", padding: "3px", borderRadius: "50%", background: "#fff" }}
                  onError={(e) => { (e.target as HTMLElement).style.display = "none"; }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Hidden button for form submission trigger */}
        <button type="submit" style={{ display: "none" }} id="hiddenSubmitBtn" />
      </form>

      {/* ACTION BAR */}
      <div className="action-bar">
        <button
          type="button"
          id="resetBtn"
          onClick={() => {
            setForm((prev) => ({
              ...prev,
              fullName: "",
              fatherSpouseName: "",
              dob: "",
              address: "",
              city: "",
              state: "",
              pinCode: "",
              panNumber: "",
              phone: "",
              email: "",
              occupation: "",
              faceValue: 1000,
              noOfDebentures: 1,
              totalApplicationAmount: 1000,
              totalApplicationAmountWords: "One Thousand Only",
              chequeDdNo: "",
              chequeDdDate: "",
              transactionUtrNo: "",
              drawnOnBank: "",
              bankName: "",
              passportPhotoUrl: "",
              panDocUrl: "",
              aadharDocUrl: "",
              bankPassbookUrl: "",
              place: "",
            }));
            clearSignature();
            setError(null);
          }}
        >
          Reset Form
        </button>

        {/* <button type="button" id="printBtn" onClick={() => window.print()}>
          Print / Save as PDF
        </button> */}

        <button
          type="button"
          id="submitBtn"
          disabled={loading}
          onClick={(e) => {
            const hiddenBtn = document.getElementById("hiddenSubmitBtn");
            if (hiddenBtn) hiddenBtn.click();
          }}
        >
          {loading ? "Submitting..." : "Submit"}
        </button>
      </div>

      <div id="statusMsg">{loading && "Submitting application, please wait..."}</div>

      {/* Live Camera Modal Popup */}
      {cameraActive && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-sm w-full max-h-[90vh] flex flex-col overflow-hidden border-2 border-[#0c1c3d] shadow-2xl">
            <div className="flex justify-between items-center border-b pb-2 px-5 pt-5 shrink-0">
              <h3 className="font-bold text-sm text-[#0c1c3d] flex items-center gap-1.5">
                📷 Live Passport Photo Capture
              </h3>
              <button
                type="button"
                onClick={stopCamera}
                className="text-zinc-500 hover:text-black font-bold text-sm px-2 py-0.5 rounded hover:bg-zinc-100"
              >
                ✖
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-5 space-y-4">

            <div className="relative w-full aspect-square bg-zinc-900 rounded-lg overflow-hidden border-2 border-[#c9972f] flex items-center justify-center">
              {cameraLoading && <span className="text-white text-xs">Accessing Camera...</span>}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            </div>

            <p className="text-[11px] text-zinc-500">Align your face inside the square frame and click Capture.</p>

            <div className="flex justify-center space-x-3 pt-1">
              <button
                type="button"
                onClick={stopCamera}
                className="px-4 py-2 text-xs font-bold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={captureSnapshot}
                className="px-5 py-2 text-xs font-bold text-white bg-[#0c1c3d] hover:bg-[#132a5c] rounded shadow flex items-center gap-1.5"
              >
                📸 Take Photo
              </button>
            </div>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Signature Scanner Modal */}
      {showQrModal && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full max-h-[90vh] flex flex-col overflow-hidden border-2 border-[#0c1c3d] shadow-2xl">
            <div className="flex justify-between items-center border-b pb-3 px-6 pt-6 shrink-0">
              <h3 className="font-bold text-sm text-[#0c1c3d] flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-amber-500" /> Scan QR to Sign on Phone
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowQrModal(false);
                  setPollingQr(false);
                }}
                className="text-zinc-500 hover:text-black font-bold text-sm px-2 py-0.5 rounded hover:bg-zinc-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-6 space-y-4">

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col items-center justify-center space-y-3">
              {qrUrl ? (
                <div className="p-3 bg-white rounded-lg shadow-sm border border-slate-200">
                  <QRCodeSVG value={qrUrl} size={180} level="M" />
                </div>
              ) : (
                <div className="h-[180px] flex items-center justify-center text-xs text-zinc-400">
                  Generating QR Code...
                </div>
              )}

              <div className="flex items-center text-xs font-semibold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                <RefreshCw className="w-3 h-3 mr-1.5 animate-spin" /> Waiting for mobile signature...
              </div>
            </div>

            <p className="text-[11px] text-zinc-500 leading-snug">
              Point your smartphone camera at this QR code. Draw your signature on your phone screen and tap Submit.
            </p>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                readOnly
                value={qrUrl}
                className="text-[10px] flex-1 bg-zinc-100 border border-zinc-300 rounded px-2 py-1 truncate text-zinc-600"
              />
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(qrUrl);
                  setCopiedLink(true);
                  setTimeout(() => setCopiedLink(false), 2000);
                }}
                className="px-2.5 py-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded hover:bg-indigo-100 flex items-center gap-1"
              >
                {copiedLink ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                {copiedLink ? "Copied" : "Copy Link"}
              </button>
            </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DebentureApplicationPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading Debenture Application Form...</div>}>
      <DebentureFormContent />
    </Suspense>
  );
}
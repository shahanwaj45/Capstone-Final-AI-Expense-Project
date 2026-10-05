import { useEffect, useState, useRef } from "react";
import { Link } from "wouter";
import {
  ReceiptIndianRupee,
  Upload,
  Camera,
  CameraOff,
  SwitchCamera,
  FileCheck,
  Check,
  X,
  Loader,
  FileText,
  ArrowRight,
  Eye,
  RefreshCw,
  Sparkles,
  Zap,
  Maximize2,
  AlertCircle,
  ScanLine
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/auth/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import FeaturePageHeader from "@/components/dashboard/FeaturePageHeader";
import { studentNav } from "@/data/studentData";
import { professionalNav } from "@/data/professionalData";
import api from "@/lib/api";

const CATEGORIES = [
  "Food",
  "Travel",
  "Education",
  "Entertainment",
  "Bills",
  "Health",
  "Shopping",
  "Subscription",
  "Other"
];

export default function ReceiptScanner() {
  const { role } = useAuth();
  const currentRole = role === "professional" ? "professional" : "student";
  const navItems = currentRole === "professional" ? professionalNav : studentNav;

  // Active input mode: 'camera' | 'upload'
  const [activeTab, setActiveTab] = useState<"camera" | "upload">("camera");

  // Camera stream state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [cameraStarting, setCameraStarting] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);

  // Captured / Selected image state
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [uploadSource, setUploadSource] = useState<"camera" | "upload">("camera");

  // Form & Scanning state
  const [extracted, setExtracted] = useState<any>(null);
  const [useToday, setUseToday] = useState(true);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);

  // Recent scans & Lightbox modal
  const [recentScans, setRecentScans] = useState<any[]>([]);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; name: string; amount?: string; date?: string; category?: string } | null>(null);

  // DOM Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mobileCameraInputRef = useRef<HTMLInputElement>(null);

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, []);

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const startCamera = async (mode: "environment" | "user" = facingMode) => {
    setCameraError(null);
    setCameraStarting(true);
    stopCameraStream();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API is not supported by your browser. Please use the upload or device camera option.");
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsCameraActive(true);
      setFacingMode(mode);
    } catch (err: any) {
      console.error("Camera access error:", err);
      let msg = "Could not access camera. Please check your camera permissions.";
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        msg = "Camera permission denied. Please allow camera access in your browser settings.";
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        msg = "No camera found on this device. You can choose a photo from your files.";
      } else if (err.message) {
        msg = err.message;
      }
      setCameraError(msg);
      setIsCameraActive(false);
    } finally {
      setCameraStarting(false);
    }
  };

  const switchCamera = () => {
    const newMode = facingMode === "environment" ? "user" : "environment";
    startCamera(newMode);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    // Flash animation effect
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 350);

    const canvas = canvasRef.current || document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Draw full resolution frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          toast.error("Failed to capture image snapshot. Please try again.");
          return;
        }

        const preview = URL.createObjectURL(blob);
        const name = `camera_receipt_${Date.now()}.jpg`;

        setCapturedBlob(blob);
        setCapturedPreview(preview);
        setFileName(name);
        setUploadSource("camera");

        // Stop camera tracks once captured
        stopCameraStream();

        toast.success("Photo captured! Ready for AI analysis.");
      },
      "image/jpeg",
      0.92
    );
  };

  const retakePhoto = () => {
    if (capturedPreview) {
      URL.revokeObjectURL(capturedPreview);
    }
    setCapturedBlob(null);
    setCapturedPreview(null);
    setFileName("");
    setExtracted(null);
    setReceiptUrl(null);
    startCamera(facingMode);
  };

  const handleMobileCameraFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file, "camera");
    }
  };

  const loadRecentScans = async () => {
    try {
      const res = await api.get("/receipts/recent", { params: { limit: 8 } });
      if (res.data?.success && Array.isArray(res.data.data?.items)) {
        setRecentScans(res.data.data.items);
      }
    } catch {
      api.get("/transactions", { params: { search: "receipt", limit: 8, sort_by: "created_at" } })
        .then((res) => {
          if (res.data?.success) setRecentScans(res.data.data.items);
        })
        .catch(() => {});
    }
  };

  useEffect(() => {
    loadRecentScans();
  }, []);

  const handleFile = async (file: File | Blob, source: "camera" | "upload" = "upload", autoSaveOverride?: boolean) => {
    if (!file) return;

    const shouldAutoSave = autoSaveOverride !== undefined ? autoSaveOverride : autoSaveEnabled;
    const isFileInstance = file instanceof File;
    const name = isFileInstance ? file.name : (fileName || `camera_receipt_${Date.now()}.jpg`);
    const isPdf = isFileInstance && (file.type === "application/pdf" || name.toLowerCase().endsWith(".pdf"));
    const isImage = file.type.startsWith("image/") || /\.(png|jpe?g|webp|gif)$/i.test(name);

    if (!isPdf && !isImage) {
      toast.error("Invalid file type. Please upload a PNG, JPG, WEBP, GIF, or PDF document.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File is too large. Maximum supported size is 10MB.");
      return;
    }

    try {
      setScanning(true);
      setFileName(name);
      setUploadSource(source);

      // Create preview if not already created
      if (!capturedPreview && isImage) {
        const previewUrl = URL.createObjectURL(file);
        setCapturedPreview(previewUrl);
      }

      const formData = new FormData();
      formData.append("file", file, name);
      formData.append("source", source);
      formData.append("auto_save", shouldAutoSave ? "true" : "false");
      formData.append("use_today", useToday ? "true" : "false");

      const res = await api.post("/receipts/scan", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data?.success) {
        const data = res.data.data;
        const parsed = data.extracted || {};
        setExtracted(parsed);
        if (data.receipt_url) {
          setReceiptUrl(data.receipt_url);
        }

        if (data.saved && data.transaction) {
          // Immediately prepend to recent scans
          setRecentScans((prev) => [data.transaction, ...prev.filter((item) => item.id !== data.transaction.id).slice(0, 7)]);
          toast.success(
            `Receipt analyzed & saved! ${data.transaction.name} (${data.transaction.amount})`,
            { description: "Expense automatically recorded to your database." }
          );
          // Reset captured state after auto-save
          setCapturedBlob(null);
          setCapturedPreview(null);
          setFileName("");
          setExtracted(null);
          loadRecentScans();
        } else {
          toast.success("Receipt analyzed with AI! Please review and confirm the extracted details.");
        }
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || "Scan failed. Please try again or enter details manually.";
      toast.error(msg);
    } finally {
      setScanning(false);
    }
  };

  const confirmSave = async () => {
    if (!extracted) return;
    const amt = parseFloat(extracted.amount);
    if (!amt || isNaN(amt) || amt <= 0) {
      toast.error("Please enter a valid amount greater than 0.");
      return;
    }

    try {
      setSaving(true);
      const res = await api.post("/receipts/confirm", {
        name: (extracted.merchant || (uploadSource === "camera" ? "Camera receipt" : "Receipt expense")).trim(),
        amount: amt,
        category: extracted.category || "Other",
        date: useToday ? undefined : extracted.date || undefined,
        use_today: useToday,
        receipt_url: receiptUrl || undefined,
        source: uploadSource,
        notes: `${uploadSource === "camera" ? "Camera receipt scan" : "Scanned receipt"}: ${extracted.merchant || "Receipt"}`,
      });

      toast.success("Receipt expense saved into database!");

      if (res.data?.data) {
        setRecentScans((prev) => [res.data.data, ...prev.filter((item) => item.id !== res.data.data.id).slice(0, 7)]);
      }

      setExtracted(null);
      setFileName("");
      setCapturedBlob(null);
      setCapturedPreview(null);
      setReceiptUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      loadRecentScans();
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || "Failed to save receipt transaction";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file, "upload");
    }
  };

  const transactionsPath = currentRole === "professional" ? "/professional/expenses" : "/student/expenses";

  return (
    <DashboardLayout role={currentRole} navItems={navItems} pageTitle="Receipt Scanner">
      {/* Hidden helper elements */}
      <canvas ref={canvasRef} className="hidden" />
      <input
        ref={mobileCameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleMobileCameraFile}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,application/pdf,.pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f, "upload");
        }}
      />

      <FeaturePageHeader
        role={currentRole}
        title="Smart Receipt & Camera Scanner"
        description="Capture receipt photos directly through your camera or upload documents. Gemini Vision extracts the merchant, amount, date, and category automatically."
        icon={ReceiptIndianRupee}
        accentColor="#e98b68"
        accentBg="#fff5ef"
      />

      <div className="rounded-[26px] bg-white p-6 sm:p-8 shadow-[6px_9px_23px_rgba(42,65,55,.07)]">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#eef3ee] pb-5">
          <div className="flex rounded-2xl bg-[#f0f4f1] p-1.5">
            <button
              type="button"
              onClick={() => {
                setActiveTab("camera");
                if (!isCameraActive && !capturedPreview) {
                  startCamera();
                }
              }}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-[12px] font-bold transition ${
                activeTab === "camera"
                  ? "bg-white text-[#172532] shadow-sm"
                  : "text-[#6c7d75] hover:text-[#172532]"
              }`}
            >
              <Camera size={15} className={activeTab === "camera" ? "text-[#3b8165]" : ""} />
              Take Photo with Camera
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("upload");
                stopCameraStream();
              }}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-[12px] font-bold transition ${
                activeTab === "upload"
                  ? "bg-white text-[#172532] shadow-sm"
                  : "text-[#6c7d75] hover:text-[#172532]"
              }`}
            >
              <Upload size={15} className={activeTab === "upload" ? "text-[#e98b68]" : ""} />
              Upload Image or PDF
            </button>
          </div>

          {/* Auto-save toggle option */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoSaveEnabled}
                onChange={(e) => setAutoSaveEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-[#cde0d7] text-[#3b8165] focus:ring-[#7BE2BE]"
              />
              <span className="text-[12px] font-semibold text-[#5c8272] flex items-center gap-1">
                <Zap size={13} className="text-[#3ea87c]" /> Auto-Save to Database
              </span>
            </label>
          </div>
        </div>

        {/* ── TAB 1: CAMERA SCANNER ── */}
        {activeTab === "camera" && (
          <div className="mt-6">
            {/* Viewfinder or Captured Preview */}
            {!capturedPreview ? (
              <div>
                {!isCameraActive ? (
                  <div className="flex flex-col items-center justify-center rounded-[24px] border-2 border-dashed border-[#d5ddd6] bg-[#f9fbf8] p-10 text-center transition hover:border-[#7BE2BE]">
                    <div className="grid h-16 w-16 place-items-center rounded-2xl bg-[#e7f8ef] text-[#3b8165] shadow-sm">
                      <Camera size={30} />
                    </div>
                    <h3 className="mt-4 font-display text-[19px] font-bold text-[#172532]">
                      Snap a Receipt Photo with Your Camera
                    </h3>
                    <p className="mt-2 max-w-md text-[12px] text-[#788880] leading-relaxed">
                      Grant camera access to use your webcam or mobile camera. Position your receipt flat and well-lit for instant AI OCR analysis.
                    </p>

                    {cameraError && (
                      <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-[12px] text-red-700">
                        <AlertCircle size={16} className="shrink-0" />
                        <span>{cameraError}</span>
                      </div>
                    )}

                    <div className="mt-6 flex flex-wrap gap-3 justify-center">
                      <button
                        type="button"
                        onClick={() => startCamera(facingMode)}
                        disabled={cameraStarting}
                        className="flex items-center gap-2 rounded-xl bg-[#172532] px-6 py-3 text-[13px] font-bold text-white shadow-md transition hover:bg-[#233544] disabled:opacity-50"
                      >
                        {cameraStarting ? (
                          <>
                            <Loader size={15} className="animate-spin text-[#7BE2BE]" /> Starting Camera...
                          </>
                        ) : (
                          <>
                            <Camera size={15} className="text-[#7BE2BE]" /> Open Live Camera
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => mobileCameraInputRef.current?.click()}
                        className="flex items-center gap-2 rounded-xl border border-[#d2ddd5] bg-white px-5 py-3 text-[13px] font-bold text-[#51635a] shadow-sm transition hover:bg-[#f2f7f3]"
                      >
                        <Sparkles size={14} className="text-[#e98b68]" /> Use Device Native Camera
                      </button>
                    </div>
                  </div>
                ) : (
                  /* LIVE CAMERA VIEWFINDER */
                  <div className="relative mx-auto max-w-2xl overflow-hidden rounded-[26px] bg-[#0d161d] shadow-2xl border-4 border-[#172532]">
                    {/* Flash effect overlay */}
                    {isFlashing && (
                      <div className="absolute inset-0 z-30 bg-white animate-camera-flash pointer-events-none" />
                    )}

                    {/* Camera Video Stream */}
                    <div className="relative aspect-4/3 w-full bg-black overflow-hidden flex items-center justify-center">
                      <video
                        ref={videoRef}
                        playsInline
                        muted
                        autoPlay
                        className="h-full w-full object-cover"
                      />

                      {/* Receipt Framing Guide Overlay */}
                      <div className="pointer-events-none absolute inset-6 sm:inset-10 rounded-2xl border-2 border-[#7BE2BE]/60 shadow-[0_0_30px_rgba(123,226,190,0.25)] flex flex-col justify-between p-3">
                        {/* 4 Corner Bracket Accents */}
                        <div className="flex justify-between">
                          <div className="h-6 w-6 border-l-4 border-t-4 border-[#7BE2BE] rounded-tl-sm" />
                          <div className="h-6 w-6 border-r-4 border-t-4 border-[#7BE2BE] rounded-tr-sm" />
                        </div>

                        {/* Animated Laser Scanning Line */}
                        <div className="relative w-full h-1">
                          <div className="absolute w-full h-0.5 bg-gradient-to-r from-transparent via-[#7BE2BE] to-transparent shadow-[0_0_12px_#7BE2BE] animate-scan-laser" />
                        </div>

                        <div className="flex justify-between items-end">
                          <div className="h-6 w-6 border-l-4 border-b-4 border-[#7BE2BE] rounded-bl-sm" />
                          <div className="h-6 w-6 border-r-4 border-b-4 border-[#7BE2BE] rounded-br-sm" />
                        </div>
                      </div>

                      {/* Header status inside video */}
                      <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
                        <div className="flex items-center gap-2 rounded-full bg-black/60 backdrop-blur-md px-3 py-1.5 text-[11px] font-bold text-white">
                          <span className="h-2 w-2 rounded-full bg-[#7BE2BE] animate-ping" />
                          <span>Live Camera Active ({facingMode === "environment" ? "Back" : "Front"})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={switchCamera}
                            className="rounded-full bg-black/60 p-2 text-white hover:bg-black/80 transition"
                            title="Flip camera"
                          >
                            <SwitchCamera size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={stopCameraStream}
                            className="rounded-full bg-black/60 p-2 text-white hover:bg-black/80 transition"
                            title="Close camera"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Bottom Instruction Pill */}
                      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 rounded-full bg-black/70 backdrop-blur-md px-4 py-1.5 text-[11px] font-medium text-[#c0cfc7] pointer-events-none">
                        Align receipt within framing brackets
                      </div>
                    </div>

                    {/* Camera Shutter Bar */}
                    <div className="flex items-center justify-around bg-[#131e27] px-6 py-4">
                      <button
                        type="button"
                        onClick={stopCameraStream}
                        className="flex flex-col items-center text-[10px] font-bold text-[#8ba096] hover:text-white transition"
                      >
                        <CameraOff size={18} className="mb-0.5" />
                        <span>Cancel</span>
                      </button>

                      {/* Big Shutter Button */}
                      <button
                        type="button"
                        onClick={capturePhoto}
                        className="group relative flex h-16 w-16 items-center justify-center rounded-full bg-white p-1 shadow-lg transition active:scale-95 hover:shadow-[0_0_20px_rgba(123,226,190,0.6)]"
                      >
                        <div className="h-full w-full rounded-full border-4 border-[#131e27] bg-[#7BE2BE] group-hover:bg-[#68d7b1] transition flex items-center justify-center">
                          <Camera size={22} className="text-[#131e27]" />
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={switchCamera}
                        className="flex flex-col items-center text-[10px] font-bold text-[#8ba096] hover:text-white transition"
                      >
                        <SwitchCamera size={18} className="mb-0.5" />
                        <span>Flip</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* CAPTURED PHOTO PREVIEW CARD */
              <div className="rounded-[24px] border border-[#dce9e1] bg-[#f9fbf8] p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#e7f8ef] text-[#3b8165]">
                      <Camera size={15} />
                    </span>
                    <div>
                      <h4 className="font-display text-[15px] font-bold text-[#172532]">
                        Photo Captured from Camera
                      </h4>
                      <p className="text-[11px] text-[#7a8c83]">{fileName}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={retakePhoto}
                    disabled={scanning}
                    className="flex items-center gap-1.5 rounded-xl border border-[#d2ddd5] bg-white px-3.5 py-1.5 text-[12px] font-bold text-[#50635a] hover:bg-[#f0f4f1] transition disabled:opacity-50"
                  >
                    <RefreshCw size={13} /> Retake Photo
                  </button>
                </div>

                {/* Photo Display */}
                <div className="relative mx-auto max-h-[420px] max-w-md overflow-hidden rounded-2xl border border-[#d9e5dd] bg-black shadow-md">
                  <img
                    src={capturedPreview}
                    alt="Captured receipt snapshot"
                    className="h-full w-full object-contain max-h-[420px]"
                  />
                  {scanning && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 backdrop-blur-xs text-white">
                      <Loader size={36} className="animate-spin text-[#7BE2BE]" />
                      <p className="mt-3 font-display text-[15px] font-bold">Gemini Vision is analyzing receipt...</p>
                      <p className="mt-1 text-[11px] text-[#b6cec4]">Extracting vendor, amount, date & category</p>
                    </div>
                  )}
                </div>

                {/* Action Buttons for Captured Photo */}
                {!scanning && !extracted && (
                  <div className="mt-6 flex flex-wrap gap-3 justify-center">
                    <button
                      type="button"
                      onClick={() => capturedBlob && handleFile(capturedBlob, "camera", true)}
                      className="flex items-center gap-2 rounded-xl bg-[#172532] px-6 py-3 text-[13px] font-bold text-white shadow-sm transition hover:bg-[#203446] hover:-translate-y-0.5"
                    >
                      <Zap size={16} className="text-[#7BE2BE]" />
                      Analyze & Save to Database Immediately
                    </button>

                    <button
                      type="button"
                      onClick={() => capturedBlob && handleFile(capturedBlob, "camera", false)}
                      className="flex items-center gap-2 rounded-xl border border-[#d2ddd5] bg-white px-5 py-3 text-[13px] font-bold text-[#3d5147] shadow-sm transition hover:bg-[#f0f5f1]"
                    >
                      <ScanLine size={15} className="text-[#e98b68]" />
                      Analyze & Review Details First
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 2: UPLOAD FILE SCANNER ── */}
        {activeTab === "upload" && (
          <div className="mt-6">
            <div
              className="flex flex-col items-center justify-center rounded-[20px] border-2 border-dashed border-[#d5ddd6] bg-[#f9fbf8] p-10 transition hover:border-[#7BE2BE] hover:bg-[#f0f8f3] cursor-pointer"
              onDrop={onDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="grid h-16 w-16 place-items-center rounded-[20px] bg-[#fff0eb]">
                {scanning ? (
                  <Loader size={28} className="animate-spin text-[#e98b68]" />
                ) : (
                  <Upload size={28} className="text-[#e98b68]" />
                )}
              </div>
              <p className="mt-4 font-display text-[18px] font-bold tracking-[-.04em]">
                {scanning ? "Scanning document with Gemini AI..." : "Upload receipt image or PDF invoice"}
              </p>
              <p className="mt-2 max-w-sm text-center text-[12px] leading-5 text-[#82908a]">
                Drag and drop your receipt image (PNG, JPG, WEBP) or PDF invoice here, or click to browse.
              </p>
              {!scanning && (
                <div className="mt-5 flex gap-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="flex items-center gap-2 rounded-xl bg-[#172532] px-5 py-2.5 text-[12px] font-bold text-white shadow-sm transition hover:-translate-y-0.5"
                  >
                    <Upload size={14} className="text-[#7BE2BE]" /> Choose File / Document
                  </button>
                </div>
              )}
              {fileName && !scanning && (
                <p className="mt-3 text-[11px] font-medium text-[#5c8272] flex items-center gap-1.5">
                  <FileText size={13} /> {fileName}
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── EXTRACTED RESULT (Review & Edit Form) ── */}
        {extracted && (
          <div className="mt-6 rounded-[22px] border border-[#d5f0e6] bg-[#f2faf6] p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#3b8165] text-white">
                  <Check size={14} />
                </span>
                <p className="text-[12px] font-bold uppercase tracking-[.1em] text-[#2b7256]">
                  Extracted Details (Review & Edit)
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[#2b7256] bg-[#dcf4ea] px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                  <Sparkles size={11} /> AI Auto-Detected
                </span>
                {uploadSource === "camera" && (
                  <span className="text-[11px] text-[#e98b68] bg-[#fff0eb] px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                    <Camera size={11} /> Camera Capture
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-[#5c8272] mb-1">
                  Merchant / Vendor
                </label>
                <input
                  type="text"
                  value={extracted.merchant || ""}
                  onChange={(e) => setExtracted({ ...extracted, merchant: e.target.value })}
                  placeholder="e.g. Starbucks, Uber, Amazon"
                  className="w-full rounded-xl border border-[#d2e4db] bg-white px-3.5 py-2.5 text-[13px] font-semibold text-[#172532] focus:border-[#4caf89] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#5c8272] mb-1">
                  Total Amount (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={extracted.amount ?? ""}
                  onChange={(e) => setExtracted({ ...extracted, amount: e.target.value })}
                  placeholder="e.g. 250.00"
                  className="w-full rounded-xl border border-[#d2e4db] bg-white px-3.5 py-2.5 text-[13px] font-bold text-[#172532] focus:border-[#4caf89] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#5c8272] mb-1">
                  Receipt Date
                </label>
                <input
                  type="date"
                  value={extracted.date || ""}
                  disabled={useToday}
                  onChange={(e) => setExtracted({ ...extracted, date: e.target.value })}
                  className="w-full rounded-xl border border-[#d2e4db] bg-white px-3.5 py-2.5 text-[13px] text-[#172532] focus:border-[#4caf89] focus:outline-none disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#5c8272] mb-1">
                  Category
                </label>
                <select
                  value={extracted.category || "Other"}
                  onChange={(e) => setExtracted({ ...extracted, category: e.target.value })}
                  className="w-full rounded-xl border border-[#d2e4db] bg-white px-3.5 py-2.5 text-[13px] font-medium text-[#172532] focus:border-[#4caf89] focus:outline-none"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Save date option */}
            <div className="mt-3 flex items-center gap-2">
              <input
                type="checkbox"
                id="useTodayToggle"
                checked={useToday}
                onChange={(e) => setUseToday(e.target.checked)}
                className="h-4 w-4 rounded border-[#d2e4db] text-[#3b8165] focus:ring-[#7BE2BE]"
              />
              <label htmlFor="useTodayToggle" className="text-[12px] font-medium text-[#5c8272] cursor-pointer">
                Save with today's date so it immediately updates your current month's budget & dashboard
              </label>
            </div>

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={confirmSave}
                disabled={saving || !extracted.amount}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#172532] py-3 text-[12px] font-bold text-white shadow-sm transition hover:bg-[#203446] disabled:opacity-50"
              >
                <Check size={15} className="text-[#7BE2BE]" />
                {saving ? "Saving to Database..." : "Confirm & Save into Database"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setExtracted(null);
                  setFileName("");
                  setCapturedBlob(null);
                  setCapturedPreview(null);
                  setReceiptUrl(null);
                }}
                className="flex items-center gap-1.5 rounded-xl border border-[#d5ddd6] bg-white px-5 py-3 text-[12px] font-bold text-[#627068] hover:bg-[#f6f8f6]"
              >
                <X size={15} /> Discard
              </button>
            </div>
          </div>
        )}

        {/* ── RECENT SCANNED RECEIPTS WITH CAMERA IMAGES ── */}
        <div className="mt-10 border-t border-[#f0f4f1] pt-7">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-[18px] font-bold tracking-[-.04em] text-[#172532]">
                Recent Scanned Receipts
              </h3>
              <p className="text-[11px] text-[#86968f]">
                Includes receipts captured via camera and uploaded documents with stored photo verification.
              </p>
            </div>
            <Link
              to={transactionsPath}
              className="text-[12px] font-bold text-[#3b8165] flex items-center gap-1 hover:underline"
            >
              View in Expenses <ArrowRight size={13} />
            </Link>
          </div>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {recentScans.length > 0 ? (
              recentScans.map((s: any) => {
                const isCamera = s.notes && s.notes.toLowerCase().includes("camera");
                const hasReceiptImage = Boolean(s.receipt_url);

                return (
                  <div
                    key={s.id}
                    className="group relative flex items-center justify-between rounded-2xl bg-[#f9fbf8] p-3.5 border border-[#ecf2ed] hover:border-[#7BE2BE] hover:shadow-sm transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Thumbnail Image or Icon */}
                      {hasReceiptImage ? (
                        <div
                          onClick={() =>
                            setLightboxImage({
                              url: s.receipt_url,
                              name: s.name,
                              amount: s.amount,
                              date: s.date,
                              category: s.category,
                            })
                          }
                          className="relative h-12 w-12 shrink-0 cursor-pointer overflow-hidden rounded-xl border border-[#dce6e0] bg-[#eef3f0] group-hover:scale-105 transition"
                          title="Click to view full receipt image"
                        >
                          <img
                            src={s.receipt_url}
                            alt={s.name}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              // If image fails, hide image element
                              (e.target as HTMLElement).style.display = "none";
                            }}
                          />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition">
                            <Eye size={14} />
                          </div>
                        </div>
                      ) : (
                        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#e7f8ef] text-[#4caf89]">
                          <FileCheck size={18} />
                        </div>
                      )}

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-[13px] font-bold text-[#172532]">{s.name}</p>
                          {isCamera && (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-[#e8f7f0] px-1.5 py-0.5 text-[9px] font-bold text-[#2d795a]">
                              <Camera size={9} /> Camera
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-[#9ba59f] mt-0.5">
                          {s.date} · <span className="font-semibold text-[#5d7367]">{s.category}</span>
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0 pl-2">
                      <p className="text-[13px] font-bold text-[#df7f64]">{s.amount}</p>
                      {hasReceiptImage && (
                        <button
                          type="button"
                          onClick={() =>
                            setLightboxImage({
                              url: s.receipt_url,
                              name: s.name,
                              amount: s.amount,
                              date: s.date,
                              category: s.category,
                            })
                          }
                          className="mt-0.5 text-[10px] font-bold text-[#3b8165] hover:underline flex items-center gap-0.5 justify-end"
                        >
                          <Maximize2 size={10} /> View Photo
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-full py-8 text-center rounded-2xl border border-dashed border-[#d5ddd6] bg-[#fcfdfc]">
                <ReceiptIndianRupee size={28} className="mx-auto text-[#a2b0a8]" />
                <p className="mt-2 text-[13px] font-bold text-[#172532]">No scanned receipts yet</p>
                <p className="mt-1 text-[11px] text-[#8ea097]">
                  Use the camera or upload option above to scan and save receipts with Gemini AI.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── LIGHTBOX MODAL FOR FULL-SIZE RECEIPT IMAGES ── */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-2xl w-full overflow-hidden rounded-[24px] bg-[#121c24] text-white shadow-2xl border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Lightbox Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <div>
                <h4 className="font-display text-[16px] font-bold text-white">
                  {lightboxImage.name}
                </h4>
                <p className="text-[11px] text-[#93a69c]">
                  {lightboxImage.date} · {lightboxImage.category} ·{" "}
                  <span className="font-bold text-[#7BE2BE]">{lightboxImage.amount}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Lightbox Image Preview */}
            <div className="max-h-[70vh] overflow-auto bg-black/40 p-4 flex items-center justify-center">
              <img
                src={lightboxImage.url}
                alt={lightboxImage.name}
                className="max-h-[65vh] w-auto max-w-full rounded-xl object-contain shadow-lg"
              />
            </div>

            {/* Lightbox Footer */}
            <div className="flex items-center justify-between border-t border-white/10 px-6 py-3 bg-[#0d151c]">
              <span className="text-[11px] text-[#86998f]">Verified Scanned Receipt</span>
              <a
                href={lightboxImage.url}
                target="_blank"
                rel="noreferrer"
                download
                className="flex items-center gap-1.5 rounded-xl bg-white/10 px-4 py-1.5 text-[11px] font-bold text-white hover:bg-white/20 transition"
              >
                <Maximize2 size={12} /> Open Full Size / Download
              </a>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

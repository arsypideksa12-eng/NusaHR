import React, { useEffect, useRef, useState } from 'react';
import { Camera, Check, RefreshCw, Upload, X } from 'lucide-react';
import { formatDateDDMMMYYYY, formatTimeHHMMSS } from '../utils/formatters';

interface SelfieCameraModalProps {
  mode: 'clock-in' | 'clock-out';
  employeeName: string;
  onClose: () => void;
  onConfirm: (photoDataUrl: string, note: string) => Promise<void>;
}

export const SelfieCameraModal: React.FC<SelfieCameraModalProps> = ({
  mode,
  employeeName,
  onClose,
  onConfirm,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [capturedPhoto, setCapturedPhoto] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [cameraError, setCameraError] = useState<string>('');
  const [cameraReady, setCameraReady] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const startCamera = async () => {
    setCameraError('');
    setCameraReady(false);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Peramban tidak mendukung akses kamera langsung. Silakan unggah foto selfie.');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 480 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraReady(true);
      }
    } catch {
      setCameraError(
        'Izin kamera tidak tersedia di perangkat ini. Gunakan tombol Ambil / Unggah Foto di bawah.'
      );
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const targetW = 360;
    const targetH = 360;
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const vw = video.videoWidth || 480;
    const vh = video.videoHeight || 480;
    const side = Math.min(vw, vh);
    const sx = (vw - side) / 2;
    const sy = (vh - side) / 2;

    // Mirror horizontally for natural selfie view
    ctx.save();
    ctx.translate(targetW, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, sx, sy, side, side, 0, 0, targetW, targetH);
    ctx.restore();

    const dataUrl = canvas.toDataURL('image/jpeg', 0.65);
    setCapturedPhoto(dataUrl);
    stopCamera();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const targetW = 360;
        const targetH = 360;
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        ctx.drawImage(img, sx, sy, side, side, 0, 0, targetW, targetH);
        setCapturedPhoto(canvas.toDataURL('image/jpeg', 0.65));
        stopCamera();
      };
      if (typeof reader.result === 'string') {
        img.src = reader.result;
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRetake = () => {
    setCapturedPhoto('');
    startCamera();
  };

  const handleSubmit = async () => {
    if (!capturedPhoto || submitting) return;
    setSubmitting(true);
    try {
      await onConfirm(capturedPhoto, note);
    } finally {
      setSubmitting(false);
    }
  };

  const isClockIn = mode === 'clock-in';

  return (
    <div className="absolute inset-0 z-50 flex items-end justify-center bg-slate-950/75 backdrop-blur-sm">
      <div className="max-h-[94%] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-slate-200 sm:hidden" />

        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-emerald-700">
              {isClockIn ? 'Verifikasi Masuk Kerja' : 'Verifikasi Pulang Kerja'}
            </p>
            <h3 className="mt-0.5 text-lg font-bold text-slate-900">
              {isClockIn ? 'Foto Selfie Clock-In' : 'Foto Selfie Clock-Out'}
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              {employeeName} <span aria-hidden="true">·</span> {formatDateDDMMMYYYY(now)}{' '}
              <span aria-hidden="true">·</span>{' '}
              <span className="font-mono-tabular font-semibold text-slate-700">
                {formatTimeHHMMSS(now)}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200"
            aria-label="Tutup kamera"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Camera / Photo Preview */}
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-950">
          <div className="relative aspect-square w-full overflow-hidden">
            {capturedPhoto ? (
              <img
                src={capturedPhoto}
                alt="Hasil foto selfie presensi"
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : cameraError ? (
              <div className="flex h-full flex-col items-center justify-center p-6 text-center text-white">
                <Camera className="h-10 w-10 text-slate-400" />
                <p className="mt-3 text-xs leading-relaxed text-slate-300">{cameraError}</p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-500"
                >
                  <Upload className="h-4 w-4" />
                  <span>Ambil / Unggah Foto Selfie</span>
                </button>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="h-full w-full -scale-x-100 object-cover"
                />
                {!cameraReady && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 text-xs font-medium text-slate-300">
                    Menyiapkan kamera depan...
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <canvas ref={canvasRef} className="hidden" />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="user"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Note input */}
        <div className="mt-4">
          <label htmlFor="selfie-note" className="block text-xs font-semibold text-slate-700">
            Catatan Lokasi / Aktivitas (Opsional)
          </label>
          <input
            id="selfie-note"
            type="text"
            maxLength={200}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={isClockIn ? 'Contoh: Hadir di kantor pusat' : 'Contoh: Pekerjaan selesai'}
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:bg-white focus:outline-none"
          />
        </div>

        {/* Action Buttons */}
        <div className="mt-5 flex items-center gap-3">
          {!capturedPhoto ? (
            <>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
              >
                <Upload className="h-4 w-4" />
                <span>Galeri</span>
              </button>
              <button
                type="button"
                disabled={!cameraReady}
                onClick={handleCapture}
                className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Camera className="h-4 w-4" />
                <span>Ambil Foto Selfie</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                disabled={submitting}
                onClick={handleRetake}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Ulangi</span>
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleSubmit}
                className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 active:scale-[0.99] disabled:opacity-60"
              >
                <Check className="h-4 w-4" />
                <span>
                  {submitting
                    ? 'Menyimpan...'
                    : isClockIn
                      ? 'Konfirmasi Clock-In'
                      : 'Konfirmasi Clock-Out'}
                </span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

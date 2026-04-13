import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, NotFoundException } from "@zxing/library";
import { X, Camera } from "lucide-react";

interface BarcodeScannerProps {
  onDetected: (barcode: string) => void;
  onClose: () => void;
}
// ... 상단 import 동일

export function BarcodeScanner({ onDetected, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;

    // 1. 카메라 제약 조건 설정 (초점 개선 핵심)
    const constraints: MediaStreamConstraints = {
      video: {
        facingMode: "environment", // 후면 카메라 우선
        width: { ideal: 1280 }, // 고해상도 요청 (초점 정확도 향상)
        height: { ideal: 720 },
        // @ts-ignore: 일부 브라우저에서 지원하는 자동 초점 속성
        focusMode: { ideal: "continuous" },
      },
    };

    reader
      .listVideoInputDevices()
      .then((devices) => {
        if (devices.length === 0) {
          setError("카메라를 찾을 수 없습니다.");
          return;
        }

        // 후면 카메라 찾기 로직 최적화
        const backCamera =
          devices.find((d) => /back|rear|environment/i.test(d.label)) ||
          devices[devices.length - 1];

        setScanning(true);

        // 2. decodeFromVideoDevice 대신 decodeFromConstraints 사용 (설정값 반영)
        // 기존 deviceId 방식보다 브라우저에게 상세한 카메라 사양을 요청할 수 있습니다.
        reader
          .decodeFromConstraints(
            constraints,
            videoRef.current!,
            (result, err) => {
              if (result) {
                const code = result.getText();
                onDetected(code);
                reader.reset();
              }
              if (err && !(err instanceof NotFoundException)) {
                console.error(err);
              }
            },
          )
          .catch((e) => {
            setError("카메라 접근 권한이 필요합니다: " + e.message);
          });
      })
      .catch(() => {
        setError("카메라 장치 목록을 가져올 수 없습니다.");
      });

    return () => {
      reader.reset();
    };
  }, [onDetected]);

  // ... 하단 UI 코드는 동일 (video 태그의 playsInline 속성은 유지해 주세요)
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-card rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-primary" />
            <span className="font-semibold text-card-foreground">
              카메라 스캔
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative bg-black">
          {error ? (
            <div className="flex flex-col items-center justify-center h-52 px-6 text-center gap-3">
              <Camera className="w-12 h-12 text-muted-foreground opacity-50" />
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                className="w-full h-52 object-cover"
                autoPlay
                playsInline
                muted
              />
              {scanning && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-[300px] h-[182px] border-2 border-primary/80 rounded-lg shadow-[0_0_0_1000px_rgba(0,0,0,0.4)]">
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary rounded-tl" />
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-primary rounded-tr" />
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-primary rounded-bl" />
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary rounded-br" />
                    <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-primary/70 animate-pulse" />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="px-4 py-3">
          <p className="text-xs text-muted-foreground text-center">
            바코드를 사각형 안에 맞춰 주세요
          </p>
        </div>
      </div>
    </div>
  );
}

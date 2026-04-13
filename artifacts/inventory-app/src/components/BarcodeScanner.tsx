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

    const startScanning = async () => {
      try {
        // 1. 매번 장치 목록을 새로 가져옵니다.
        const devices = await reader.listVideoInputDevices();

        if (devices.length === 0) {
          setError("카메라를 찾을 수 없습니다.");
          return;
        }

        // 2. 후면 카메라 필터링을 더 꼼꼼하게 합니다.
        // - label에 후면을 뜻하는 단어가 있는지 확인
        // - 없으면 목록의 가장 마지막 장치를 선택 (대부분의 스마트폰은 마지막이 메인 후면 카메라)
        const backCamera = devices.find(d => 
          /back|rear|environment|뒤|후면/i.test(d.label.toLowerCase())
        ) || devices[devices.length - 1];

        setScanning(true);

        // 3. 찾은 특정 backCamera.deviceId를 명시적으로 넣어서 실행합니다.
        await reader.decodeFromVideoDevice(
          backCamera.deviceId, 
          videoRef.current!, 
          (result, err) => {
            if (result) {
              onDetected(result.getText());
              // 인식 성공 시 즉시 리셋 (매우 중요)
              reader.reset(); 
            }
          }
        );
      } catch (e: any) {
        console.error("카메라 에러:", e);
        setError("카메라 연결 실패");
      }
    };

    startScanning();

    // 4. 컴포넌트가 닫힐 때 완전히 초기화
    return () => {
      reader.reset();
      readerRef.current = null;
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

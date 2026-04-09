import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { Lock, X, Eye, EyeOff } from "lucide-react";

interface PasswordModalProps {
  onSuccess: () => void;
  onClose: () => void;
}

const PASSWORD_KEY = "inventory_admin_password";

export function getAdminPassword(): string {
  return localStorage.getItem(PASSWORD_KEY) ?? "1234";
}

export function setAdminPassword(pw: string) {
  localStorage.setItem(PASSWORD_KEY, pw);
}

export function PasswordModal({ onSuccess, onClose }: PasswordModalProps) {
  const [input, setInput] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleConfirm() {
    if (input === getAdminPassword()) {
      setError(false);
      onSuccess();
    } else {
      setError(true);
      setShake(true);
      setInput("");
      setTimeout(() => setShake(false), 500);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") handleConfirm();
    if (e.key === "Escape") onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div
        className={`bg-card rounded-2xl shadow-2xl w-full max-w-xs overflow-hidden ${shake ? "animate-shake" : ""}`}
        style={shake ? { animation: "shake 0.4s ease" } : {}}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Lock className="w-4.5 h-4.5 text-primary" />
            </div>
            <span className="font-bold text-base text-card-foreground">관리자 인증</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 pb-5 space-y-3">
          <p className="text-xs text-muted-foreground">비밀번호를 입력하세요.</p>

          <div className="relative">
            <input
              ref={inputRef}
              type={showPw ? "text" : "password"}
              className={`w-full pr-10 pl-4 py-2.5 border-2 rounded-xl text-sm bg-background focus:outline-none transition-colors ${
                error ? "border-destructive focus:border-destructive" : "border-input focus:border-primary"
              }`}
              placeholder="비밀번호"
              value={input}
              onChange={(e) => { setInput(e.target.value); setError(false); }}
              onKeyDown={handleKeyDown}
              autoComplete="off"
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {error && (
            <p className="text-xs text-destructive font-medium">비밀번호가 올바르지 않습니다.</p>
          )}

          <button
            onClick={handleConfirm}
            className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:opacity-90 transition-opacity"
          >
            확인
          </button>
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
      `}</style>
    </div>
  );
}

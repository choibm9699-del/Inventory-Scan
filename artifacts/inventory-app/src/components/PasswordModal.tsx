import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { Lock, X, Eye, EyeOff, Loader2 } from "lucide-react";
import { db } from "../firebase.ts"; 
import { ref as dbRef, get, child, update } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const changePassword = async (newPw: string) => {
  try {
    const updates = {};
    updates['/admin_settings/config/adminPassword'] = newPw;

    await update(dbRef(db), updates);
    alert("비밀번호가 성공적으로 변경되었습니다.");
  } catch (error) {
    alert("변경 실패: " + error.message);
  }
};

interface PasswordModalProps {
  onSuccess: () => void;
  onClose: () => void;
}

export function PasswordModal({ onSuccess, onClose }: PasswordModalProps) {
  const [input, setInput] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const [dbPassword, setDbPassword] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true); // 로딩 상태 추가
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();

    const fetchPassword = async () => {
      try {
        const rootRef = dbRef(db);
        // 사용자님이 설정하신 경로: admin_settings/config
        const snapshot = await get(child(rootRef, "admin_settings/config"));

        if (snapshot.exists()) {
          const data = snapshot.val();
          setDbPassword(String(data.adminPassword)); // DB의 2013448을 가져옴
        } else {
          setDbPassword("1234"); // 데이터가 없을 경우 비상용
        }
      } catch (err) {
        console.error("DB 연결 실패:", err);
        setDbPassword("1234");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPassword();
  }, []);

  function handleConfirm() {
    if (isLoading) return; // 로딩 중에는 클릭 방지

    // DB에서 가져온 비번(2013448)과 입력값 비교
    if (dbPassword && input === dbPassword) {
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

  // 엔터 키 지원
  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") handleConfirm();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className={`bg-card rounded-2xl shadow-2xl w-full max-w-xs overflow-hidden ${shake ? "animate-shake" : ""}`}>
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
              placeholder={isLoading ? "로딩 중..." : "비밀번호"}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold flex items-center justify-center"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "확인"}
          </button>
        </div>
      </div>
    </div>
  );
}
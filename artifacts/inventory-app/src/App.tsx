import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { InventoryPage } from "@/pages/InventoryPage";
import { ref, get, child } from "firebase/database";
import { db } from "./firebase.ts"; // firebase.ts에서 설정한 db 객체

const queryClient = new QueryClient();

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginId, setLoginId] = useState(localStorage.getItem("rememberId") || "");
  const [loginPw, setLoginPw] = useState(localStorage.getItem("rememberPw") || "");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(
    !!localStorage.getItem("rememberId"),
  );

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginId || !loginPw) return alert("아이디와 비밀번호를 입력해주세요.");

    setLoading(true);
    try {
      const dbRef = ref(db);
      // Firebase의 'users' 경로에서 데이터를 가져옵니다.
      const snapshot = await get(child(dbRef, "user"));

      if (snapshot.exists()) {
        const usersData = snapshot.val();
        // DB에 저장된 유저 리스트 중 입력값과 일치하는게 있는지 확인
        const userList = Object.values(usersData);
        const isValidUser = userList.find(
          (u: any) => String(u.ID) === loginId && String(u.PW) === loginPw,
        );

        if (isValidUser) {
          if (rememberMe) {
            localStorage.setItem("rememberId", loginId);
          } else {
            localStorage.removeItem("rememberId");
          }
          setIsLoggedIn(true);
        } else {
          alert("아이디 또는 비밀번호가 틀렸습니다.");
        }
      } else {
        alert("등록된 사용자 정보가 없습니다. DB를 확인해주세요.");
      }
    } catch (error) {
      console.error(error);
      alert("로그인 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };
/*
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginId || !loginPw) return alert("아이디와 비밀번호를 입력해주세요.");

    setLoading(true);
    try {
      const email = `${loginId}@inventorybm.com`; // 자동 변환
      await signInWithEmailAndPassword(auth, email, loginPw);

      if (rememberMe) {
        localStorage.setItem("rememberId", loginId);
      } else {
        localStorage.removeItem("rememberId");
      }
      setIsLoggedIn(true);

    } catch (error) {
      alert("아이디 또는 비밀번호가 틀렸습니다.");
    } finally {
      setLoading(false);
    }
  };*/

  // 1. 로그인 전 화면
  if (!isLoggedIn) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-100 p-6">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm">
          <div className="w-full h-9 bg-sidebar-primary rounded-lg flex items-center justify-center">
            <img
              src="/icon512.png"
              alt="아이콘"
              className="w-9 h-9 object-cover"
            />
            <h2 className="text-2xl font-bold px-1 text-black-600">
              {" "}
              현장 재고조사
            </h2>
          </div>
          <form onSubmit={handleLogin} className="space-y-5">
            <div></div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 ml-1">
                아이디
              </label>
              <input
                type="text"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-400 transition-all"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 ml-1">
                비밀번호
              </label>
              <input
                type="password"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-400 transition-all"
                value={loginPw}
                onChange={(e) => setLoginPw(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2 px-1">
              <input
                type="checkbox"
                id="rememberId"
                className="w-4 h-4 rounded border-gray-300"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <label
                htmlFor="rememberId"
                className="text-sm font-bold text-gray-600 cursor-pointer"
              >
                아이디 저장
              </label>
            </div>

            <button
              disabled={loading}
              className={`w-full py-4 rounded-xl font-bold text-gray-50 shadow-lg transition-all ${
                loading
                  ? "bg-gray-400"
                  : "bg-blue-500 hover:bg-gray-600 active:scale-95"
              }`}
            >
              {loading ? "확인 중..." : "로 그 인"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 2. 로그인 성공 후 화면 (기존 코드)
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <InventoryPage />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

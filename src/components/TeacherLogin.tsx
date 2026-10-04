"use client";

import { useState } from "react";
import { Lock } from "lucide-react";

const TEACHER_USER = process.env.NEXT_PUBLIC_TEACHER_USER || "FITREE";
const TEACHER_PASS = process.env.NEXT_PUBLIC_TEACHER_PASS || "1234";
const SESSION_KEY = "cosmic-teacher-auth";

export function isTeacherLoggedIn(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(SESSION_KEY) === "1";
}

export function teacherLogout() {
  localStorage.removeItem(SESSION_KEY);
}

export default function TeacherLogin({ onSuccess }: { onSuccess: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    if (username.trim() === TEACHER_USER && password === TEACHER_PASS) {
      localStorage.setItem(SESSION_KEY, "1");
      setError(null);
      onSuccess();
    } else {
      setError("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
    }
  };

  return (
    <div className="min-h-screen p-6 max-w-md mx-auto flex flex-col justify-center">
      <div className="glass-panel rounded-2xl p-8">
        <div className="w-12 h-12 rounded-xl bg-cosmic-violet/20 border border-cosmic-violet/40 flex items-center justify-center mb-4">
          <Lock className="w-6 h-6 text-cosmic-cyan" />
        </div>
        <h1 className="text-2xl font-bold">ครูเข้าสู่ระบบ</h1>
        <p className="text-sm text-slate-400 mt-1 mb-6">เฉพาะครูผู้สอนเท่านั้น (demo login)</p>
        {error && <div className="mb-4 p-3 rounded-xl text-sm bg-red-500/10 border border-red-500/40 text-red-300">{error}</div>}
        <label className="text-xs uppercase tracking-widest text-slate-400">ชื่อผู้ใช้</label>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="FITREE"
          autoComplete="username"
          className="mt-1 w-full px-4 py-3 rounded-xl bg-cosmic-void border border-white/10 text-white"
        />
        <label className="text-xs uppercase tracking-widest text-slate-400 mt-4 block">รหัสผ่าน</label>
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          type="password"
          placeholder="••••"
          autoComplete="current-password"
          className="mt-1 w-full px-4 py-3 rounded-xl bg-cosmic-void border border-white/10 text-white"
        />
        <button
          onClick={submit}
          className="mt-6 w-full px-6 py-3 rounded-xl bg-cosmic-violet/30 hover:bg-cosmic-violet/40 border border-cosmic-violet/50 font-bold"
        >
          เข้าสู่ระบบ
        </button>
      </div>
    </div>
  );
}

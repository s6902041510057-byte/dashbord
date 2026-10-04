"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, LogOut, DoorOpen, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { generateRoomCode } from "@/lib/utils";
import TeacherLogin, { isTeacherLoggedIn, teacherLogout } from "@/components/TeacherLogin";
import type { Room } from "@/types/quiz";

export default function TeacherPage() {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [roomName, setRoomName] = useState("");
  const [maxGroupSize, setMaxGroupSize] = useState(4);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setAuthed(isTeacherLoggedIn());
  }, []);

  const loadRooms = async () => {
    const { data } = await supabase.from("rooms").select("*").order("created_at", { ascending: false });
    if (data) {
      const list = data as Room[];
      setRooms(list);
      // student counts per room
      const ids = list.map((r) => r.id);
      if (ids.length > 0) {
        const { data: students } = await supabase.from("room_students").select("room_id").in("room_id", ids);
        const map: Record<string, number> = {};
        for (const s of (students ?? []) as { room_id: string }[]) {
          map[s.room_id] = (map[s.room_id] ?? 0) + 1;
        }
        setCounts(map);
      }
    }
  };

  useEffect(() => {
    if (authed) loadRooms();
  }, [authed]);

  const createRoom = async () => {
    setLoading(true);
    setError(null);
    try {
      // Each room gets its own quiz so questions live inside the room page
      const title = roomName.trim() || `ห้องเรียน ${new Date().toLocaleDateString("th-TH")}`;
      const { data: quiz, error: qErr } = await supabase
        .from("quizzes")
        .insert({ title, description: `ชุดข้อสอบประจำห้อง ${title}` })
        .select()
        .single();
      if (qErr) throw qErr;
      const code = generateRoomCode(6);
      const { data: room, error: rErr } = await supabase
        .from("rooms")
        .insert({ room_code: code, max_group_size: maxGroupSize, status: "LOBBY", quiz_id: (quiz as { id: string }).id })
        .select()
        .single();
      if (rErr) throw rErr;
      router.push(`/teacher/room/${(room as Room).id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "สร้างห้องไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  const deleteRoom = async (id: string) => {
    if (!confirm("ลบห้องนี้และข้อมูลทั้งหมดใช่ไหม?")) return;
    await supabase.from("rooms").delete().eq("id", id);
    await loadRooms();
  };

  if (!authed) {
    return (
      <div className="min-h-screen">
        <TeacherLogin onSuccess={() => setAuthed(true)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-sm text-slate-400 hover:text-cosmic-cyan">← กลับหน้าหลัก</Link>
        <button
          onClick={() => { teacherLogout(); setAuthed(false); }}
          className="text-xs flex items-center gap-1 text-slate-500 hover:text-white"
        >
          <LogOut className="w-3 h-3" /> ออกจากระบบครู (FITREE)
        </button>
      </div>
      <h1 className="text-3xl font-bold mt-4 mb-1 text-cosmic-cyan">แดชบอร์ดครู 🛰️</h1>
      <p className="text-slate-400 text-sm mb-6">สร้างห้อง → กดเข้าห้อง → จัดการคำถาม + สุ่มกลุ่ม + เริ่มแข่งขันในหน้าห้องนั้น</p>

      {error && <div className="border border-red-500/40 rounded-xl p-3 text-sm text-red-300 mb-4 bg-red-500/10">{error}</div>}

      <div className="space-y-6">
          {/* Create room */}
          <div className="glass-panel rounded-2xl p-6">
            <h2 className="font-bold mb-3">สร้างห้องใหม่</h2>
            <div className="flex flex-col md:flex-row gap-3">
              <input
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="ชื่อห้อง เช่น วิทยาศาสตร์ ม.1/2"
                maxLength={60}
                className="flex-1 px-4 py-2.5 rounded-xl bg-cosmic-void border border-white/10 text-sm"
              />
              <label className="flex items-center gap-2 text-sm text-slate-300">
                กลุ่มละ
                <input type="number" min={2} max={8} value={maxGroupSize} onChange={(e) => setMaxGroupSize(Number(e.target.value))} className="w-20 px-3 py-2 rounded-lg bg-cosmic-void border border-white/10" />
                คน
              </label>
              <button onClick={createRoom} disabled={loading} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-cosmic-violet/30 hover:bg-cosmic-violet/40 border border-cosmic-violet/50 font-medium disabled:opacity-50">
                <Plus className="w-4 h-4" /> {loading ? "กำลังสร้าง..." : "สร้างห้อง"}
              </button>
            </div>
          </div>

          {/* Room list */}
          <div className="glass-panel rounded-2xl p-6">
            <h2 className="font-bold mb-3">ห้องทั้งหมด ({rooms.length})</h2>
            {rooms.length === 0 ? (
              <p className="text-sm text-slate-500">ยังไม่มีห้อง สร้างห้องแรกด้านบนได้เลย</p>
            ) : (
              <div className="grid md:grid-cols-2 gap-3">
                {rooms.map((r) => (
                  <div key={r.id} className="rounded-xl p-4 bg-white/[0.03] border border-white/10">
                    <div className="flex items-center justify-between">
                      <p className="text-2xl font-extrabold tracking-[0.25em] text-cosmic-gold">{r.room_code}</p>
                      <span className="text-xs px-2 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300">{r.status}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-2 flex items-center gap-1"><Users className="w-3 h-3" /> {counts[r.id] ?? 0} คน • กลุ่มละ {r.max_group_size} คน</p>
                    <div className="flex gap-2 mt-3">
                      <Link href={`/teacher/room/${r.id}`} className="flex-1 text-center text-sm px-4 py-2 rounded-lg bg-cosmic-cyan/20 border border-cosmic-cyan/40 font-medium flex items-center justify-center gap-1">
                        <DoorOpen className="w-4 h-4" /> เข้าห้องนี้
                      </Link>
                      <button onClick={() => deleteRoom(r.id)} className="text-xs px-3 py-2 rounded-lg text-red-400/80 border border-white/10 hover:border-red-400/40">ลบ</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
      </div>
    </div>
  );
}

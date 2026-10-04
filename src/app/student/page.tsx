"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Rocket, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";
import CosmicRandomWheel from "@/components/CosmicRandomWheel";
import GroupSetup from "@/components/GroupSetup";
import QuizPlayer from "@/components/QuizPlayer";
import type { Room, RoomStudent, Group, Question } from "@/types/quiz";

export default function StudentPage() {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [room, setRoom] = useState<Room | null>(null);
  const [me, setMe] = useState<RoomStudent | null>(null);
  const [students, setStudents] = useState<RoomStudent[]>([]);
  const [myGroupMates, setMyGroupMates] = useState<string[]>([]);
  const [myGroupMembers, setMyGroupMembers] = useState<RoomStudent[]>([]);
  const [myGroup, setMyGroup] = useState<Group | null>(null);
  const [roomClosed, setRoomClosed] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const leaveRoom = () => {
    localStorage.removeItem("cosmic-session-token");
    localStorage.removeItem("cosmic-room-code");
    setRoom(null);
    setMe(null);
    setStudents([]);
    setMyGroupMates([]);
    setMyGroupMembers([]);
    setMyGroup(null);
    setRoomClosed(false);
  };

  // Restore session
  useEffect(() => {
    const token = localStorage.getItem("cosmic-session-token");
    const savedCode = localStorage.getItem("cosmic-room-code");
    if (token && savedCode) {
      rejoin(savedCode, token);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rejoin = async (roomCode: string, token: string) => {
    const { data: rooms } = await supabase.from("rooms").select("*").eq("room_code", roomCode).limit(1);
    const r = rooms?.[0] as Room | undefined;
    if (!r) {
      leaveRoom();
      return;
    }
    if (r.status === "CLOSED") {
      setRoom(r);
      setRoomClosed(true);
      return;
    }
    setRoom(r);
    setRoomClosed(false);
    const { data: mine } = await supabase.from("room_students").select("*").eq("session_token", token).limit(1);
    if (mine?.[0]) setMe(mine[0] as RoomStudent);
  };

  useEffect(() => {
    if (!room) return;
    const fetchAll = async () => {      const { data } = await supabase
        .from("room_students")
        .select("*")
        .eq("room_id", room.id)
        .order("joined_at", { ascending: true });
      if (data) {
        setStudents(data as RoomStudent[]);
        // Refresh room status — ครูปิดห้อง/ลบห้องต้องรู้ทันทีโดยไม่รีเฟรช
        const { data: r } = await supabase.from("rooms").select("*").eq("id", room.id).single();
        if (!r) {
          // ห้องถูกลบ
          setRoomClosed(true);
          return;
        }
        const fresh = r as Room;
        setRoom(fresh);
        if (fresh.status === "CLOSED") {
          setRoomClosed(true);
          return;
        }
        setRoomClosed(false);
        // My group mates
        const token = localStorage.getItem("cosmic-session-token");
        const mine = (data as RoomStudent[]).find((s) => s.session_token === token);
        if (mine) {
          setMe(mine);
          if (mine.group_id) {
            const mates = (data as RoomStudent[]).filter((s) => s.group_id === mine.group_id);
            setMyGroupMembers(mates);
            setMyGroupMates(mates.map((s) => s.student_name));
            const { data: g } = await supabase.from("groups").select("*").eq("id", mine.group_id).single();
            if (g) setMyGroup(g as Group);
          }
        }
      }
    };
    fetchAll();
    const ch = supabase
      .channel(`student-room-${room.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "room_students", filter: `room_id=eq.${room.id}` }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "rooms", filter: `id=eq.${room.id}` }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "groups", filter: `room_id=eq.${room.id}` }, fetchAll)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [room?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Questions of this room's quiz (realtime: teacher adds/edits live)
  useEffect(() => {
    if (!room?.quiz_id) {
      setQuestions([]);
      return;
    }
    const loadQ = async () => {
      const { data } = await supabase
        .from("questions")
        .select("*")
        .eq("quiz_id", room.quiz_id as string)
        .order("order_num", { ascending: true });
      if (data) setQuestions(data as Question[]);
    };
    loadQ();
    const ch = supabase
      .channel(`student-questions-${room.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "questions" }, loadQ)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [room?.id, room?.quiz_id]); // eslint-disable-line react-hooks/exhaustive-deps

  const join = async () => {
    if (!code.trim() || !name.trim()) {
      setError("กรุณากรอกรหัสห้องและชื่อ");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data: rooms, error: rErr } = await supabase
        .from("rooms")
        .select("*")
        .eq("room_code", code.trim().toUpperCase())
        .limit(1);
      if (rErr) throw rErr;
      const r = rooms?.[0] as Room | undefined;
      if (!r) throw new Error("ไม่พบห้องนี้ ตรวจสอบรหัสอีกครั้ง");
      if (r.status === "CLOSED") throw new Error("ห้องนี้ถูกปิดอยู่ รอครูเปิดห้องก่อนแล้วค่อยเข้าอีกครั้ง");
      const token = crypto.randomUUID();
      const { data: created, error: jErr } = await supabase
        .from("room_students")
        .insert({ room_id: r.id, student_name: name.trim(), session_token: token })
        .select()
        .single();
      if (jErr) throw jErr;
      localStorage.setItem("cosmic-session-token", token);
      localStorage.setItem("cosmic-room-code", r.room_code);
      setRoom(r);
      setMe(created as RoomStudent);
    } catch (e) {
      setError(e instanceof Error ? e.message : "เข้าห้องไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  if (!room) {
    return (
      <div className="min-h-screen p-6 max-w-md mx-auto flex flex-col justify-center">
        <Link href="/" className="text-sm text-slate-400 hover:text-cosmic-cyan mb-4">← กลับหน้าหลัก</Link>
        <div className="glass-panel rounded-2xl p-8">
          <h1 className="text-2xl font-bold mb-1">เข้าร่วมภารกิจ 🚀</h1>
          <p className="text-sm text-slate-400 mb-6">กรอกรหัสที่ครูให้มา แล้วตั้งชื่อนักบินอวกาศของคุณ</p>
          {error && <div className="mb-4 p-3 rounded-xl text-sm bg-red-500/10 border border-red-500/40 text-red-300">{error}</div>}
          <label className="text-xs uppercase tracking-widest text-slate-400">รหัสห้อง</label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="เช่น ABC123"
            maxLength={6}
            className="mt-1 w-full px-4 py-3 rounded-xl bg-cosmic-void border border-white/10 tracking-[0.3em] text-center text-xl font-bold text-cosmic-gold uppercase"
          />
          <label className="text-xs uppercase tracking-widest text-slate-400 mt-4 block">ชื่อของคุณ</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="เช่น ด.ช.อวกาศ"
            maxLength={30}
            className="mt-1 w-full px-4 py-3 rounded-xl bg-cosmic-void border border-white/10 text-white"
          />
          <button
            onClick={join}
            disabled={loading}
            className="mt-6 w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-cosmic-cyan/20 hover:bg-cosmic-cyan/30 border border-cosmic-cyan/40 font-bold disabled:opacity-50"
          >
            <Rocket className="w-4 h-4" /> {loading ? "กำลังวาร์ป..." : "เข้าห้อง"}
          </button>
        </div>
      </div>
    );
  }

  if (room && roomClosed) {
    return (
      <div className="min-h-screen p-6 max-w-md mx-auto flex flex-col justify-center text-center">
        <div className="glass-panel rounded-2xl p-8">
          <p className="text-5xl mb-4">🌑</p>
          <h1 className="text-2xl font-bold">ห้องนี้ถูกปิดแล้ว</h1>
          <p className="text-sm text-slate-400 mt-2 mb-6">ครูปิดห้อง {room.room_code} ไปแล้ว รอครูเปิดห้องก่อนแล้วค่อยเข้าอีกครั้ง</p>
          <button
            onClick={leaveRoom}
            className="w-full px-6 py-3 rounded-xl bg-cosmic-cyan/20 hover:bg-cosmic-cyan/30 border border-cosmic-cyan/40 font-bold"
          >
            กลับหน้าเข้าห้อง
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-widest text-slate-400">ห้อง {room.room_code} • {me?.student_name}</p>
        <button onClick={leaveRoom} className="text-xs text-slate-500 hover:text-white">ออกจากห้อง</button>
      </div>
      <h1 className="text-2xl font-bold mt-1 mb-4">
        {room.status === "LOBBY" && "ห้องรอ — กำลังรวมพลนักบิน 🛰️"}
        {room.status === "GROUPING" && "กำลังสุ่มกลุ่มด้วยวงล้อจักรวาล 🎡"}
        {room.status === "VOTING" && "โหวตหัวหน้ากลุ่ม 🗳️"}
        {room.status === "QUIZ_ACTIVE" && "เริ่มการแข่งขัน! 🚀"}
        {room.status === "FINISHED" && "จบการแข่งขัน 🏆"}
      </h1>

      {room.status === "LOBBY" && (
        <div className="glass-panel rounded-2xl p-6">
          <p className="flex items-center gap-2 text-sm text-slate-300 mb-3"><Users className="w-4 h-4" /> นักเรียน {students.length} คน (อัปเดต realtime)</p>
          <div className="flex flex-wrap gap-2">
            {students.map((s) => (
              <span
                key={s.id}
                className={`px-3 py-1.5 rounded-full text-sm border ${s.id === me?.id ? "bg-cosmic-cyan/20 border-cosmic-cyan/50 text-white" : "bg-white/5 border-white/10 text-slate-300"}`}
              >
                {s.student_name}{s.id === me?.id ? " (คุณ)" : ""}
              </span>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-4">รอครูกดสุ่มแบ่งกลุ่ม... อย่าปิดหน้านี้</p>
        </div>
      )}

      {room.status === "GROUPING" && (
        <div className="space-y-6">
          <CosmicRandomWheel names={students.map((s) => s.student_name)} highlightNames={myGroupMates} spinning />
          {myGroupMates.length > 0 ? (
            <div className="glass-panel rounded-2xl p-6 text-center border-cosmic-cyan/40">
              <p className="text-sm text-slate-400">คุณอยู่กลุ่มนี้ 👇</p>
              <div className="flex flex-wrap justify-center gap-2 mt-3">
                {myGroupMates.map((n) => (
                  <span key={n} className="px-4 py-2 rounded-full bg-cosmic-violet/20 border border-cosmic-violet/50 font-medium">{n}</span>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-center text-sm text-slate-400">กำลังวาร์ปเข้ากลุ่มของคุณ...</p>
          )}
          {me?.group_id && myGroupMembers.length > 0 && myGroup && me && (
            <GroupSetup
              groupId={me.group_id}
              members={myGroupMembers}
              me={me}
              groupName={myGroup.name}
              leaderId={myGroup.leader_student_id}
              onLeaderChange={(lid) => setMyGroup({ ...myGroup, leader_student_id: lid })}
              onNameChange={(n) => setMyGroup({ ...myGroup, name: n })}
            />
          )}
        </div>
      )}

      {room.status === "QUIZ_ACTIVE" && myGroup && me && (
        <>
          <QuizPlayer
            room={room}
            group={myGroup}
            me={me}
            members={myGroupMembers}
            questions={questions}
            onGroupUpdate={setMyGroup}
          />
          {/* กลับมาหน้ากลุ่ม: ให้หัวหน้าเลือกผู้ตอบข้อถัดไปได้ทันที */}
          <div className="mt-6">
            <GroupSetup
              groupId={myGroup.id}
              members={myGroupMembers}
              me={me}
              groupName={myGroup.name}
              leaderId={myGroup.leader_student_id}
              onLeaderChange={(lid) => setMyGroup({ ...myGroup, leader_student_id: lid })}
              onNameChange={(n) => setMyGroup({ ...myGroup, name: n })}
              quizMode
            />
          </div>
        </>
      )}

      {room.status === "FINISHED" && myGroup && me && (
        <QuizPlayer
          room={room}
          group={myGroup}
          me={me}
          members={myGroupMembers}
          questions={questions}
          onGroupUpdate={setMyGroup}
        />
      )}

      {(room.status === "QUIZ_ACTIVE" || room.status === "FINISHED") && (!myGroup || !me) && (
        <div className="glass-panel rounded-2xl p-6 text-center">
          <p className="text-lg font-bold text-cosmic-gold">เริ่มการแข่งขันแล้ว!</p>
          <p className="text-sm text-slate-400 mt-2">กำลังโหลดข้อมูลกลุ่มของคุณ...</p>
        </div>
      )}
    </div>
  );
}

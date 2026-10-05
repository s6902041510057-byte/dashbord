"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Users, Shuffle, Play, SkipForward, Square } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { assignGroups } from "@/lib/game-logic";
import TeacherLogin, { isTeacherLoggedIn } from "@/components/TeacherLogin";
import QuestionBank from "@/components/QuestionBank";
import type { Room, RoomStudent, Group, Question } from "@/types/quiz";

export default function RoomDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [authed, setAuthed] = useState(false);
  const [room, setRoom] = useState<Room | null>(null);
  const [students, setStudents] = useState<RoomStudent[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, { selected_option: number; is_correct: boolean; points_earned: number }>>({});
  const [respondents, setRespondents] = useState<Record<string, string>>({});
  const [nextRespondents, setNextRespondents] = useState<Record<string, string>>({});
  const [editingGroupSize, setEditingGroupSize] = useState(false);
  const [newGroupSize, setNewGroupSize] = useState(4);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const roomRef = useRef<Room | null>(null);
  const groupsRef = useRef<Group[]>([]);
  const questionsRef = useRef<Question[]>([]);
  roomRef.current = room;
  groupsRef.current = groups;
  questionsRef.current = questions;

  useEffect(() => {
    setAuthed(isTeacherLoggedIn());
  }, []);

  const loadRoom = async () => {
    const { data } = await supabase.from("rooms").select("*").eq("id", id).single();
    if (data) setRoom(data as Room);
  };

  const loadStudents = async () => {
    const { data } = await supabase.from("room_students").select("*").eq("room_id", id).order("joined_at", { ascending: true });
    if (data) setStudents(data as RoomStudent[]);
  };

  const loadGroups = async () => {
    const { data } = await supabase.from("groups").select("*").eq("room_id", id).order("created_at", { ascending: true });
    if (data) setGroups(data as Group[]);
  };

  const loadQuestions = async (quizId: string) => {
    const { data } = await supabase.from("questions").select("*").eq("quiz_id", quizId).order("order_num", { ascending: true });
    if (data) setQuestions(data as Question[]);
  };

  // สถานะการตอบของแต่ละกลุ่มในข้อปัจจุบัน + ผู้ตอบของข้อถัดไป (realtime)
  const loadAnswerStatus = async (questionId: string | undefined, questionIndex: number, groupIds: string[]) => {
    if (!questionId || groupIds.length === 0) {
      setAnswers({});
      setRespondents({});
      setNextRespondents({});
      return;
    }
    const { data: ans } = await supabase
      .from("submitted_answers")
      .select("group_id, selected_option, is_correct, points_earned")
      .eq("room_id", id)
      .eq("question_id", questionId);
    const amap: Record<string, { selected_option: number; is_correct: boolean; points_earned: number }> = {};
    for (const a of (ans ?? []) as { group_id: string; selected_option: number; is_correct: boolean; points_earned: number }[]) {
      amap[a.group_id] = a;
    }
    setAnswers(amap);
    const { data: resp } = await supabase
      .from("respondent_selections")
      .select("group_id, student_id")
      .in("group_id", groupIds)
      .eq("question_index", questionIndex);
    const rmap: Record<string, string> = {};
    for (const r of (resp ?? []) as { group_id: string; student_id: string }[]) {
      rmap[r.group_id] = r.student_id;
    }
    setRespondents(rmap);
    // ผู้ตอบของข้อถัดไป — ใช้ล็อกปุ่มข้อถัดไป
    const { data: nextResp } = await supabase
      .from("respondent_selections")
      .select("group_id, student_id")
      .in("group_id", groupIds)
      .eq("question_index", questionIndex + 1);
    const nmap: Record<string, string> = {};
    for (const r of (nextResp ?? []) as { group_id: string; student_id: string }[]) {
      nmap[r.group_id] = r.student_id;
    }
    setNextRespondents(nmap);
  };

  useEffect(() => {
    if (!authed) return;
    loadRoom();
    loadStudents();
    loadGroups();
    const ch = supabase
      .channel(`teacher-room-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "room_students", filter: `room_id=eq.${id}` }, loadStudents)
      .on("postgres_changes", { event: "*", schema: "public", table: "groups", filter: `room_id=eq.${id}` }, () => { loadGroups(); loadStudents(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "rooms", filter: `id=eq.${id}` }, loadRoom)
      .on("postgres_changes", { event: "*", schema: "public", table: "submitted_answers", filter: `room_id=eq.${id}` }, () => {
        if (roomRef.current) {
          const q = questionsRef.current[roomRef.current.current_question_index];
          loadAnswerStatus(q?.id, roomRef.current.current_question_index, groupsRef.current.map((g) => g.id));
        }
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, id]);

  useEffect(() => {
    if (room?.quiz_id) loadQuestions(room.quiz_id);
  }, [room?.quiz_id]);

  // โหลดสถานะการตอบเมื่อเปลี่ยนข้อ / กลุ่ม / คำถาม
  useEffect(() => {
    if (!room || room.status !== "QUIZ_ACTIVE") return;
    const q = questions[room.current_question_index];
    loadAnswerStatus(q?.id, room.current_question_index, groups.map((g) => g.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.current_question_index, room?.status, groups.length, questions.length]);

  // ผู้ตอบแต่ละกลุ่มเปลี่ยนเมื่อไร โหลดสถานะใหม่ทันที
  useEffect(() => {
    if (!authed) return;
    const ch = supabase
      .channel(`teacher-respondents-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "respondent_selections" }, () => {
        const r = roomRef.current;
        if (!r || r.status !== "QUIZ_ACTIVE") return;
        const q = questionsRef.current[r.current_question_index];
        loadAnswerStatus(q?.id, r.current_question_index, groupsRef.current.map((g) => g.id));
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, id]);

  const setStatus = async (status: Room["status"], extra?: Partial<Room>) => {
    const { data } = await supabase.from("rooms").update({ status, ...extra }).eq("id", id).select().single();
    if (data) setRoom(data as Room);
  };

  const startGrouping = async () => {
    if (students.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const maxSize = room?.max_group_size ?? 4;
      // Clear old groups first (cascades votes/respondents)
      await supabase.from("groups").delete().eq("room_id", id);
      const chunks = assignGroups(students, maxSize);
      const { data: created, error: gErr } = await supabase
        .from("groups")
        .insert(chunks.map((_, i) => ({ room_id: id, name: `กลุ่มที่ ${i + 1}` })))
        .select();
      if (gErr) throw gErr;
      for (let gi = 0; gi < chunks.length; gi++) {
        const gid = (created as Group[])[gi].id;
        for (const s of chunks[gi]) {
          await supabase.from("room_students").update({ group_id: gid }).eq("id", s.id);
        }
      }
      await loadGroups();
      await loadStudents();
      await setStatus("GROUPING");
    } catch (e) {
      setError(e instanceof Error ? e.message : "สุ่มกลุ่มไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  const startQuiz = async () => {
    if (questions.length === 0) {
      setError("เพิ่มคำถามอย่างน้อย 1 ข้อก่อนเริ่ม");
      return;
    }
    await setStatus("QUIZ_ACTIVE", { current_question_index: 0 });
  };

  const nextQuestion = async () => {
    if (!room) return;
    const next = room.current_question_index + 1;
    if (next >= questions.length) {
      await setStatus("FINISHED");
    } else {
      await setStatus("QUIZ_ACTIVE", { current_question_index: next });
    }
  };

  const closeRoom = async () => {
    if (!confirm("ปิดห้องนี้? นักเรียนทุกคนจะถูกเด้งออกและรายชื่อในห้องจะถูกล้าง ต้องรอครูเปิดห้องก่อนจึงเข้าใหม่ได้")) return;
    setLoading(true);
    // เตะนักเรียนออกจริง: ลบสมาชิก + กลุ่มทั้งหมดของห้องนี้
    await supabase.from("room_students").delete().eq("room_id", id);
    await supabase.from("groups").delete().eq("room_id", id);
    setStudents([]);
    setGroups([]);
    await setStatus("CLOSED");
    setLoading(false);
  };

  const reopenRoom = async () => {
    await setStatus("LOBBY");
  };

  // ครูสุ่มผู้ตอบให้กลุ่ม (แทนหัวหน้าเลือกเอง)
  const randomizeRespondent = async (groupId: string, questionIndex: number) => {
    const members = students.filter((s) => s.group_id === groupId);
    if (members.length === 0) return;
    const pick = members[Math.floor(Math.random() * members.length)];
    await supabase.from("respondent_selections").upsert(
      { group_id: groupId, question_index: questionIndex, student_id: pick.id },
      { onConflict: "group_id,question_index" }
    );
  };

  // ครูแก้ไขจำนวนสมาชิกต่อกลุ่ม → สุ่มกลุ่มใหม่
  const updateGroupSize = async () => {
    const size = Math.max(2, Math.min(8, newGroupSize));
    setLoading(true);
    setError(null);
    try {
      await supabase.from("groups").delete().eq("room_id", id);
      const chunks = assignGroups(students, size);
      const { data: created, error: gErr } = await supabase
        .from("groups")
        .insert(chunks.map((_, i) => ({ room_id: id, name: `กลุ่มที่ ${i + 1}` })))
        .select();
      if (gErr) throw gErr;
      for (let gi = 0; gi < chunks.length; gi++) {
        const gid = (created as Group[])[gi].id;
        for (const s of chunks[gi]) {
          await supabase.from("room_students").update({ group_id: gid }).eq("id", s.id);
        }
      }
      await supabase.from("rooms").update({ max_group_size: size }).eq("id", id);
      await loadGroups();
      await loadStudents();
      await loadRoom();
      setEditingGroupSize(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "แก้ไขกลุ่มไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  if (!authed) {
    return (
      <div className="min-h-screen">
        <TeacherLogin onSuccess={() => setAuthed(true)} />
      </div>
    );
  }

  if (!room) {
    return <div className="min-h-screen p-6 max-w-4xl mx-auto text-slate-400 text-sm">กำลังโหลดห้อง...</div>;
  }

  const currentQ = questions[room.current_question_index];

  return (
    <div className="min-h-screen p-6 max-w-5xl mx-auto space-y-6">
      <Link href="/teacher" className="text-sm text-slate-400 hover:text-cosmic-cyan">← กลับแดชบอร์ด</Link>
      <div className="glass-panel rounded-2xl p-6 text-center">
        <p className="text-xs uppercase tracking-widest text-slate-400">รหัสห้อง • แชร์ให้นักเรียนที่ /student</p>
        <p className="text-5xl font-extrabold tracking-[0.3em] text-cosmic-gold mt-2">{room.room_code}</p>
        <p className="text-sm text-slate-400 mt-2 flex items-center justify-center gap-2">
          <Users className="w-4 h-4" /> {students.length} คน • {groups.length} กลุ่ม • {questions.length} ข้อ • สถานะ {room.status}
        </p>
      </div>

      {error && <div className="border border-red-500/40 rounded-xl p-3 text-sm text-red-300 bg-red-500/10">{error}</div>}

      {/* Game controls */}
      <div className="glass-panel rounded-2xl p-6">
        <h2 className="font-bold mb-3">ควบคุมเกม</h2>
        <div className="flex flex-wrap gap-3">
          <button onClick={startGrouping} disabled={loading || students.length === 0} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cosmic-cyan/20 border border-cosmic-cyan/40 text-sm font-medium disabled:opacity-50">
            <Shuffle className="w-4 h-4" /> สุ่มแบ่งกลุ่ม (กลุ่มละ {room.max_group_size} คน)
          </button>
          <button onClick={startQuiz} disabled={room.status !== "GROUPING" && room.status !== "LOBBY"} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cosmic-gold/20 border border-cosmic-gold/40 text-sm font-medium disabled:opacity-50">
            <Play className="w-4 h-4" /> เริ่มการแข่งขัน
          </button>
          {room.status === "QUIZ_ACTIVE" && (
            <>
              <button
                onClick={nextQuestion}
                disabled={
                  groups.length === 0 ||
                  (room.current_question_index > 0 && groups.some((g) => !respondents[g.id]))
                }
                title={
                  room.current_question_index > 0 && groups.some((g) => !respondents[g.id])
                    ? "รอครูสุ่มผู้ตอบข้อปัจจุบันก่อน"
                    : "ไปข้อถัดไป"
                }
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm disabled:opacity-50"
              >
                <SkipForward className="w-4 h-4" /> ข้อถัดไป ({room.current_question_index + 1}/{questions.length})
              </button>
              <button onClick={() => setStatus("FINISHED")} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-500/10 border border-red-500/40 text-sm">
                <Square className="w-4 h-4" /> จบเกม
              </button>
            </>
          )}
          {room.status !== "CLOSED" && (
            <button
              onClick={() => { setNewGroupSize(room.max_group_size ?? 4); setEditingGroupSize(true); }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm"
            >
              <Users className="w-4 h-4" /> แก้ไขจำนวนสมาชิกกลุ่ม
            </button>
          )}
          {room.status === "CLOSED" ? (
            <button onClick={reopenRoom} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cosmic-cyan/20 border border-cosmic-cyan/40 text-sm font-medium">
              <Play className="w-4 h-4" /> เปิดห้องอีกครั้ง
            </button>
          ) : (
            <button onClick={closeRoom} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-400 hover:text-red-300 hover:border-red-500/40">
              ปิดห้อง (เด้งนักเรียนออก)
            </button>
          )}
        </div>
        {room.status === "QUIZ_ACTIVE" && currentQ && (
          <div className="mt-4 p-4 rounded-xl bg-white/[0.03] border border-white/10 text-sm">
            <p className="text-slate-400 text-xs">ข้อปัจจุบัน ({room.current_question_index + 1}/{questions.length})</p>
            <p className="font-bold mt-1">{currentQ.question_text}</p>
            <p className="text-xs text-slate-400 mt-1">เฉลย: {String.fromCharCode(65 + currentQ.correct_option)}. {currentQ.options[currentQ.correct_option]} • {currentQ.points} คะแนน • {currentQ.time_limit_sec} วิ</p>
            {room.status === "QUIZ_ACTIVE" && groups.some((g) => !nextRespondents[g.id]) && (
              <p className="text-xs text-cosmic-gold mt-2">
                ⏳ รอเลือกผู้ตอบข้อถัดไป: {groups.filter((g) => !nextRespondents[g.id]).map((g) => g.name).join(", ")}
              </p>
            )}
            <div className="grid md:grid-cols-2 gap-2 mt-3">
              {groups.map((g) => {
                const a = answers[g.id];
                const respName = students.find((s) => s.id === respondents[g.id])?.student_name;
                return (
                  <div key={g.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-cosmic-void border border-white/10 text-xs">
                    <span className="font-medium">{g.name} <span className="text-slate-500">• {respName ?? "ยังไม่เลือกผู้ตอบ"}</span></span>
                    {a ? (
                      <span className={a.is_correct ? "text-cosmic-cyan font-bold" : "text-red-400 font-bold"}>
                        {a.is_correct ? `✓ +${a.points_earned}` : "✗ 0"}
                      </span>
                    ) : (
                      <span className="text-slate-500">รอตอบ...</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Students */}
      <div className="glass-panel rounded-2xl p-6">
        <h2 className="font-bold mb-3">นักเรียนในห้อง ({students.length}) — realtime</h2>
        {room.status === "CLOSED" ? (
          <p className="text-sm text-slate-500">ห้องปิดอยู่ — กด “เปิดห้องอีกครั้ง” ด้านบนเพื่อรับนักเรียนใหม่</p>
        ) : students.length === 0 ? (
          <p className="text-sm text-slate-500">ยังไม่มีนักเรียน — แชร์รหัส {room.room_code}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {students.map((s) => (
              <span key={s.id} className="px-3 py-1.5 rounded-full text-sm bg-white/5 border border-white/10">{s.student_name}</span>
            ))}
          </div>
        )}
      </div>

      {/* Groups */}
      <div className="glass-panel rounded-2xl p-6">
        <h2 className="font-bold mb-3">กลุ่ม ({groups.length}) • คะแนน realtime</h2>
        {groups.length === 0 ? (
          <p className="text-sm text-slate-500">ยังไม่สุ่มกลุ่ม</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {[...groups].sort((a, b) => b.score - a.score).map((g, i) => {
              const members = students.filter((s) => s.group_id === g.id);
              const leader = members.find((m) => m.id === g.leader_student_id);
              const respName = students.find((s) => s.id === respondents[g.id])?.student_name;
              return (
                <div key={g.id} className="rounded-xl p-4 bg-white/[0.03] border border-white/10">
                  <p className="font-bold">{i === 0 ? "🥇 " : ""}{g.name} <span className="text-cosmic-gold">• {g.score} คะแนน</span></p>
                  <p className="text-xs text-slate-400 mt-1">หัวหน้า: {leader?.student_name ?? "รอโหวต..."}</p>
                  {room.status === "QUIZ_ACTIVE" && (
                    <p className="text-xs text-slate-400 mt-1">
                      ผู้ตอบข้อ {room.current_question_index + 1}: <span className="text-cosmic-cyan font-medium">{respName ?? "ยังไม่ได้สุ่ม"}</span>
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {members.map((m) => (
                      <span key={m.id} className="text-xs px-2 py-1 rounded-full bg-white/5 border border-white/10">{m.student_name}</span>
                    ))}
                  </div>
                  {room.status === "QUIZ_ACTIVE" && (
                    <button
                      onClick={() => randomizeRespondent(g.id, room.current_question_index)}
                      className="mt-3 w-full text-xs px-3 py-2 rounded-lg bg-cosmic-violet/20 border border-cosmic-violet/40 hover:bg-cosmic-violet/30 font-medium"
                    >
                      🎲 สุ่มผู้ตอบข้อนี้
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal แก้ไขจำนวนสมาชิกกลุ่ม */}
      {editingGroupSize && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="glass-panel rounded-2xl p-8 max-w-sm w-full mx-4 text-center border-cosmic-cyan/40">
            <p className="text-2xl font-extrabold text-cosmic-cyan mb-2">แก้ไขจำนวนสมาชิกกลุ่ม</p>
            <p className="text-sm text-slate-400 mb-4">
              ตอนนี้มี {students.length} คน กลุ่มละ {room.max_group_size} คน = {groups.length} กลุ่ม
            </p>
            <label className="text-sm text-slate-300">กลุ่มละกี่คน?</label>
            <input
              type="number"
              min={2}
              max={8}
              value={newGroupSize}
              onChange={(e) => setNewGroupSize(Number(e.target.value))}
              className="mt-2 w-24 px-3 py-2 rounded-lg bg-cosmic-void border border-white/10 text-center text-xl font-bold text-cosmic-gold"
            />
            <p className="text-xs text-slate-500 mt-2">
              จะได้ {Math.ceil(students.length / Math.max(2, newGroupSize))} กลุ่ม
            </p>
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setEditingGroupSize(false)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm"
              >
                ยกเลิก
              </button>
              <button
                onClick={updateGroupSize}
                disabled={loading}
                className="flex-1 px-4 py-2.5 rounded-xl bg-cosmic-cyan/20 border border-cosmic-cyan/40 text-sm font-bold disabled:opacity-50"
              >
                บันทึก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Questions in this room */}
      <div>
        <h2 className="font-bold mb-3">คำถามของห้องนี้ {room.quiz_id ? "" : "(ห้องนี้ยังไม่มีชุดข้อสอบ)"}</h2>
        {room.quiz_id ? (
          <QuestionBank pickedQuizId={room.quiz_id} onPickQuiz={() => {}} fixedQuizId={room.quiz_id} />
        ) : (
          <p className="text-sm text-slate-500">ห้องนี้สร้างก่อนระบบผูก quiz อัตโนมัติ — สร้างห้องใหม่เพื่อใช้คำถามรายห้อง</p>
        )}
      </div>
    </div>
  );
}

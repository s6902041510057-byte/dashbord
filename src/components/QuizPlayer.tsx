"use client";

import { useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { CheckCircle2, XCircle, Timer, Crown } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { calculatePoints } from "@/lib/game-logic";
import type { Room, RoomStudent, Group, Question } from "@/types/quiz";

interface AnswerRow {
  id: string;
  group_id: string;
  question_id: string;
  student_id: string;
  selected_option: number;
  is_correct: boolean;
  points_earned: number;
  time_taken_sec: number;
}

interface Props {
  room: Room;
  group: Group;
  me: RoomStudent;
  members: RoomStudent[];
  questions: Question[];
  onGroupUpdate: (g: Group) => void;
}

/** Live quiz player: timer + locked answering + instant reveal + final leaderboard. */
export default function QuizPlayer({ room, group, me, members, questions, onGroupUpdate }: Props) {
  const currentQ = questions[room.current_question_index] ?? null;
  const [respondentId, setRespondentId] = useState<string | null>(null);
  const [answer, setAnswer] = useState<AnswerRow | null>(null);
  const [timeLeft, setTimeLeft] = useState(currentQ?.time_limit_sec ?? 30);
  const [submitting, setSubmitting] = useState(false);
  const [board, setBoard] = useState<Group[]>([]);
  const firedConfetti = useRef(false);

  // Reset timer whenever the question changes
  useEffect(() => {
    setTimeLeft(currentQ?.time_limit_sec ?? 30);
    setAnswer(null);
    setRespondentId(null);
  }, [currentQ?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Countdown
  useEffect(() => {
    if (room.status !== "QUIZ_ACTIVE" || !currentQ || answer || timeLeft <= 0) return;
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, room.status, currentQ, answer]);

  // Load respondent + our group's answer for the current question
  useEffect(() => {
    if (!currentQ) return;
    const load = async () => {
      const { data: resp } = await supabase
        .from("respondent_selections")
        .select("student_id")
        .eq("group_id", group.id)
        .eq("question_index", room.current_question_index)
        .limit(1);
      setRespondentId((resp?.[0] as { student_id: string } | undefined)?.student_id ?? null);

      const { data: ans } = await supabase
        .from("submitted_answers")
        .select("*")
        .eq("group_id", group.id)
        .eq("question_id", currentQ.id)
        .limit(1);
      if (ans?.[0]) setAnswer(ans[0] as AnswerRow);

      const { data: g } = await supabase.from("groups").select("*").eq("id", group.id).single();
      if (g) onGroupUpdate(g as Group);
    };
    load();
    const ch = supabase
      .channel(`quiz-${group.id}-${room.current_question_index}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "respondent_selections", filter: `group_id=eq.${group.id}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "submitted_answers", filter: `group_id=eq.${group.id}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "groups", filter: `id=eq.${group.id}` }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQ?.id, group.id, room.current_question_index]);

  // Final leaderboard + confetti
  useEffect(() => {
    if (room.status !== "FINISHED") return;
    const loadBoard = async () => {
      const { data } = await supabase.from("groups").select("*").eq("room_id", room.id).order("score", { ascending: false });
      if (data) setBoard(data as Group[]);
    };
    loadBoard();
    const ch = supabase
      .channel(`board-${room.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "groups", filter: `room_id=eq.${room.id}` }, loadBoard)
      .subscribe();
    if (!firedConfetti.current) {
      firedConfetti.current = true;
      confetti({ particleCount: 160, spread: 100, origin: { y: 0.6 } });
      setTimeout(() => confetti({ particleCount: 100, spread: 120, origin: { y: 0.4 } }), 800);
    }
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.status, room.id]);

  if (room.status === "FINISHED") {
    const medals = ["🥇", "🥈", "🥉"];
    return (
      <div className="glass-panel rounded-2xl p-6 text-center">
        <h2 className="text-2xl font-extrabold text-cosmic-gold mb-1">🏆 กระดานอันดับสุดท้าย</h2>
        <p className="text-xs text-slate-400 mb-4">กลุ่มของคุณ: {group.name} • {group.score} คะแนน</p>
        <div className="space-y-2">
          {board.map((g, i) => (
            <div
              key={g.id}
              className={`flex items-center justify-between px-4 py-3 rounded-xl border ${g.id === group.id ? "bg-cosmic-gold/10 border-cosmic-gold/50" : "bg-white/[0.03] border-white/10"}`}
            >
              <span className="font-bold">{medals[i] ?? `${i + 1}.`} {g.name}</span>
              <span className="text-cosmic-gold font-bold">{g.score} คะแนน</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!currentQ) {
    return (
      <div className="glass-panel rounded-2xl p-6 text-center text-sm text-slate-400">
        รอครูส่งคำถามข้อแรก...
      </div>
    );
  }

  const respondentName = members.find((m) => m.id === respondentId)?.student_name;
  const iAmRespondent = respondentId === me.id;
  const revealed = !!answer || timeLeft <= 0;
  const canAnswer = iAmRespondent && !answer && timeLeft > 0 && !submitting;
  const timePct = Math.max(0, (timeLeft / currentQ.time_limit_sec) * 100);

  const submitAnswer = async (optIdx: number) => {
    if (!canAnswer) return;
    setSubmitting(true);
    try {
      // กันกดซ้ำ: เช็กก่อนว่ามีคำตอบแล้วหรือยัง
      const { data: existing } = await supabase
        .from("submitted_answers")
        .select("id")
        .eq("group_id", group.id)
        .eq("question_id", currentQ.id)
        .limit(1);
      if (existing && existing.length > 0) {
        setSubmitting(false);
        return;
      }
      const timeTaken = currentQ.time_limit_sec - timeLeft;
      const isCorrect = optIdx === currentQ.correct_option;
      // ตอบถูกเร็วได้โบนัสเพิ่มสูงสุด 30% ของคะแนนข้อ (ยิ่งเหลือเวลาเยอะยิ่งได้เยอะ)
      const points = calculatePoints({
        isCorrect,
        basePoints: currentQ.points,
        timeTakenSec: timeTaken,
        timeLimitSec: currentQ.time_limit_sec,
        speedBonusMax: Math.max(10, Math.round(currentQ.points * 0.3)),
      });
      const { error: insErr } = await supabase.from("submitted_answers").insert({
        room_id: room.id,
        group_id: group.id,
        question_id: currentQ.id,
        student_id: me.id,
        selected_option: optIdx,
        is_correct: isCorrect,
        points_earned: points,
        time_taken_sec: timeTaken,
      });
      if (insErr) throw insErr;
      if (points > 0) {
        const { data: fresh } = await supabase.from("groups").select("score").eq("id", group.id).single();
        const base = (fresh as { score: number } | null)?.score ?? group.score;
        await supabase.from("groups").update({ score: base + points }).eq("id", group.id);
      }
    } catch {
      // เงียบไว้แล้วรอ realtime sync คำตอบของกลุ่ม
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header: group + score + timer */}
      <div className="glass-panel rounded-2xl p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-bold text-cosmic-cyan">{group.name} • {group.score} คะแนน</span>
          <span className={`flex items-center gap-1 font-bold ${timeLeft <= 5 ? "text-red-400" : "text-cosmic-gold"}`}>
            <Timer className="w-4 h-4" /> {timeLeft} วิ
          </span>
        </div>
        <div className="h-2 rounded-full bg-white/10 mt-2 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${timeLeft <= 5 ? "bg-red-500" : "bg-gradient-to-r from-cosmic-cyan to-cosmic-violet"}`}
            style={{ width: `${timePct}%` }}
          />
        </div>
        <p className="text-xs text-slate-400 mt-2">
          ข้อ {room.current_question_index + 1}/{questions.length} • ผู้ตอบข้อนี้:{" "}
          <span className="text-white font-medium">{respondentName ?? "รอหัวหน้าเลือก..."}</span>
          {respondentId && <Crown className="inline w-3 h-3 text-cosmic-gold ml-1" />}
        </p>
      </div>

      {/* Question */}
      <div className="glass-panel rounded-2xl p-6">
        <h2 className="text-lg font-bold">{currentQ.question_text}</h2>
        <div className="grid gap-2 mt-4">
          {currentQ.options.map((op, i) => {
            const isPicked = answer?.selected_option === i;
            const isRight = currentQ.correct_option === i;
            let cls = "bg-white/5 border-white/10";
            if (revealed) {
              if (isRight) cls = "bg-cosmic-cyan/20 border-cosmic-cyan/60";
              else if (isPicked) cls = "bg-red-500/15 border-red-500/50";
            } else if (isPicked) {
              cls = "bg-cosmic-cyan/20 border-cosmic-cyan/50";
            }
            return (
              <button
                key={i}
                disabled={!canAnswer}
                onClick={() => submitAnswer(i)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left text-sm transition-colors disabled:cursor-default ${cls} ${canAnswer ? "hover:border-cosmic-cyan/50" : ""}`}
              >
                <span className="w-8 h-8 shrink-0 rounded-lg bg-cosmic-void border border-white/10 flex items-center justify-center font-bold">
                  {String.fromCharCode(65 + i)}
                </span>
                <span>{op}</span>
              </button>
            );
          })}
        </div>
        {!iAmRespondent && !revealed && respondentId && (
          <p className="text-xs text-slate-500 mt-3 text-center">เฉพาะ {respondentName} เท่านั้นที่กดตอบได้ — ลุ้นไปด้วยกัน!</p>
        )}
        {!respondentId && (
          <p className="text-xs text-slate-500 mt-3 text-center">รอหัวหน้ากลุ่มเลือกผู้ตอบข้อนี้...</p>
        )}
      </div>

      {/* Reveal */}
      {revealed && (
        <div className={`rounded-2xl p-6 text-center border glass-panel ${answer?.is_correct ? "border-cosmic-cyan/50" : "border-red-500/40"}`}>
          {answer ? (
            answer.is_correct ? (
              <>
                <p className="text-2xl font-extrabold text-cosmic-cyan flex items-center justify-center gap-2"><CheckCircle2 className="w-7 h-7" /> ถูกต้อง! +{answer.points_earned} 🎉</p>
                <p className="text-xs text-slate-400 mt-1">
                  ฐาน {currentQ.points} + โบนัสความเร็ว {answer.points_earned - currentQ.points}
                </p>
              </>
            ) : (
              <p className="text-2xl font-extrabold text-red-400 flex items-center justify-center gap-2"><XCircle className="w-7 h-7" /> ผิด! 😢</p>
            )
          ) : (
            <p className="text-2xl font-extrabold text-slate-300">หมดเวลา! ⏱️</p>
          )}
          <p className="text-sm text-slate-400 mt-2">
            เฉลย: {String.fromCharCode(65 + currentQ.correct_option)}. {currentQ.options[currentQ.correct_option]}
            {answer && ` • ใช้เวลา ${Number(answer.time_taken_sec).toFixed(1)} วิ (รวมโบนัสความเร็วแล้ว)`}
          </p>
        </div>
      )}
    </div>
  );
}

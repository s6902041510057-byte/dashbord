"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Quiz, Question } from "@/types/quiz";

interface Props {
  onPickQuiz: (quizId: string | null) => void;
  pickedQuizId: string | null;
  fixedQuizId?: string | null;
}

const emptyForm = { question_text: "", options: ["", "", "", ""], correct_option: 0, time_limit_sec: 30, points: 100 };

export default function QuestionBank({ onPickQuiz, pickedQuizId, fixedQuizId }: Props) {
  const locked = !!fixedQuizId;
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [activeQuiz, setActiveQuiz] = useState<string | null>(pickedQuizId);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [newQuizTitle, setNewQuizTitle] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadQuizzes = async () => {
    const { data } = await supabase.from("quizzes").select("*").order("created_at", { ascending: false });
    if (data) {
      setQuizzes(data as Quiz[]);
      if (!activeQuiz && data.length > 0) {
        setActiveQuiz((data[0] as Quiz).id);
        onPickQuiz((data[0] as Quiz).id);
      }
    }
  };

  const loadQuestions = async (quizId: string) => {
    const { data } = await supabase.from("questions").select("*").eq("quiz_id", quizId).order("order_num", { ascending: true });
    if (data) setQuestions(data as Question[]);
  };

  useEffect(() => {
    if (locked && fixedQuizId) {
      setActiveQuiz(fixedQuizId);
      return;
    }
    loadQuizzes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (locked && fixedQuizId) {
      loadQuestions(fixedQuizId);
      return;
    }
    if (activeQuiz) loadQuestions(activeQuiz);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeQuiz]);

  const createQuiz = async () => {
    if (!newQuizTitle.trim()) return;
    const { data, error: err } = await supabase.from("quizzes").insert({ title: newQuizTitle.trim() }).select().single();
    if (err) {
      setError(err.message);
      return;
    }
    setNewQuizTitle("");
    await loadQuizzes();
    if (data) {
      setActiveQuiz((data as Quiz).id);
      onPickQuiz((data as Quiz).id);
    }
  };

  const saveQuestion = async () => {
    setError(null);
    const targetQuiz = locked ? fixedQuizId : activeQuiz;
    if (!targetQuiz) {
      setError("สร้างหรือเลือกชุดข้อสอบก่อน");
      return;
    }
    if (!form.question_text.trim() || form.options.some((o) => !o.trim())) {
      setError("กรุณากรอกโจทย์และตัวเลือกให้ครบ 4 ข้อ");
      return;
    }
    const payload = {
      quiz_id: targetQuiz,
      question_text: form.question_text.trim(),
      options: form.options.map((o) => o.trim()),
      correct_option: form.correct_option,
      time_limit_sec: form.time_limit_sec,
      points: form.points,
      order_num: editingId ? undefined : questions.length + 1,
    };
    if (editingId) {
      const { error: err } = await supabase.from("questions").update(payload).eq("id", editingId);
      if (err) {
        setError(err.message);
        return;
      }
    } else {
      const { error: err } = await supabase.from("questions").insert(payload);
      if (err) {
        setError(err.message);
        return;
      }
    }
    setForm(emptyForm);
    setEditingId(null);
    await loadQuestions(targetQuiz);
  };

  const editQuestion = (q: Question) => {
    setEditingId(q.id);
    setForm({
      question_text: q.question_text,
      options: [...q.options, "", "", "", ""].slice(0, 4),
      correct_option: q.correct_option,
      time_limit_sec: q.time_limit_sec,
      points: q.points,
    });
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  };

  const deleteQuestion = async (id: string) => {
    if (!confirm("ลบข้อนี้ใช่ไหม?")) return;
    await supabase.from("questions").delete().eq("id", id);
    const targetQuiz = locked ? fixedQuizId : activeQuiz;
    if (targetQuiz) await loadQuestions(targetQuiz);
  };

  return (
    <div className="space-y-6">
      {error && <div className="p-3 rounded-xl text-sm bg-red-500/10 border border-red-500/40 text-red-300">{error}</div>}

      {/* Quiz picker */}
      {!locked && (
      <div className="glass-panel rounded-2xl p-6">
        <h2 className="font-bold mb-3">ชุดข้อสอบ</h2>
        <div className="flex flex-wrap gap-2 mb-4">
          {quizzes.map((q) => (
            <button
              key={q.id}
              onClick={() => {
                setActiveQuiz(q.id);
                onPickQuiz(q.id);
              }}
              className={`px-4 py-2 rounded-full text-sm border ${activeQuiz === q.id ? "bg-cosmic-cyan/20 border-cosmic-cyan/50" : "bg-white/5 border-white/10"}`}
            >
              {q.title}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={newQuizTitle}
            onChange={(e) => setNewQuizTitle(e.target.value)}
            placeholder="ชื่อชุดใหม่ เช่น วิทยาศาสตร์ ม.1"
            maxLength={60}
            className="flex-1 px-4 py-2.5 rounded-xl bg-cosmic-void border border-white/10 text-sm"
          />
          <button onClick={createQuiz} className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm flex items-center gap-1">
            <Plus className="w-4 h-4" /> สร้าง
          </button>
        </div>
      </div>
      )}

      {/* Question list */}
      <div className="glass-panel rounded-2xl p-6">
        <h2 className="font-bold mb-3">คำถามในชุดนี้ ({questions.length} ข้อ)</h2>
        {questions.length === 0 ? (
          <p className="text-sm text-slate-500">ยังไม่มีคำถาม เพิ่มข้อแรกด้านล่างได้เลย</p>
        ) : (
          <div className="space-y-2">
            {questions.map((q, i) => (
              <div key={q.id} className="p-3 rounded-xl bg-white/[0.03] border border-white/10 text-sm">
                <p className="font-medium">{i + 1}. {q.question_text} <span className="text-cosmic-gold">({q.points} คะแนน, {q.time_limit_sec} วิ)</span></p>
                <div className="grid grid-cols-2 gap-1 mt-2 text-xs text-slate-400">
                  {q.options.map((op, oi) => (
                    <span key={oi} className={oi === q.correct_option ? "text-cosmic-cyan font-bold" : ""}>
                      {String.fromCharCode(65 + oi)}. {op} {oi === q.correct_option && "✓"}
                    </span>
                  ))}
                </div>
                <div className="flex gap-2 mt-2">
                  <button onClick={() => editQuestion(q)} className="text-xs flex items-center gap-1 text-slate-400 hover:text-white"><Pencil className="w-3 h-3" /> แก้ไข</button>
                  <button onClick={() => deleteQuestion(q.id)} className="text-xs flex items-center gap-1 text-red-400/80 hover:text-red-300"><Trash2 className="w-3 h-3" /> ลบ</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit form */}
      <div className="glass-panel rounded-2xl p-6">
        <h2 className="font-bold mb-3">{editingId ? "แก้ไขคำถาม" : "เพิ่มคำถามใหม่"}</h2>
        <textarea
          value={form.question_text}
          onChange={(e) => setForm({ ...form, question_text: e.target.value })}
          placeholder="โจทย์ เช่น CPU ย่อมาจากอะไร?"
          rows={2}
          className="w-full px-4 py-3 rounded-xl bg-cosmic-void border border-white/10 text-sm"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
          {form.options.map((op, i) => (
            <div key={i} className="flex items-center gap-2">
              <button
                onClick={() => setForm({ ...form, correct_option: i })}
                title="ตั้งเป็นคำตอบที่ถูก"
                className={`w-8 h-8 rounded-lg text-sm font-bold border ${form.correct_option === i ? "bg-cosmic-cyan/30 border-cosmic-cyan" : "bg-white/5 border-white/10"}`}
              >
                {String.fromCharCode(65 + i)}
              </button>
              <input
                value={op}
                onChange={(e) => {
                  const next = [...form.options];
                  next[i] = e.target.value;
                  setForm({ ...form, options: next });
                }}
                placeholder={`ตัวเลือก ${String.fromCharCode(65 + i)}`}
                className="flex-1 px-3 py-2 rounded-lg bg-cosmic-void border border-white/10 text-sm"
              />
            </div>
          ))}
        </div>
        <div className="flex gap-3 mt-3 text-sm">
          <label className="flex items-center gap-2 text-slate-400">เวลา(วิ)
            <input type="number" min={5} max={300} value={form.time_limit_sec} onChange={(e) => setForm({ ...form, time_limit_sec: Number(e.target.value) })} className="w-20 px-2 py-1.5 rounded-lg bg-cosmic-void border border-white/10" />
          </label>
          <label className="flex items-center gap-2 text-slate-400">คะแนน
            <input type="number" min={10} max={1000} step={10} value={form.points} onChange={(e) => setForm({ ...form, points: Number(e.target.value) })} className="w-20 px-2 py-1.5 rounded-lg bg-cosmic-void border border-white/10" />
          </label>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={saveQuestion} className="px-6 py-2.5 rounded-xl bg-cosmic-cyan/20 border border-cosmic-cyan/40 text-sm font-bold">
            {editingId ? "บันทึกการแก้ไข" : "เพิ่มคำถาม"}
          </button>
          {editingId && (
            <button onClick={() => { setEditingId(null); setForm(emptyForm); }} className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm">
              ยกเลิก
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

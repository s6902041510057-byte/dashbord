"use client";

import { useEffect, useMemo, useState } from "react";
import { Crown, RefreshCw, Check } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { tallyLeaderVotes, canSelectRespondent, isRotationComplete } from "@/lib/game-logic";
import type { RoomStudent, LeaderVote } from "@/types/quiz";

interface Props {
  groupId: string;
  members: RoomStudent[];
  me: RoomStudent;
  groupName: string;
  leaderId?: string | null;
  onLeaderChange: (leaderId: string) => void;
  onNameChange: (name: string) => void;
  /** During quiz: hide voting + naming, show only respondent picker */
  quizMode?: boolean;
}

/** Voting + naming + respondent selection for one group. */
export default function GroupSetup({ groupId, members, me, groupName, leaderId, onLeaderChange, onNameChange, quizMode }: Props) {
  const [votes, setVotes] = useState<LeaderVote[]>([]);
  const [newName, setNewName] = useState(groupName);
  const [respondentId, setRespondentId] = useState<string | null>(null);
  const [answeredIds, setAnsweredIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const memberIds = useMemo(() => members.map((m) => m.id), [members]);
  const voteMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const v of votes) m[v.voter_student_id] = v.voted_student_id;
    return m;
  }, [votes]);
  const result = useMemo(() => tallyLeaderVotes(voteMap, memberIds), [voteMap, memberIds]);
  const isLeader = leaderId === me.id || (!leaderId && result.winnerId === me.id);
  const myVote = votes.find((v) => v.voter_student_id === me.id);

  useEffect(() => {
    const fetchVotes = async () => {
      const { data } = await supabase.from("leader_votes").select("*").eq("group_id", groupId);
      if (data) setVotes(data as LeaderVote[]);
    };
    const fetchRespondent = async () => {
      const { data } = await supabase
        .from("respondent_selections")
        .select("*")
        .eq("group_id", groupId)
        .order("question_index", { ascending: true });
      if (data && data.length > 0) {
        const ids = (data as { student_id: string }[]).map((r) => r.student_id);
        setAnsweredIds(ids);
        // current respondent = last selected if rotation not complete, else none
        setRespondentId(ids[ids.length - 1] ?? null);
      }
    };
    fetchVotes();
    fetchRespondent();
    const ch = supabase
      .channel(`group-${groupId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "leader_votes", filter: `group_id=eq.${groupId}` }, fetchVotes)
      .on("postgres_changes", { event: "*", schema: "public", table: "respondent_selections", filter: `group_id=eq.${groupId}` }, fetchRespondent)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [groupId]);

  // Auto-promote winner to leader
  useEffect(() => {
    if (!result.needsRevote && result.winnerId && result.winnerId !== leaderId) {
      supabase.from("groups").update({ leader_student_id: result.winnerId }).eq("id", groupId).then(() => {
        onLeaderChange(result.winnerId as string);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result.winnerId, result.needsRevote]);

  const vote = async (candidateId: string) => {
    setSaving(true);
    await supabase.from("leader_votes").upsert(
      { group_id: groupId, voter_student_id: me.id, voted_student_id: candidateId },
      { onConflict: "group_id,voter_student_id" }
    );
    setSaving(false);
  };

  const saveName = async () => {
    if (!newName.trim() || !isLeader) return;
    setSaving(true);
    await supabase.from("groups").update({ name: newName.trim() }).eq("id", groupId);
    onNameChange(newName.trim());
    setSaving(false);
  };

  const selectRespondent = async (candidateId: string) => {
    if (!isLeader) return;
    const state = { memberIds, alreadyAnsweredIds: answeredIds };
    if (!canSelectRespondent(state, candidateId)) return;
    setSaving(true);
    const nextIndex = answeredIds.length;
    await supabase.from("respondent_selections").insert({
      group_id: groupId,
      question_index: nextIndex,
      student_id: candidateId,
    });
    setSaving(false);
  };

  const resetRotation = async () => {
    if (!isLeader || !isRotationComplete({ memberIds, alreadyAnsweredIds: answeredIds })) return;
    setSaving(true);
    await supabase.from("respondent_selections").delete().eq("group_id", groupId);
    setAnsweredIds([]);
    setRespondentId(null);
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      {/* Voting */}
      {!quizMode && (
      <div className="glass-panel rounded-2xl p-6">
        <h3 className="font-bold flex items-center gap-2"><Crown className="w-4 h-4 text-cosmic-gold" /> โหวตหัวหน้ากลุ่ม</h3>
        {result.needsRevote && votes.length > 0 && (
          <p className="text-xs text-cosmic-gold mt-2">คะแนนเสมอ ({result.tiedIds.length} คน) — โหวตใหม่เฉพาะผู้ที่เสมอกัน</p>
        )}
        <div className="grid gap-2 mt-3">
          {members.map((m) => {
            const count = result.counts[m.id] ?? 0;
            const tied = result.needsRevote && votes.length > 0 && !result.tiedIds.includes(m.id);
            return (
              <button
                key={m.id}
                disabled={saving || tied}
                onClick={() => vote(m.id)}
                className={`flex items-center justify-between px-4 py-2.5 rounded-xl border text-sm transition-colors disabled:opacity-40 ${
                  myVote?.voted_student_id === m.id
                    ? "bg-cosmic-cyan/20 border-cosmic-cyan/50"
                    : "bg-white/5 border-white/10 hover:border-cosmic-violet/40"
                }`}
              >
                <span>{m.student_name}{m.id === me.id ? " (คุณ)" : ""} {leaderId === m.id && "👑"}</span>
                <span className="flex items-center gap-2 text-slate-400">
                  {count > 0 && <span className="text-cosmic-gold font-bold">{count} โหวต</span>}
                  {myVote?.voted_student_id === m.id && <Check className="w-4 h-4 text-cosmic-cyan" />}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      )}

      {/* Naming (leader only) */}
      {!quizMode && (
      <div className="glass-panel rounded-2xl p-6">
        <h3 className="font-bold">ชื่อกลุ่ม: {groupName}</h3>
        {isLeader ? (
          <div className="flex gap-2 mt-3">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              maxLength={30}
              placeholder="เช่น กลุ่มสายฟ้า"
              className="flex-1 px-4 py-2.5 rounded-xl bg-cosmic-void border border-white/10 text-white text-sm"
            />
            <button onClick={saveName} disabled={saving || !newName.trim()} className="px-5 py-2.5 rounded-xl bg-cosmic-violet/30 border border-cosmic-violet/50 text-sm font-medium disabled:opacity-50">
              บันทึก
            </button>
          </div>
        ) : (
          <p className="text-xs text-slate-500 mt-2">รอหัวหน้ากลุ่มตั้งชื่อ...</p>
        )}
      </div>
      )}

      {/* Respondent selection (leader only) */}
      <div className="glass-panel rounded-2xl p-6">
        <h3 className="font-bold">{quizMode ? "เลือกผู้ตอบข้อถัดไป (ห้ามซ้ำจนครบรอบ)" : "เลือกผู้ตอบคำถาม (ห้ามซ้ำจนครบรอบ)"}</h3>
        <p className="text-xs text-slate-400 mt-1">ตอบไปแล้ว {answeredIds.length}/{memberIds.length} คน {isRotationComplete({ memberIds, alreadyAnsweredIds: answeredIds }) && "— ครบรอบแล้ว กดรีเซ็ตได้"}</p>
        <div className="grid gap-2 mt-3">
          {members.map((m) => {
            const answered = answeredIds.includes(m.id);
            const selectable = isLeader && !answered;
            return (
              <button
                key={m.id}
                disabled={!selectable || saving}
                onClick={() => selectRespondent(m.id)}
                className={`flex items-center justify-between px-4 py-2.5 rounded-xl border text-sm disabled:opacity-40 ${
                  respondentId === m.id ? "bg-cosmic-gold/15 border-cosmic-gold/50" : answered ? "bg-white/[0.02] border-white/5 line-through text-slate-500" : "bg-white/5 border-white/10"
                }`}
              >
                <span>{m.student_name} {answered && "✓"}</span>
                {respondentId === m.id && <span className="text-cosmic-gold text-xs font-bold">ผู้ตอบคนปัจจุบัน</span>}
              </button>
            );
          })}
        </div>
        {isLeader && isRotationComplete({ memberIds, alreadyAnsweredIds: answeredIds }) && memberIds.length > 0 && (
          <button onClick={resetRotation} disabled={saving} className="mt-3 flex items-center gap-2 text-xs px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:border-cosmic-cyan/40">
            <RefreshCw className="w-3 h-3" /> รีเซ็ตเริ่มรอบใหม่
          </button>
        )}
        {!isLeader && <p className="text-xs text-slate-500 mt-2">เฉพาะหัวหน้ากลุ่มเท่านั้นที่เลือกผู้ตอบได้</p>}
      </div>
    </div>
  );
}

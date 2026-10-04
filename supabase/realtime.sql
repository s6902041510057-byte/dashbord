-- เปิด Realtime ให้ทุกตารางของเกม + ส่ง event ครบทุกแบบ (INSERT/UPDATE/DELETE)
-- รันใน SQL Editor ครั้งเดียว (ถ้ามี warning ให้กด Run without RLS เหมือนเดิม)

ALTER PUBLICATION supabase_realtime ADD TABLE
  public.rooms,
  public.room_students,
  public.groups,
  public.leader_votes,
  public.respondent_selections,
  public.submitted_answers,
  public.questions,
  public.quizzes;

-- ให้ UPDATE/DELETE ส่ง payload มาด้วย (ไม่งั้นมีแค่ INSERT ที่ realtime)
ALTER TABLE public.rooms REPLICA IDENTITY FULL;
ALTER TABLE public.room_students REPLICA IDENTITY FULL;
ALTER TABLE public.groups REPLICA IDENTITY FULL;
ALTER TABLE public.leader_votes REPLICA IDENTITY FULL;
ALTER TABLE public.respondent_selections REPLICA IDENTITY FULL;
ALTER TABLE public.submitted_answers REPLICA IDENTITY FULL;
ALTER TABLE public.questions REPLICA IDENTITY FULL;
ALTER TABLE public.quizzes REPLICA IDENTITY FULL;

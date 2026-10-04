CREATE TABLE IF NOT EXISTS public.quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE,
  order_num INT NOT NULL DEFAULT 1,
  question_text TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_option INT NOT NULL,
  time_limit_sec INT NOT NULL DEFAULT 30,
  points INT NOT NULL DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code VARCHAR(6) UNIQUE NOT NULL,
  quiz_id UUID REFERENCES public.quizzes(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'LOBBY',
  current_question_index INT DEFAULT 0,
  max_group_size INT DEFAULT 4,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'pending group',
  leader_student_id UUID,
  score INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.room_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  session_token TEXT UNIQUE NOT NULL,
  group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL,
  is_connected BOOLEAN DEFAULT true,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.groups
  DROP CONSTRAINT IF EXISTS fk_group_leader;

ALTER TABLE public.groups
  ADD CONSTRAINT fk_group_leader
  FOREIGN KEY (leader_student_id) REFERENCES public.room_students(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.respondent_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  question_index INT NOT NULL,
  student_id UUID REFERENCES public.room_students(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(group_id, question_index)
);

CREATE TABLE IF NOT EXISTS public.leader_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  voter_student_id UUID REFERENCES public.room_students(id) ON DELETE CASCADE,
  voted_student_id UUID REFERENCES public.room_students(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(group_id, voter_student_id)
);

CREATE TABLE IF NOT EXISTS public.submitted_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.room_students(id) ON DELETE CASCADE,
  selected_option INT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  points_earned INT NOT NULL DEFAULT 0,
  time_taken_sec NUMERIC(5,2) NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

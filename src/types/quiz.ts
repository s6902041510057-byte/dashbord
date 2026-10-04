export type RoomStatus = 'LOBBY' | 'GROUPING' | 'VOTING' | 'QUIZ_ACTIVE' | 'FINISHED' | 'CLOSED';

export interface Quiz {
  id: string;
  title: string;
  description?: string;
  created_at?: string;
}

export interface Question {
  id: string;
  quiz_id: string;
  order_num: number;
  question_text: string;
  options: string[];
  correct_option: number;
  time_limit_sec: number;
  points: number;
}

export interface Room {
  id: string;
  room_code: string;
  quiz_id?: string;
  status: RoomStatus;
  current_question_index: number;
  max_group_size: number;
  created_at?: string;
}

export interface Group {
  id: string;
  room_id: string;
  name: string;
  leader_student_id?: string;
  score: number;
}

export interface RoomStudent {
  id: string;
  room_id: string;
  student_name: string;
  session_token: string;
  group_id?: string;
  is_connected: boolean;
}

export interface SubmittedAnswer {
  id: string;
  room_id: string;
  group_id: string;
  question_id: string;
  student_id: string;
  selected_option: number;
  is_correct: boolean;
  points_earned: number;
  time_taken_sec: number;
}

export interface LeaderVote {
  id: string;
  group_id: string;
  voter_student_id: string;
  voted_student_id: string;
}

export interface GroupDetail extends Group {
  members: RoomStudent[];
  leaderName?: string;
}

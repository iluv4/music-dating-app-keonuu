// DB row 타입의 단일 소스. routes/repos 어디서든 여기서 import.
// 새 테이블 추가 시 여기에 row + insert 타입만 정의하면 됨.

export type Gender = "male" | "female";

// profiles -------------------------------------------------------------------
export type ProfileRow = {
  user_id: string;
  name: string;
  birth_year: number;
  gender: Gender | null;
  school: string;
  major: string;
  club: string | null;
  bank_holder: string | null;
  is_approved: boolean;
  approved_at: string | null;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ProfileUpsert = {
  user_id: string;
  name: string;
  birth_year: number;
  gender: Gender | null;
  school: string;
  major: string;
  club?: string | null;
  bank_holder: string | null;
  updated_at?: string;
};

export type ProfileUpdate = Partial<
  Omit<ProfileUpsert, "user_id">
> & { updated_at?: string };

// user_songs -----------------------------------------------------------------
export type UserSongRow = {
  id: string;
  user_id: string;
  song_no: number;
  title: string;
  artist: string;
  album: string | null;
  album_img: string | null;
  selected_at: string;
};

export type UserSongInsert = {
  user_id: string;
  song_no: number;
  title: string;
  artist: string;
  album: string | null;
  album_img: string | null;
};

// matches --------------------------------------------------------------------
export type MatchStatus = "pending" | "active" | "ended";

export type MatchRow = {
  id: string;
  user_a: string; // 항상 user_a < user_b (CHECK 제약)
  user_b: string;
  created_at: string;
  status: MatchStatus;
  ended_at: string | null;
  ended_by: string | null;
};

// 채팅 리스트용 — 매칭 + 상대 프로필 일부
export type MatchWithPartner = {
  matchId: string;
  partnerId: string;
  partnerName: string;
  partnerSchool: string;
  partnerGender: Gender | null;
  matchedAt: string;
  status: MatchStatus;
  endedAt: string | null;
  lastMessage: {
    content: string;
    createdAt: string;
    senderId: string;
  } | null;
};

// messages -------------------------------------------------------------------
export type MessageRow = {
  id: string;
  match_id: string;
  sender_id: string;
  content: string;
  image_url: string | null;
  created_at: string;
  read_at: string | null;
};

export type MessageInsert = {
  match_id: string;
  sender_id: string;
  content: string;
  image_url?: string | null;
};

// notifications --------------------------------------------------------------
export type NotificationType = "match" | "message" | "system";

export type NotificationRow = {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
};

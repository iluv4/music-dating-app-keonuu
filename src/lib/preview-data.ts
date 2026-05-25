// 로그인 없이 "둘러보기"(미리보기) 화면에 채우는 샘플 데이터.
// 실제 DB·가입자 PII와 무관한 가짜 데이터로, 비로그인 방문자에게 서비스 전체
// 흐름(홈 매칭 / 채팅 / 마이 / 회원 상세)을 보여주기 위한 용도다.
import type { Song } from "~/lib/song-types";
import type { MatchWithPartner } from "~/lib/db-types";

export const PREVIEW_SONGS: Song[] = [
  { songNo: -1, title: "Ditto", artist: "NewJeans" },
  { songNo: -2, title: "사건의 지평선", artist: "윤하" },
  { songNo: -3, title: "주저하는 연인들을 위해", artist: "잔나비" },
  { songNo: -4, title: "밤편지", artist: "아이유" },
];

export const PREVIEW_PARTNER_SONGS: Song[] = [
  { songNo: -11, title: "Hype Boy", artist: "NewJeans" },
  { songNo: -12, title: "사건의 지평선", artist: "윤하" },
  { songNo: -13, title: "헤픈 우연", artist: "헤이즈" },
];

export const PREVIEW_MATCH: MatchWithPartner = {
  matchId: "preview",
  partnerId: "preview-partner",
  partnerName: "지민",
  partnerSchool: "OO대학교",
  partnerGender: "female",
  matchedAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
  status: "active",
  endedAt: null,
  lastMessage: {
    content: "윤하 노래 진짜 좋아해요! 사건의 지평선 자주 들어요 🎶",
    createdAt: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
    senderId: "preview-partner",
  },
};

export const PREVIEW_PROFILE = {
  user_id: "preview-me",
  name: "음악러버",
  birth_year: 2001,
  gender: "male" as const,
  school: "OO대학교",
  campus: null as string | null,
  major: "컴퓨터공학과",
  region: null as string | null,
  bank_holder: null as string | null,
  is_approved: true,
};

export const PREVIEW_MEMBER = {
  user_id: "preview-member",
  name: "서연",
  school: "OO대학교",
  gender: "female" as const,
  songs: PREVIEW_PARTNER_SONGS,
};

export type PreviewMessage = {
  id: string;
  fromMe: boolean;
  content: string;
  time: string;
};

export const PREVIEW_MESSAGES: PreviewMessage[] = [
  { id: "p1", fromMe: false, content: "안녕하세요! 음악 취향 비슷해서 반가워요 😊", time: "오후 2:14" },
  { id: "p2", fromMe: true, content: "안녕하세요~ 저도 윤하 좋아해서 신기했어요!", time: "오후 2:16" },
  { id: "p3", fromMe: false, content: "사건의 지평선 들으면서 산책하는 거 좋아해요 🎧", time: "오후 2:18" },
  { id: "p4", fromMe: true, content: "오 완전 취향! 다음에 같이 들을 곡 추천해주세요", time: "오후 2:20" },
];

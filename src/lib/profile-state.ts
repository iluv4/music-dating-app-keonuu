import { useEffect, useState } from "react";
import { DEFAULT_SCHOOL, type Campus, type MatchCampusPref } from "./campus";

export type ProfileForm = {
  name: string;
  birthYear: string;
  gender: "male" | "female" | "";
  school: string;
  campus: Campus | "";
  major: string;
  club: string;
  region: string;
  matchCampusPref: MatchCampusPref;
  bankHolder: string;
  photoPath: string;
};

const EMPTY: ProfileForm = {
  name: "",
  birthYear: "",
  gender: "",
  // 주최교를 기본 제안. 다른 대학 학생은 가입 화면에서 학교명을 바꾸면 됨.
  school: DEFAULT_SCHOOL.name,
  campus: "",
  major: "",
  club: "",
  region: "",
  matchCampusPref: "상관없음",
  bankHolder: "",
  photoPath: "",
};

const KEY = "profile-draft";

export function readProfile(): ProfileForm {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return EMPTY;
    return { ...EMPTY, ...JSON.parse(raw) };
  } catch {
    return EMPTY;
  }
}

export function writeProfile(patch: Partial<ProfileForm>) {
  if (typeof window === "undefined") return;
  const next = { ...readProfile(), ...patch };
  window.sessionStorage.setItem(KEY, JSON.stringify(next));
}

export function useProfile() {
  const [state, setState] = useState<ProfileForm>(EMPTY);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(readProfile());
    setHydrated(true);
  }, []);

  const update = (patch: Partial<ProfileForm>) => {
    setState((prev) => {
      const next = { ...prev, ...patch };
      window.sessionStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  };

  return { state, update, hydrated };
}

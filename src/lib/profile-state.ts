import { useEffect, useState } from "react";
import type { Campus, MatchCampusPref } from "./campus";

export type ProfileForm = {
  name: string;
  birthYear: string;
  gender: "male" | "female" | "";
  campus: Campus | "";
  major: string;
  club: string;
  region: string;
  matchCampusPref: MatchCampusPref;
  bankHolder: string;
};

const EMPTY: ProfileForm = {
  name: "",
  birthYear: "",
  gender: "",
  campus: "",
  major: "",
  club: "",
  region: "",
  matchCampusPref: "상관없음",
  bankHolder: "",
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

import { useEffect, useState } from "react";

export type ProfileForm = {
  name: string;
  birthYear: string;
  gender: "male" | "female" | "";
  school: string;
  major: string;
  club: string;
  bankHolder: string;
};

const EMPTY: ProfileForm = {
  name: "",
  birthYear: "",
  gender: "",
  school: "",
  major: "",
  club: "",
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

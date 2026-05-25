import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import {
  json,
  redirect,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "@remix-run/node";
import {
  Form,
  useActionData,
  useLoaderData,
  useNavigate,
  useNavigation,
} from "@remix-run/react";
import StatusBar from "~/components/StatusBar";
import HomeIndicator from "~/components/HomeIndicator";
import PhoneFrame from "~/components/PhoneFrame";
import TextInput from "~/components/TextInput";
import CampusSelect from "~/components/CampusSelect";
import DeptSelect from "~/components/DeptSelect";
import RegionSelect from "~/components/RegionSelect";
import MatchCampusPrefSelect from "~/components/MatchCampusPrefSelect";
import { PrimaryButton } from "~/components/Button";
import { COLORS, TYPOGRAPHY } from "~/lib/constants";
import { requireUser } from "~/lib/auth.server";
import {
  DEFAULT_SCHOOL,
  isCampus,
  isMatchCampusPref,
  type Campus,
  type MatchCampusPref,
} from "~/lib/campus";
import {
  getProfileFields,
  updateProfile,
} from "~/lib/repos/profiles.server";
import { getSupabaseBrowser } from "~/lib/supabase.client";
import { getClientEnv } from "~/lib/env.client";
import { downscaleImage } from "~/lib/image.client";

const CURRENT_YEAR = new Date().getFullYear();

export async function loader({ request }: LoaderFunctionArgs) {
  const ctx = await requireUser(request);
  const profile = await getProfileFields(ctx.supabase, ctx.user.id, [
    "name",
    "birth_year",
    "gender",
    "school",
    "campus",
    "major",
    "region",
    "match_campus_pref",
    "bank_holder",
    "photo_url",
  ]);

  if (!profile) {
    throw redirect("/profile/basic", { headers: ctx.headers });
  }

  return json({ profile }, { headers: ctx.headers });
}

type ActionData = { error: string };

export async function action({ request }: ActionFunctionArgs) {
  const ctx = await requireUser(request);
  const fd = await request.formData();

  const name = String(fd.get("name") ?? "").trim();
  const birthYearStr = String(fd.get("birth_year") ?? "").trim();
  const gender = String(fd.get("gender") ?? "").trim();
  const campusRaw = String(fd.get("campus") ?? "").trim();
  const campus = isCampus(campusRaw) ? campusRaw : "";
  const school = DEFAULT_SCHOOL.name;
  const major = String(fd.get("major") ?? "").trim();
  const region = String(fd.get("region") ?? "").trim();
  const matchPrefRaw = String(fd.get("match_campus_pref") ?? "").trim();
  const matchCampusPref = isMatchCampusPref(matchPrefRaw) ? matchPrefRaw : "상관없음";
  const bankHolder = String(fd.get("bank_holder") ?? "").trim();
  const photoUrlRaw = String(fd.get("photo_url") ?? "").trim();

  const birthYear = Number(birthYearStr);
  if (!name)
    return json<ActionData>(
      { error: "이름을 입력해주세요." },
      { status: 400, headers: ctx.headers },
    );
  if (!birthYear || birthYear < 1950 || birthYear > CURRENT_YEAR)
    return json<ActionData>(
      { error: "출생연도를 확인해주세요." },
      { status: 400, headers: ctx.headers },
    );
  if (gender !== "male" && gender !== "female")
    return json<ActionData>(
      { error: "성별을 선택해주세요." },
      { status: 400, headers: ctx.headers },
    );
  if (!campus)
    return json<ActionData>(
      { error: "캠퍼스를 선택해주세요." },
      { status: 400, headers: ctx.headers },
    );
  if (major.length < 2)
    return json<ActionData>(
      { error: "학과명을 확인해주세요." },
      { status: 400, headers: ctx.headers },
    );
  if (bankHolder.length < 2)
    return json<ActionData>(
      { error: "입금자명을 확인해주세요." },
      { status: 400, headers: ctx.headers },
    );

  // 사진 경로는 본인 폴더(user_id/...)만 허용 — 임의 경로 주입 방지.
  // 빈 값이면 사진 제거(null)로 처리.
  const photoUrl =
    photoUrlRaw && photoUrlRaw.startsWith(`${ctx.user.id}/`)
      ? photoUrlRaw
      : photoUrlRaw === ""
        ? null
        : undefined;

  const result = await updateProfile(ctx.supabase, ctx.user.id, {
    name,
    birth_year: birthYear,
    gender,
    school,
    campus,
    major,
    region: region || null,
    match_campus_pref: matchCampusPref,
    bank_holder: bankHolder,
    ...(photoUrl !== undefined ? { photo_url: photoUrl } : {}),
  });

  if (!result.ok) {
    return json<ActionData>(
      { error: "저장 중 오류가 발생했어요." },
      { status: 500, headers: ctx.headers },
    );
  }

  return redirect("/mypage", { headers: ctx.headers });
}

const genderBtnStyle = (selected: boolean): CSSProperties => ({
  flex: 1,
  height: "56px",
  borderRadius: "12px",
  border: "none",
  background: selected ? COLORS.accentSoft : "white",
  color: selected ? COLORS.accent : COLORS.text.primary,
  ...TYPOGRAPHY.bodyBold,
});

export default function ProfileEdit() {
  const { profile } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const navigate = useNavigate();
  const submitting = navigation.state === "submitting";

  const [name, setName] = useState(profile.name);
  const [birthYear, setBirthYear] = useState(String(profile.birth_year ?? ""));
  const [gender, setGender] = useState<"male" | "female">(
    profile.gender ?? "male",
  );
  const [campus, setCampus] = useState<Campus | "">(
    isCampus(profile.campus) ? profile.campus : "",
  );
  const [major, setMajor] = useState(profile.major);
  const [region, setRegion] = useState(profile.region ?? "");
  const [matchCampusPref, setMatchCampusPref] = useState<MatchCampusPref>(
    isMatchCampusPref(profile.match_campus_pref)
      ? profile.match_campus_pref
      : "상관없음",
  );
  const [bankHolder, setBankHolder] = useState(profile.bank_holder ?? "");

  // 프로필 사진 — 경로(photoPath)는 폼으로 저장하고, 미리보기는 단기 서명 URL.
  const [photoPath, setPhotoPath] = useState<string>(profile.photo_url ?? "");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 본인 사진 미리보기: 자기 버킷 객체라 브라우저에서 직접 서명 가능(RLS owner select).
  useEffect(() => {
    let active = true;
    if (!photoPath) {
      setPhotoPreview(null);
      return;
    }
    (async () => {
      try {
        const env = getClientEnv();
        const supabase = getSupabaseBrowser({
          url: env.SUPABASE_URL,
          anonKey: env.SUPABASE_ANON_KEY,
        });
        const { data } = await supabase.storage
          .from("profile-photos")
          .createSignedUrl(photoPath, 300);
        if (active && data?.signedUrl) setPhotoPreview(data.signedUrl);
      } catch {
        /* 미리보기 실패는 무시(저장에는 영향 없음) */
      }
    })();
    return () => {
      active = false;
    };
  }, [photoPath]);

  const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

  const onPickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || photoUploading) return;
    setPhotoError(null);
    if (!file.type.startsWith("image/")) {
      setPhotoError("이미지 파일만 올릴 수 있어요.");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setPhotoError("사진은 5MB 이하만 올릴 수 있어요.");
      return;
    }
    setPhotoUploading(true);
    try {
      const env = getClientEnv();
      const supabase = getSupabaseBrowser({
        url: env.SUPABASE_URL,
        anonKey: env.SUPABASE_ANON_KEY,
      });
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setPhotoError("로그인이 만료됐어요. 새로고침 후 다시 시도해주세요.");
        return;
      }
      const { blob, ext } = await downscaleImage(file);
      const path = `${session.user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("profile-photos")
        .upload(path, blob, { contentType: blob.type, upsert: false });
      if (error) throw error;
      setPhotoPath(path);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[profile photo upload]", err);
      setPhotoError(`사진 업로드 실패: ${msg}`);
    } finally {
      setPhotoUploading(false);
    }
  };

  // 캠퍼스를 바꾸면 학과는 캠퍼스별 목록이라 초기화.
  const selectCampus = (next: Campus) => {
    if (next === campus) return;
    setCampus(next);
    setMajor("");
  };

  const yearNum = Number(birthYear);
  const canSubmit =
    name.trim().length >= 1 &&
    /^\d{4}$/.test(birthYear) &&
    yearNum >= 1950 &&
    yearNum <= CURRENT_YEAR &&
    (gender === "male" || gender === "female") &&
    campus !== "" &&
    major.trim().length >= 2 &&
    bankHolder.trim().length >= 2 &&
    !submitting;

  return (
    <PhoneFrame>
      <StatusBar />
      <Form
        method="post"
        style={{
          flex: 1,
          padding: "0 25px",
          paddingBottom: "120px",
          position: "relative",
        }}
      >
        {/* 헤더 */}
        <div
          style={{
            position: "relative",
            height: "52px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <button
            type="button"
            onClick={() => navigate("/mypage")}
            aria-label="back"
            style={{
              position: "absolute",
              left: 0,
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: "22px",
              color: COLORS.text.secondary,
              background: "none",
              padding: "4px 6px",
            }}
          >
            ‹
          </button>
          <h1
            style={{
              ...TYPOGRAPHY.bodyBold,
              fontSize: "17px",
              color: COLORS.text.primary,
              margin: 0,
            }}
          >
            내 정보 수정
          </h1>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            marginTop: "20px",
          }}
        >
          {/* 프로필 사진 — 본인 인증(입구컷) + 매칭 후 상대에게만 공개 */}
          <input type="hidden" name="photo_url" value={photoPath} />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-label="프로필 사진 등록"
              style={{
                width: "104px",
                height: "104px",
                borderRadius: "50%",
                border: `2px solid ${COLORS.accentSoft}`,
                background: photoPreview
                  ? `center / cover no-repeat url(${photoPreview})`
                  : COLORS.cardBg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "32px",
                color: COLORS.text.placeholder,
                position: "relative",
                overflow: "hidden",
                cursor: photoUploading ? "wait" : "pointer",
              }}
            >
              {!photoPreview && (photoUploading ? "…" : "＋")}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={onPickPhoto}
              style={{ display: "none" }}
            />
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  ...TYPOGRAPHY.caption,
                  color: COLORS.text.secondary,
                }}
              >
                {photoUploading
                  ? "업로드 중…"
                  : photoPreview
                    ? "사진 변경하려면 눌러주세요"
                    : "프로필 사진을 등록해주세요"}
              </div>
              <div
                style={{
                  ...TYPOGRAPHY.tiny,
                  color: COLORS.text.placeholder,
                  marginTop: "3px",
                }}
              >
                본인 확인용이며, 매칭된 상대에게만 공개돼요
              </div>
            </div>
            {photoPreview && (
              <button
                type="button"
                onClick={() => {
                  setPhotoPath("");
                  setPhotoPreview(null);
                }}
                style={{
                  ...TYPOGRAPHY.tiny,
                  color: COLORS.text.helper,
                  background: "none",
                  textDecoration: "underline",
                }}
              >
                사진 삭제
              </button>
            )}
            {photoError && (
              <div style={{ ...TYPOGRAPHY.tiny, color: COLORS.accent }}>
                {photoError}
              </div>
            )}
          </div>

          <TextInput
            label="이름"
            name="name"
            type="text"
            placeholder="홍길동"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <TextInput
            label="출생연도"
            name="birth_year"
            type="text"
            inputMode="numeric"
            maxLength={4}
            placeholder="예) 2003"
            value={birthYear}
            onChange={(e) =>
              setBirthYear(e.target.value.replace(/\D/g, "").slice(0, 4))
            }
          />

          {/* 성별 */}
          <div>
            <div
              style={{
                ...TYPOGRAPHY.bodyBold,
                color: COLORS.text.primary,
                marginBottom: "10px",
              }}
            >
              성별
            </div>
            <input type="hidden" name="gender" value={gender} />
            <div style={{ display: "flex", gap: "12px" }}>
              <button
                type="button"
                onClick={() => setGender("male")}
                style={genderBtnStyle(gender === "male")}
              >
                남자
              </button>
              <button
                type="button"
                onClick={() => setGender("female")}
                style={genderBtnStyle(gender === "female")}
              >
                여자
              </button>
            </div>
          </div>

          <input type="hidden" name="campus" value={campus} />
          <CampusSelect label="학교" value={campus} onChange={selectCampus} />

          <input type="hidden" name="major" value={major} />
          <DeptSelect
            label="학과"
            value={major}
            campus={campus}
            onChange={setMajor}
          />

          <input type="hidden" name="region" value={region} />
          <RegionSelect label="거주지역" value={region} onChange={setRegion} />

          <input
            type="hidden"
            name="match_campus_pref"
            value={matchCampusPref}
          />
          <MatchCampusPrefSelect
            value={matchCampusPref}
            onChange={setMatchCampusPref}
          />

          <TextInput
            label="입금자명"
            name="bank_holder"
            type="text"
            placeholder="홍길동"
            value={bankHolder}
            onChange={(e) => setBankHolder(e.target.value)}
          />
        </div>

        {actionData?.error && (
          <p
            style={{
              ...TYPOGRAPHY.caption,
              color: COLORS.accent,
              marginTop: "16px",
            }}
          >
            {actionData.error}
          </p>
        )}

        <div
          style={{
            position: "absolute",
            bottom: "34px",
            left: "50%",
            transform: "translateX(-50%)",
          }}
        >
          <PrimaryButton type="submit" disabled={!canSubmit}>
            {submitting ? "저장 중..." : "저장"}
          </PrimaryButton>
        </div>
      </Form>
      <HomeIndicator />
    </PhoneFrame>
  );
}

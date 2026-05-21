import { Link, useNavigate } from "@remix-run/react";
import StatusBar from "~/components/StatusBar";
import HomeIndicator from "~/components/HomeIndicator";
import PhoneFrame from "~/components/PhoneFrame";
import { PrimaryButton } from "~/components/Button";
import { COLORS, TYPOGRAPHY } from "~/lib/constants";

const Dot = ({
  size,
  top,
  left,
  color = COLORS.accentSoft,
}: {
  size: number;
  top: number;
  left: number;
  color?: string;
}) => (
  <span
    style={{
      position: "absolute",
      top: `${top}px`,
      left: `${left}px`,
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: "50%",
      background: color,
    }}
  />
);

export default function Welcome() {
  const navigate = useNavigate();

  return (
    <PhoneFrame>
      <StatusBar />
      <div style={{ position: "relative", flex: 1 }}>
        {/* 좌측 장식 도트 */}
        <Dot size={16} top={158} left={91} />
        <Dot size={9} top={196} left={91} />
        <Dot size={9} top={162} left={131} />
        {/* 우측 장식 도트 */}
        <Dot size={16} top={162} left={283} />
        <Dot size={9} top={162} left={252} />
        <Dot size={9} top={202} left={286} />

        {/* 제목 */}
        <h1
          style={{
            ...TYPOGRAPHY.display,
            position: "absolute",
            top: "179px",
            left: "50%",
            transform: "translateX(-50%)",
            color: COLORS.accent,
            margin: 0,
            whiteSpace: "nowrap",
          }}
        >
          환영합니다!
        </h1>

        {/* 서브타이틀 */}
        <p
          style={{
            ...TYPOGRAPHY.body,
            position: "absolute",
            top: "243px",
            left: "50%",
            transform: "translateX(-50%)",
            color: COLORS.text.helper,
            textAlign: "center",
            margin: 0,
            whiteSpace: "nowrap",
          }}
        >
          <span style={{ fontWeight: 700 }}>노래</span>
          로 이어지는{" "}
          <span style={{ fontWeight: 700 }}>인연</span>
          <br />
          지금 만나러 가볼까요?
        </p>

        {/* 마스코트 일러스트 */}
        <img
          src="/images/welcome-mascot.png"
          alt=""
          style={{
            position: "absolute",
            top: "321px",
            left: "23px",
            width: "344px",
            height: "314px",
            objectFit: "contain",
          }}
        />

        {/* CTA */}
        <PrimaryButton
          onClick={() => navigate("/terms")}
          style={{
            position: "absolute",
            top: "720px",
            left: "50%",
            transform: "translateX(-50%)",
          }}
        >
          시작하기
        </PrimaryButton>

        {/* 로그인 링크 */}
        <div
          style={{
            position: "absolute",
            top: "800px",
            left: "50%",
            transform: "translateX(-50%)",
            ...TYPOGRAPHY.label,
            color: COLORS.text.helper,
            whiteSpace: "nowrap",
          }}
        >
          이미 계정 있어요?{" "}
          <Link
            to="/login"
            style={{
              color: COLORS.accent,
              fontWeight: 600,
              textDecoration: "underline",
            }}
          >
            로그인
          </Link>
        </div>
      </div>
      <HomeIndicator />
    </PhoneFrame>
  );
}

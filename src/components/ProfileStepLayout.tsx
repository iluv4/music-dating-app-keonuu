import type { ReactNode } from "react";
import StatusBar from "~/components/StatusBar";
import HomeIndicator from "~/components/HomeIndicator";
import PhoneFrame from "~/components/PhoneFrame";
import ProgressDots from "~/components/ProgressDots";
import { PrimaryButton } from "~/components/Button";
import { COLORS, TYPOGRAPHY } from "~/lib/constants";

type ProfileStepLayoutProps = {
  step: number;
  total?: number;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  ctaLabel?: string;
  ctaDisabled?: boolean;
  onCta: () => void;
};

export const ProfileStepLayout = ({
  step,
  total = 5,
  title,
  subtitle,
  children,
  ctaLabel = "다음으로",
  ctaDisabled = false,
  onCta,
}: ProfileStepLayoutProps) => {
  return (
    <PhoneFrame>
      <StatusBar />
      <div
        style={{
          flex: 1,
          padding: "0 25px",
          paddingBottom: "120px",
          position: "relative",
        }}
      >
        <div style={{ marginTop: "30px", marginBottom: "40px" }}>
          <ProgressDots total={total} current={step} />
        </div>
        <h1
          style={{
            ...TYPOGRAPHY.headlineMd,
            color: COLORS.text.primary,
            margin: 0,
            marginBottom: subtitle ? "12px" : "32px",
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            style={{
              ...TYPOGRAPHY.body,
              color: COLORS.text.helper,
              margin: 0,
              marginBottom: "32px",
            }}
          >
            {subtitle}
          </p>
        )}
        {children}
      </div>
      <div
        style={{
          position: "absolute",
          bottom: "34px",
          left: "50%",
          transform: "translateX(-50%)",
        }}
      >
        <PrimaryButton disabled={ctaDisabled} onClick={onCta}>
          {ctaLabel}
        </PrimaryButton>
      </div>
      <HomeIndicator />
    </PhoneFrame>
  );
};

export default ProfileStepLayout;

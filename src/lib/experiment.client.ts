// PostHog 실험(A/B 테스트) 헬퍼.
// 실험은 PostHog 대시보드에서 "멀티배리언트 피처플래그 + 목표 지표"로 만들고,
// 클라이언트는 이 훅으로 변형값을 읽어 UI 를 분기한다.
// 플래그가 아직 안 왔거나 PostHog 키가 없으면 fallback(보통 "control") 을 반환 → SSR/무키 환경 안전.
import { useEffect, useState } from "react";
import { getFeatureFlag, onFeatureFlagsReady } from "./analytics.client";

export function useExperiment(flagKey: string, fallback = "control"): string {
  const [variant, setVariant] = useState(fallback);

  useEffect(() => {
    return onFeatureFlagsReady(() => {
      const value = getFeatureFlag(flagKey);
      if (typeof value === "string") setVariant(value);
      else if (value === true) setVariant("test");
    });
  }, [flagKey]);

  return variant;
}

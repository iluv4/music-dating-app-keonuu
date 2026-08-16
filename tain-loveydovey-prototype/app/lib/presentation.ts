// 캐릭터 시각 표현 메타 (일러스트 대신 이모지+그라데이션+해시태그)
// harness의 Character 타입은 건드리지 않고, UI 표현만 여기서 매핑한다.

export interface CharacterVisual {
  emoji: string;
  gradient: string; // tailwind gradient classes
  hashtags: string[];
}

export const CHARACTER_VISUALS: Record<string, CharacterVisual> = {
  yujin: {
    emoji: "🤺",
    gradient: "from-[#FF85A8] to-[#C92E5A]",
    hashtags: ["#츤데레", "#검도부선배", "#반말", "#무뚝뚝"],
  },
  haru: {
    emoji: "🌻",
    gradient: "from-[#FFC24B] to-[#FF5C8A]",
    hashtags: ["#햇살", "#소꿉친구", "#애교", "#다정"],
  },
  doyun: {
    emoji: "☕",
    gradient: "from-[#FFB3C7] to-[#9061f9]",
    hashtags: ["#연상", "#카페사장", "#존댓말", "#어른미"],
  },
};

export function visualFor(id: string): CharacterVisual {
  return (
    CHARACTER_VISUALS[id] ?? {
      emoji: "💗",
      gradient: "from-brand-400 to-brand-600",
      hashtags: ["#캐릭터"],
    }
  );
}

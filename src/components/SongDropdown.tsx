import type { Song } from "~/lib/song-types";
import { COLORS, TYPOGRAPHY, RADIUS } from "~/lib/constants";

type Props = {
  items: Song[];
  onPick: (song: Song) => void;
  emptyMessage?: string;
};

const BORDER = "none";

export const SongDropdown = ({ items, onPick, emptyMessage }: Props) => {
  if (items.length === 0) {
    return (
      <div
        style={{
          boxSizing: "border-box",
          width: "100%",
          padding: "24px 16px",
          background: "white",
          border: BORDER,
          borderRadius: RADIUS.info,
          ...TYPOGRAPHY.label,
          color: COLORS.text.placeholder,
          textAlign: "center",
        }}
      >
        {emptyMessage ?? "검색 결과가 없습니다."}
      </div>
    );
  }

  return (
    <div
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        maxHeight: "420px",
        overflowY: "auto",
      }}
    >
      {items.map((song) => (
        <button
          key={song.songNo}
          type="button"
          onClick={() => onPick(song)}
          style={{
            boxSizing: "border-box",
            width: "100%",
            padding: "14px 18px",
            background: "white",
            border: BORDER,
            borderRadius: RADIUS.info,
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: "4px",
            textAlign: "left",
          }}
        >
          <span
            style={{
              ...TYPOGRAPHY.body,
              color: COLORS.text.primary,
              fontWeight: 600,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: "100%",
            }}
          >
            {song.title}
          </span>
          <span
            style={{
              ...TYPOGRAPHY.caption,
              color: COLORS.text.placeholder,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: "100%",
            }}
          >
            {song.artist}
          </span>
        </button>
      ))}
    </div>
  );
};

export default SongDropdown;

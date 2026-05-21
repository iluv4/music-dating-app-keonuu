import type { Song } from "~/lib/song-types";
import NoteIcon from "~/components/NoteIcon";
import { COLORS, TYPOGRAPHY, RADIUS } from "~/lib/constants";

type Props = {
  song: Song;
  onRemove: (songNo: number) => void;
};

export const SelectedSongCard = ({ song, onRemove }: Props) => {
  return (
    <div
      style={{
        boxSizing: "border-box",
        width: "100%",
        height: "56px",
        padding: "0 14px",
        background: COLORS.accentSoft,
        borderRadius: RADIUS.info,
        display: "flex",
        alignItems: "center",
        gap: "10px",
      }}
    >
      <NoteIcon size={18} />
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          alignItems: "center",
          gap: "6px",
          color: COLORS.accent,
          ...TYPOGRAPHY.body,
          fontWeight: 500,
        }}
      >
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {song.title} - {song.artist}
        </span>
      </div>
      <button
        type="button"
        onClick={() => onRemove(song.songNo)}
        aria-label="선택 해제"
        style={{
          width: "20px",
          height: "20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: COLORS.accent,
          fontSize: "16px",
          flexShrink: 0,
        }}
      >
        ✕
      </button>
    </div>
  );
};

export default SelectedSongCard;

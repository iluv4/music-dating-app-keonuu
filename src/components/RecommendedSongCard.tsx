import type { Song } from "~/lib/song-types";
import NoteIcon from "~/components/NoteIcon";
import { COLORS, TYPOGRAPHY, RADIUS } from "~/lib/constants";

type Props = {
  song: Song;
  onPick: (song: Song) => void;
};

export const RecommendedSongCard = ({ song, onPick }: Props) => {
  return (
    <button
      type="button"
      onClick={() => onPick(song)}
      style={{
        width: "100%",
        padding: "10px 14px",
        background: "white",
        border: "none",
        borderRadius: RADIUS.info,
        display: "flex",
        alignItems: "center",
        gap: "12px",
        textAlign: "left",
        marginBottom: "10px",
      }}
    >
      {song.albumImg ? (
        <img
          src={song.albumImg}
          alt=""
          loading="lazy"
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "6px",
            objectFit: "cover",
            flexShrink: 0,
            background: COLORS.cardBg,
          }}
        />
      ) : (
        <div
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "6px",
            background: COLORS.cardBg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <NoteIcon size={22} color={COLORS.text.placeholder} />
        </div>
      )}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          gap: "2px",
        }}
      >
        <span
          style={{
            ...TYPOGRAPHY.body,
            color: COLORS.text.primary,
            fontWeight: 500,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
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
          }}
        >
          {song.artist}
        </span>
      </div>
    </button>
  );
};

export default RecommendedSongCard;

type NoteIconProps = {
  size?: number;
  color?: string;
};

export const NoteIcon = ({ size = 18, color = "#ff0558" }: NoteIconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 18 18"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M14.25 2.5L7.5 4V11.5"
      stroke={color}
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M14.25 2.5V11"
      stroke={color}
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <ellipse
      cx="5.5"
      cy="13"
      rx="2"
      ry="1.6"
      fill={color}
    />
    <ellipse
      cx="12.25"
      cy="11"
      rx="2"
      ry="1.6"
      fill={color}
    />
  </svg>
);

export default NoteIcon;

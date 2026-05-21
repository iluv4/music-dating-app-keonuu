// 상태바 (9:41 / 신호·와이파이·배터리) 제거됨.
// 컴포넌트는 호환성 유지용으로 남기되 아무것도 렌더하지 않음.
type StatusBarProps = {
  transparent?: boolean;
};

export const StatusBar = (_: StatusBarProps) => null;

export default StatusBar;

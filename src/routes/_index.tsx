import { useEffect } from "react";
import { useNavigate } from "@remix-run/react";
import StatusBar from "~/components/StatusBar";
import HomeIndicator from "~/components/HomeIndicator";
import PhoneFrame from "~/components/PhoneFrame";
import { TYPOGRAPHY } from "~/lib/constants";

export default function Index() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/welcome");
    }, 3000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <PhoneFrame>
      <StatusBar />
      <div style={{ position: "relative", flex: 1 }}>
        <h1
          style={{
            ...TYPOGRAPHY.display,
            position: "absolute",
            top: "214px",
            left: "50%",
            transform: "translateX(-50%)",
            color: "#000",
            textAlign: "center",
            whiteSpace: "nowrap",
            margin: 0,
          }}
        >
          음악 취향이 같으면
          <br />
          대화도 잘 통하니까
        </h1>
      </div>
      <HomeIndicator />
    </PhoneFrame>
  );
}

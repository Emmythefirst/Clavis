import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { KeyIcon } from "../../icons";

export default function GeneratingScreen() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => navigate("/onboarding/create/seed"), 900);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "20px 24px", textAlign: "center" }}>
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: "#1C2430",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 24,
          animation: "clavis-pulse 1.4s ease-in-out infinite",
        }}
      >
        <KeyIcon />
      </div>
      <style>{`
        @keyframes clavis-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.08); opacity: 0.85; }
        }
      `}</style>
      <div style={{ fontSize: 16, fontWeight: 700, color: "#1C2430", marginBottom: 8 }}>Creating your keys</div>
      <p style={{ fontSize: 13.5, lineHeight: 1.55, color: "#8A8478", margin: 0, maxWidth: 260 }}>
        This happens entirely on your device — nothing is sent anywhere.
      </p>
    </div>
  );
}

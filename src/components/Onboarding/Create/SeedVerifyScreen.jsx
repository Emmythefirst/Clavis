import { useNavigate } from "react-router-dom";
import { useOnboarding } from "../../../state/OnboardingContext";
import { ChevronLeftIcon, AlertTriangleIcon } from "../../icons";

export default function SeedVerifyScreen() {
  const navigate = useNavigate();
  const { verifyChallenges, verifyAnswers, verifyError, answerVerifyChallenge, checkVerification, retakeVerification } =
    useOnboarding();

  const allAnswered = verifyChallenges.every((c) => verifyAnswers[c.position]);

  function handleContinue() {
    if (checkVerification()) {
      navigate("/onboarding/create/lock");
    }
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "20px 20px 32px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
        <button onClick={() => navigate("/onboarding/create/seed")} style={{ background: "none", border: "none", padding: 4 }}>
          <ChevronLeftIcon />
        </button>
        <span style={{ fontSize: 15, fontWeight: 700, color: "#1C2430" }}>Verify your phrase</span>
      </div>
      <p style={{ fontSize: 13, lineHeight: 1.55, color: "#8A8478", margin: "0 0 20px" }}>
        Confirm a few words to make sure you saved them correctly.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {verifyChallenges.map((challenge) => (
          <div key={challenge.position} style={{ background: "#FFFFFF", border: "1px solid #E7E1D2", borderRadius: 16, padding: "15px 16px" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1C2430", marginBottom: 12 }}>
              What's word #{challenge.position + 1}?
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {challenge.options.map((option) => {
                const selected = verifyAnswers[challenge.position] === option;
                return (
                  <button
                    key={option}
                    onClick={() => answerVerifyChallenge(challenge.position, option)}
                    style={{
                      background: selected ? "#1C2430" : "#F1EEE6",
                      color: selected ? "#FBF9F4" : "#5F5A4E",
                      border: "none",
                      borderRadius: 100,
                      padding: "9px 15px",
                      fontSize: 12.5,
                      fontWeight: 600,
                      fontFamily: "'IBM Plex Mono', monospace",
                    }}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {verifyError && (
        <div style={{ background: "#FBE9E4", border: "1px solid #F3D3CB", borderRadius: 14, padding: "12px 14px", display: "flex", gap: 9, marginTop: 16 }}>
          <AlertTriangleIcon size={14} color="#95392A" />
          <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: "#95392A" }}>
            One or more words don't match.{" "}
            <button
              onClick={retakeVerification}
              style={{ background: "none", border: "none", padding: 0, color: "#95392A", fontWeight: 700, textDecoration: "underline" }}
            >
              View phrase again
            </button>
          </p>
        </div>
      )}

      <button
        disabled={!allAnswered}
        onClick={handleContinue}
        style={{
          width: "100%",
          background: allAnswered ? "#1C2430" : "#EFEADD",
          color: allAnswered ? "#FBF9F4" : "#B3AA97",
          border: "none",
          borderRadius: 14,
          padding: 16,
          fontSize: 14.5,
          fontWeight: 700,
          marginTop: 24,
        }}
      >
        Continue
      </button>
    </div>
  );
}

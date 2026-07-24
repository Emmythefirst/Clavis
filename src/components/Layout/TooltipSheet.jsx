import { useAppState } from "../../state/AppStateContext";

const TOOLTIP_CONTENT = {
  locked: {
    title: "Locked in vault",
    body: "BTC secured on-chain inside your TAURUS vault, protected by a timelock only you control.",
  },
  spendable: {
    title: "Spendable",
    body: "Your instant, off-chain VTXO balance — usable right away for sends and receives, cooperatively signed with the TAURUS operator. Once your timelock clears, you can always fall back to a unilateral exit instead.",
  },
  timelock: {
    title: "Timelock",
    body: "A countdown enforced on-chain. Once it clears, you can exit to Bitcoin mainnet unilaterally — no permission needed from anyone.",
  },
};

export default function TooltipSheet() {
  const { tooltipKey, closeTooltip } = useAppState();
  if (!tooltipKey) return null;
  const content = TOOLTIP_CONTENT[tooltipKey];

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(28,36,48,0.4)",
        display: "flex",
        alignItems: "flex-end",
        zIndex: 20,
      }}
    >
      <div style={{ width: "100%", background: "#FBF9F4", borderRadius: "22px 22px 0 0", padding: "24px 20px 30px" }}>
        <div style={{ width: 36, height: 4, background: "#E7E1D2", borderRadius: 2, margin: "0 auto 18px" }} />
        <div style={{ fontSize: 14.5, fontWeight: 700, color: "#1C2430", marginBottom: 8 }}>
          {content.title}
        </div>
        <p style={{ fontSize: 13, lineHeight: 1.55, color: "#5F5A4E", margin: "0 0 18px" }}>
          {content.body}
        </p>
        <button
          onClick={closeTooltip}
          style={{
            width: "100%",
            background: "#F1EEE6",
            color: "#5F5A4E",
            border: "none",
            borderRadius: 13,
            padding: 13,
            fontSize: 13.5,
            fontWeight: 600,
          }}
        >
          Got it
        </button>
      </div>
    </div>
  );
}

import { useNavigate } from "react-router-dom";
import { LogoCheckIcon, ArrowRightIcon, CheckIcon, AlertTriangleIcon, ClockCircleIcon } from "../icons";

const LIGHTNING_PAINS = [
  "Manage inbound liquidity yourself",
  "Watch your channels for force-closures",
  "Coordinate routing just to get paid reliably",
];

const CLAVIS_WINS = [
  "Instant off-chain payments through TAURUS VTXOs",
  "A Guardian that watches your risk window so you don't have to",
  "A real, unilateral exit back to Bitcoin mainnet once your timelock clears — no permission needed from anyone",
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div style={{ background: "#EDE8DD", minHeight: "100vh", width: "100%" }}>
      <div className="mx-auto max-w-5xl px-6 py-8 sm:px-10">
        <div className="flex items-center gap-2">
          <div
            style={{ width: 26, height: 26, borderRadius: 7, background: "#1C2430" }}
            className="flex items-center justify-center"
          >
            <LogoCheckIcon />
          </div>
          <span style={{ color: "#1C2430" }} className="text-[15px] font-bold tracking-[0.04em]">
            CLAVIS
          </span>
        </div>

        {/* Hero */}
        <div className="mx-auto mt-16 max-w-2xl text-center sm:mt-24">
          <h1
            style={{ color: "#1C2430" }}
            className="text-[34px] font-bold leading-[1.15] sm:text-[46px]"
          >
            Bitcoin self-custody that doesn't need your full attention.
          </h1>
          <p style={{ color: "#8A8478" }} className="mx-auto mt-5 max-w-xl text-[15px] leading-[1.6] sm:text-[17px]">
            Clavis pairs a TAURUS vault with an on-device Guardian that watches your risk window
            for you — Lightning-speed payments, plus a real unilateral exit back to Bitcoin,
            always there when you need it.
          </p>
          <button
            onClick={() => navigate("/onboarding/welcome")}
            style={{ background: "#1C2430", color: "#FBF9F4" }}
            className="mt-8 inline-flex items-center gap-2 rounded-2xl px-7 py-4 text-[15px] font-bold"
          >
            Get Started
            <ArrowRightIcon />
          </button>
        </div>

        {/* Comparison */}
        <div className="mx-auto mt-24 max-w-3xl">
          <h2 style={{ color: "#1C2430" }} className="text-center text-[22px] font-bold sm:text-[26px]">
            Why not just use Lightning?
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div style={{ background: "#F1EEE6", borderRadius: 20 }} className="p-6 sm:p-7">
              <div style={{ color: "#8A8478" }} className="mb-4 text-[12px] font-bold uppercase tracking-[0.06em]">
                Lightning
              </div>
              <div className="flex flex-col gap-4">
                {LIGHTNING_PAINS.map((line) => (
                  <div key={line} className="flex items-start gap-3">
                    <AlertTriangleIcon size={15} color="#B3AA97" />
                    <p style={{ color: "#5F5A4E" }} className="text-[13.5px] leading-[1.55]">
                      {line}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ background: "#FFFFFF", border: "1px solid #E7E1D2", borderRadius: 20 }} className="p-6 sm:p-7">
              <div style={{ color: "#0F6A5C" }} className="mb-4 text-[12px] font-bold uppercase tracking-[0.06em]">
                Clavis
              </div>
              <div className="flex flex-col gap-4">
                {CLAVIS_WINS.map((line) => (
                  <div key={line} className="flex items-start gap-3">
                    <div
                      style={{ background: "#EAF2EF", borderRadius: "50%" }}
                      className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center"
                    >
                      <CheckIcon size={11} strokeWidth={2.4} />
                    </div>
                    <p style={{ color: "#1C2430" }} className="text-[13.5px] font-medium leading-[1.55]">
                      {line}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Inside the wallet preview */}
        <div className="mx-auto mt-24 max-w-3xl">
          <h2 style={{ color: "#1C2430" }} className="text-center text-[22px] font-bold sm:text-[26px]">
            Inside the wallet
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div style={{ background: "#FBF9F4", border: "1px solid #E7E1D2", borderRadius: 22 }} className="p-5">
              <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                <div style={{ flex: 1, background: "#1C2430", borderRadius: 16, padding: "14px 12px" }}>
                  <div style={{ fontSize: 10.5, fontWeight: 600, color: "#9BA3AF" }}>Locked in vault</div>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 17, fontWeight: 600, color: "#FBF9F4", marginTop: 6 }}>
                    0.0842
                  </div>
                </div>
                <div style={{ flex: 1, background: "#FFFFFF", border: "1px solid #E7E1D2", borderRadius: 16, padding: "14px 12px" }}>
                  <div style={{ fontSize: 10.5, fontWeight: 600, color: "#8A8478" }}>Spendable</div>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 17, fontWeight: 600, color: "#1C2430", marginTop: 6 }}>
                    0.0113
                  </div>
                </div>
              </div>
              <div style={{ background: "#FBF1E1", borderRadius: 13, padding: "12px 13px", display: "flex", alignItems: "center", gap: 9 }}>
                <div style={{ width: 24, height: 24, borderRadius: 8, background: "#F3E2C0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <AlertTriangleIcon size={11} color="#B8842E" />
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#1C2430" }}>Guardian flagged something</div>
              </div>
              <p style={{ color: "#9C958A" }} className="mt-4 text-[12.5px] leading-[1.5]">
                Home &mdash; balances, timelock status, and Guardian in one glance.
              </p>
            </div>

            <div style={{ background: "#FBF9F4", border: "1px solid #E7E1D2", borderRadius: 22 }} className="p-5">
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "8px 4px" }}>
                <ClockCircleIcon size={26} color="#1C2430" />
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 26, fontWeight: 600, color: "#1C2430", marginTop: 10 }}>
                  05:12
                </div>
                <div style={{ fontSize: 11, color: "#9C958A", marginTop: 4 }}>timelock clears in</div>
                <div style={{ width: "100%", background: "#EFEADD", color: "#B3AA97", borderRadius: 12, padding: "11px", fontSize: 12, fontWeight: 700, marginTop: 16 }}>
                  Exit to Bitcoin mainnet
                </div>
              </div>
              <p style={{ color: "#9C958A" }} className="mt-4 text-[12.5px] leading-[1.5]">
                Exit &mdash; a real unilateral withdrawal, live the moment your timelock clears.
              </p>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-24 max-w-xl text-center">
          <button
            onClick={() => navigate("/onboarding/welcome")}
            style={{ background: "#1C2430", color: "#FBF9F4" }}
            className="inline-flex items-center gap-2 rounded-2xl px-7 py-4 text-[15px] font-bold"
          >
            Get Started
            <ArrowRightIcon />
          </button>
        </div>

        <div style={{ borderTop: "1px solid #DED7C6" }} className="mx-auto mt-20 max-w-3xl pt-8 pb-4 text-center">
          <p style={{ color: "#B3AA97" }} className="text-[12px] leading-[1.6]">
            Built for the Tachi &ldquo;OP_Freedom&rdquo; hackathon &mdash; Bounty #1: TAURUS-based
            non-custodial wallet.
          </p>
        </div>
      </div>
    </div>
  );
}

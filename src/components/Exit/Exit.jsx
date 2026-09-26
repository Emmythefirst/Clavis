import { useNavigate } from "react-router-dom";
import { useAppState } from "../../state/AppStateContext";
import { formatBtcFromSats, estimateTimeFromBlocks } from "../../lib/vaultDisplay";
import { ChevronLeftIcon, LockIcon, CheckIcon, AlertTriangleIcon } from "../icons";

export default function Exit() {
  const navigate = useNavigate();
  const {
    vaultBalanceSats,
    vaultLoading,
    exitStatus,
    exitStatusLoading,
    exitConfirmOpen,
    setExitConfirmOpen,
    exitDestination,
    setExitDestination,
    exitBusy,
    exitError,
    exitResults,
    confirmExit,
  } = useAppState();

  if (vaultLoading && vaultBalanceSats == null) return null;
  if (exitStatusLoading && !exitStatus) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20, textAlign: "center" }}>
        <p style={{ fontSize: 13.5, lineHeight: 1.55, color: "#8A8478", maxWidth: 260 }}>Checking your vault's real on-chain exit status...</p>
      </div>
    );
  }

  const balanceBtc = formatBtcFromSats(vaultBalanceSats);
  const hasFunding = exitStatus && exitStatus.funding.length > 0;
  const allReady = hasFunding && exitStatus.funding.every((f) => f.canExit);
  const exitDone = exitResults && exitResults.some((r) => r.ok);

  // Furthest-from-maturity UTXO drives the headline countdown — in this
  // app's current single-deposit-per-vault usage there's normally only one,
  // but this doesn't break if there happen to be more.
  const leastMature = hasFunding
    ? exitStatus.funding.reduce((a, b) => (b.blocksRemaining > a.blocksRemaining ? b : a))
    : null;

  return (
    <>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "20px 20px 32px", background: "#FBF9F4" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 8 }}>
          <button onClick={() => navigate("/app")} style={{ background: "none", border: "none", padding: 4 }}>
            <ChevronLeftIcon />
          </button>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#1C2430" }}>Exit to mainnet</span>
        </div>

        {exitDone && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", paddingTop: 36 }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#0F6A5C", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
              <CheckIcon size={28} color="#FBF9F4" strokeWidth={2.8} />
            </div>
            <div style={{ fontSize: 19, fontWeight: 700, color: "#1C2430", marginBottom: 8 }}>Exit broadcast</div>
            <p style={{ fontSize: 13.5, lineHeight: 1.55, color: "#8A8478", margin: "0 0 22px", maxWidth: 280 }}>
              Your BTC was sent unilaterally through the exit leaf — no operator, no cooperation needed. It'll confirm
              on-chain like any other Bitcoin transaction.
            </p>
            <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8, marginBottom: "auto" }}>
              {exitResults.map((r) => (
                <div key={r.sourceTxid} style={{ background: "#F1EEE6", borderRadius: 13, padding: "13px 14px", textAlign: "left" }}>
                  <div style={{ fontSize: 11, color: "#9C958A", marginBottom: 4 }}>
                    {r.ok ? `Exit tx (${formatBtcFromSats(r.amountSats)} BTC)` : "Failed"}
                  </div>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: "#5F5A4E", wordBreak: "break-all" }}>
                    {r.ok ? r.exitTxid : r.message}
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => navigate("/app")}
              style={{ width: "100%", background: "#1C2430", color: "#FBF9F4", border: "none", borderRadius: 14, padding: 16, fontSize: 14.5, fontWeight: 700, marginTop: 20 }}
            >
              Done
            </button>
          </div>
        )}

        {!exitDone && !hasFunding && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 20 }}>
            <p style={{ fontSize: 13.5, lineHeight: 1.55, color: "#8A8478", maxWidth: 280 }}>
              Nothing to exit yet — this checks your vault's real on-chain UTXOs directly, not the ledger balance.
              Deposit first.
            </p>
          </div>
        )}

        {!exitDone && hasFunding && !exitStatus.settled && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", paddingTop: 30 }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#FBE9E4", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
              <AlertTriangleIcon size={24} color="#95392A" />
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#1C2430", marginBottom: 8 }}>Exit isn't available right now</div>
            <p style={{ fontSize: 13, lineHeight: 1.55, color: "#8A8478", margin: "0 0 20px", maxWidth: 290 }}>
              Your vault's on-chain balance ({formatBtcFromSats(exitStatus.onChainTotalSats)} BTC) no longer matches
              your current spendable balance ({formatBtcFromSats(exitStatus.ledgerBalanceSats)} BTC) — some of it has
              been sent off-chain since it was deposited. A unilateral exit spends the full on-chain amount, which
              would overclaim what you actually still hold and could be challenged as a breach. Reconciling this
              needs a cooperative vault-state update, which isn't built yet.
            </p>
          </div>
        )}

        {!exitDone && hasFunding && exitStatus.settled && !allReady && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", paddingTop: 36 }}>
            <p style={{ fontSize: 12.5, fontWeight: 600, color: "#9C958A", letterSpacing: "0.04em", textTransform: "uppercase", margin: "0 0 12px" }}>
              Timelock clears in
            </p>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 40, fontWeight: 600, color: "#1C2430", letterSpacing: "0.02em", marginBottom: 6 }}>
              {leastMature.blocksRemaining.toLocaleString()} blocks
            </div>
            <div style={{ fontSize: 13, color: "#9C958A", marginBottom: 28 }}>
              estimated {estimateTimeFromBlocks(leastMature.blocksRemaining)} ({leastMature.confirmations} /{" "}
              {leastMature.csvBlocks} confirmations so far)
            </div>
            <div style={{ background: "#FFFFFF", border: "1px solid #E7E1D2", borderRadius: 16, padding: 16, width: "100%", marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 12.5, color: "#9C958A" }}>Vault balance</span>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, fontWeight: 600, color: "#1C2430" }}>
                  {balanceBtc} BTC
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12.5, color: "#9C958A" }}>Exit timelock</span>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: "#1C2430" }}>{leastMature.csvBlocks} blocks</span>
              </div>
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.55, color: "#8A8478", margin: "0 0 auto", maxWidth: 300 }}>
              This BTC is fully yours. Right now, exits go through cooperative co-signing with the
              TAURUS operator. The moment the timelock clears, you can withdraw it unilaterally
              instead — no permission needed from anyone.
            </p>
            <button
              disabled
              style={{
                width: "100%",
                background: "#EFEADD",
                color: "#B3AA97",
                border: "none",
                borderRadius: 14,
                padding: 17,
                fontSize: 14.5,
                fontWeight: 700,
                marginTop: 24,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <LockIcon size={14} color="#B3AA97" />
              Exit to Bitcoin mainnet
            </button>
          </div>
        )}

        {!exitDone && hasFunding && exitStatus.settled && allReady && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", paddingTop: 30 }}>
            <div style={{ width: 60, height: 60, borderRadius: "50%", background: "#EAF2EF", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
              <CheckIcon />
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, color: "#1C2430", marginBottom: 6 }}>Timelock cleared</div>
            <p style={{ fontSize: 13.5, lineHeight: 1.5, color: "#8A8478", margin: "0 0 30px", maxWidth: 280 }}>
              You can now withdraw your full vault balance back to Bitcoin mainnet, any time — unilaterally, straight
              through the exit leaf, with only your own signature.
            </p>
            <div style={{ width: "100%", background: "#FFFFFF", border: "1px solid #E7E1D2", borderRadius: 16, padding: 20, marginBottom: 24 }}>
              <div style={{ fontSize: 12, color: "#9C958A", marginBottom: 6 }}>Available to exit</div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 28, fontWeight: 600, color: "#1C2430" }}>
                {balanceBtc} BTC
              </div>
            </div>
            {exitError && (
              <p style={{ fontSize: 12.5, color: "#95392A", margin: "0 0 16px", lineHeight: 1.5 }}>{exitError}</p>
            )}
            <button
              onClick={() => setExitConfirmOpen(true)}
              style={{
                width: "100%",
                background: "#0F6A5C",
                color: "#FBF9F4",
                border: "none",
                borderRadius: 16,
                padding: 19,
                fontSize: 15.5,
                fontWeight: 700,
                marginTop: "auto",
                boxShadow: "0 10px 30px -8px rgba(15,106,92,0.55)",
              }}
            >
              Exit to Bitcoin mainnet
            </button>
          </div>
        )}
      </div>

      {exitConfirmOpen && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(28,36,48,0.45)", display: "flex", alignItems: "flex-end" }}>
          <div style={{ width: "100%", background: "#FBF9F4", borderRadius: "22px 22px 0 0", padding: "26px 20px 30px" }}>
            <div style={{ width: 36, height: 4, background: "#E7E1D2", borderRadius: 2, margin: "0 auto 20px" }} />
            <div style={{ fontSize: 16, fontWeight: 700, color: "#1C2430", marginBottom: 16 }}>Confirm exit</div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <span style={{ fontSize: 13, color: "#9C958A" }}>Amount</span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13.5, fontWeight: 600, color: "#1C2430" }}>
                {balanceBtc} BTC
              </span>
            </div>
            <label style={{ fontSize: 11.5, fontWeight: 700, color: "#9C958A", letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 8, display: "block" }}>
              Destination address
            </label>
            <input
              value={exitDestination}
              onChange={(e) => setExitDestination(e.target.value)}
              placeholder="Signet SegWit address (tb1...)"
              style={{ width: "100%", background: "#F1EEE6", border: "1px solid transparent", borderRadius: 13, padding: 14, fontSize: 13.5, color: "#1C2430", marginBottom: 20, boxSizing: "border-box" }}
            />
            {exitError && (
              <p style={{ fontSize: 12.5, color: "#95392A", margin: "0 0 14px", lineHeight: 1.5 }}>{exitError}</p>
            )}
            <button
              onClick={confirmExit}
              disabled={exitBusy || !exitDestination.trim()}
              style={{
                width: "100%",
                background: exitBusy ? "#7C9C93" : "#0F6A5C",
                color: "#FBF9F4",
                border: "none",
                borderRadius: 14,
                padding: 16,
                fontSize: 14.5,
                fontWeight: 700,
                marginBottom: 10,
                opacity: !exitDestination.trim() ? 0.6 : 1,
              }}
            >
              {exitBusy ? "Broadcasting..." : "Confirm & exit"}
            </button>
            <button
              onClick={() => setExitConfirmOpen(false)}
              disabled={exitBusy}
              style={{ width: "100%", background: "none", border: "none", color: "#9C958A", padding: 10, fontSize: 13.5, fontWeight: 600 }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}

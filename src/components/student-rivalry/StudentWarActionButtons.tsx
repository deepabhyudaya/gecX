"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  adminApproveStudentRivalry,
  adminRejectStudentRivalry,
  targetAcceptStudentRivalry,
  concludeStudentRivalry,
  convertStudentRivalryPoints,
  retractStudentRivalryProposal,
  surrenderStudentRivalry,
  deleteStudentRivalry,
} from "@/actions/student-rivalry.actions";

export function AdminWarButtons({ rivalryId }: { rivalryId: string }) {
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const router = useRouter();

  async function approve() {
    setBusy("approve");
    try { await adminApproveStudentRivalry(rivalryId); router.refresh(); }
    catch (e: any) { alert(e?.message); }
    finally { setBusy(null); }
  }

  async function reject() {
    setBusy("reject");
    try { await adminRejectStudentRivalry(rivalryId, rejectReason); setShowReject(false); router.refresh(); }
    catch (e: any) { alert(e?.message); }
    finally { setBusy(null); }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={approve}
        disabled={!!busy}
        className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
      >
        {busy === "approve" ? "…" : "Approve"}
      </button>
      <button
        onClick={() => setShowReject(true)}
        disabled={!!busy}
        className="bg-red-500/20 hover:bg-red-500/40 border border-red-500/40 text-red-400 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
      >
        Reject
      </button>

      {showReject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md space-y-4">
            <h3 className="font-bold text-lg">Reject Duel Proposal</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason (optional)…"
              rows={3}
              className="w-full bg-muted border border-border rounded-xl px-4 py-2 text-sm resize-none focus:outline-none"
            />
            <div className="flex gap-3">
              <button
                onClick={reject}
                disabled={busy === "reject"}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-2 rounded-xl text-sm"
              >
                {busy === "reject" ? "Rejecting…" : "Confirm Reject"}
              </button>
              <button
                onClick={() => setShowReject(false)}
                className="flex-1 border border-border rounded-xl py-2 text-sm hover:bg-muted"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function DeleteStudentWarButton({ rivalryId }: { rivalryId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <button
      onClick={async () => {
        if (!confirm("Are you sure you want to completely delete this duel? This cannot be undone.")) return;
        setBusy(true);
        try { await deleteStudentRivalry(rivalryId); router.refresh(); }
        catch (e: any) { alert(e?.message); setBusy(false); }
      }}
      disabled={busy}
      className="bg-red-900/40 hover:bg-red-600 text-red-200 hover:text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ml-2 disabled:opacity-50"
    >
      {busy ? "Deleting…" : "Delete"}
    </button>
  );
}

export function TargetAcceptButton({ rivalryId }: { rivalryId: string }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const router = useRouter();

  async function accept() {
    setBusy(true);
    try {
      await targetAcceptStudentRivalry(rivalryId);
      setDone(true);
      router.refresh();
    } catch (e: any) { alert(e?.message); }
    finally { setBusy(false); }
  }

  if (done) return <span className="text-emerald-400 text-sm font-bold">✓ War accepted</span>;

  return (
    <button
      onClick={accept}
      disabled={busy}
      className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:opacity-50 text-white font-bold px-6 py-2.5 rounded-xl shadow-lg transition-all active:scale-95 text-sm"
    >
      {busy ? "Accepting…" : "⚔️ Accept the Challenge"}
    </button>
  );
}

export function ConcludeWarButton({ rivalryId }: { rivalryId: string }) {
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const router = useRouter();

  async function conclude() {
    setBusy(true);
    try { await concludeStudentRivalry(rivalryId); router.refresh(); }
    catch (e: any) { alert(e?.message); }
    finally { setBusy(false); setConfirm(false); }
  }

  return (
    <>
      <button
        onClick={() => setConfirm(true)}
        className="bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/40 text-yellow-400 text-sm font-bold px-4 py-2 rounded-xl transition-colors"
      >
        🏆 Conclude Duel
      </button>
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm space-y-4">
            <h3 className="font-bold">Conclude this duel?</h3>
            <p className="text-sm text-muted-foreground">This will calculate the winner by raw scores, generate the final lore entry, and award the winner 200 bonus RP.</p>
            <div className="flex gap-3">
              <button onClick={conclude} disabled={busy} className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-2 rounded-xl text-sm">
                {busy ? "Concluding…" : "Yes, End the War"}
              </button>
              <button onClick={() => setConfirm(false)} className="flex-1 border border-border rounded-xl py-2 text-sm hover:bg-muted">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function ConvertStudentRPButton({ rivalryId, availableRP }: { rivalryId: string; availableRP: number }) {
  const [amount, setAmount] = useState(100);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ karmaEarned: number; gecxEarned: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const maxConvertable = Math.floor(availableRP / 100) * 100;

  async function convert() {
    setBusy(true);
    setError(null);
    try {
      const res = await convertStudentRivalryPoints(rivalryId, amount);
      setResult(res);
      router.refresh();
    } catch (e: any) {
      setError(e?.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-sm">Convert Duel Points</span>
        <span className="text-xs text-muted-foreground">{Math.floor(availableRP)} RP available</span>
      </div>
      <div className="text-xs text-muted-foreground">100 RP → 2,500 Karma + 100 GECX</div>

      {result ? (
        <div className="text-emerald-400 text-sm font-bold">
          +{result.karmaEarned.toLocaleString()} Karma & +{result.gecxEarned} GECX earned!
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={100}
              max={Math.max(maxConvertable, 100)}
              step={100}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="flex-1"
              disabled={maxConvertable < 100}
            />
            <span className="text-sm font-bold w-16 text-right">{amount} RP</span>
          </div>
          <div className="text-xs text-muted-foreground">
            → {(amount * 25).toLocaleString()} Karma + {amount} GECX
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <button
            onClick={convert}
            disabled={busy || maxConvertable < 100}
            className="w-full bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white font-bold py-2 rounded-xl text-sm transition-colors"
          >
            {busy ? "Converting…" : maxConvertable < 100 ? "Need 100+ RP" : "Convert"}
          </button>
        </>
      )}
    </div>
  );
}

export function RetractProposalButton({ rivalryId }: { rivalryId: string }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function retract() {
    if (!confirm("Are you sure you want to retract your war declaration?")) return;
    setBusy(true);
    try {
      await retractStudentRivalryProposal(rivalryId);
      router.refresh();
    } catch (e: any) {
      alert(e?.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={retract}
      disabled={busy}
      className="text-red-500 hover:text-red-400 hover:underline text-xs font-semibold mt-2 block"
    >
      {busy ? "Retracting…" : "Retract Challenge"}
    </button>
  );
}

export function SurrenderWarButton({ rivalryId }: { rivalryId: string }) {
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const router = useRouter();

  async function surrender() {
    setBusy(true);
    try {
      await surrenderStudentRivalry(rivalryId);
      router.refresh();
    } catch (e: any) {
      alert(e?.message);
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setConfirming(true)}
        className="text-muted-foreground hover:text-red-400 hover:underline text-xs font-semibold"
      >
        🏳️ Surrender Duel
      </button>

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm space-y-4">
            <h3 className="font-bold text-red-500">Surrender the War?</h3>
            <p className="text-sm text-muted-foreground">
              This will immediately end the duel and hand the victory to your opponent.
            </p>
            <div className="flex gap-3">
              <button onClick={surrender} disabled={busy} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-2 rounded-xl text-sm">
                {busy ? "Surrendering…" : "Yes, I Surrender"}
              </button>
              <button onClick={() => setConfirming(false)} className="flex-1 border border-border rounded-xl py-2 text-sm hover:bg-muted">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

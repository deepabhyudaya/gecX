"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "react-toastify";
import { createSeason } from "@/actions/season.actions";
import { setupDefaultSeasonRanks } from "@/actions/season-rank.actions";
import { Plus, Loader2 } from "lucide-react";

export function SeasonCreateForm() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cycleNumber, setCycleNumber] = useState(1);
  const [seasonNumber, setSeasonNumber] = useState(1);
  const [displayName, setDisplayName] = useState("");
  const [seasonType, setSeasonType] = useState<"BRANCH" | "STUDENT" | "BOTH">("BOTH");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [conquerorSize, setConquerorSize] = useState(10);
  const [iconUrl, setIconUrl] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!startDate || !endDate) {
      toast.error("Start and end dates are required");
      return;
    }
    setLoading(true);
    try {
      const season = await createSeason({
        cycleNumber,
        seasonNumber,
        displayName: displayName || undefined,
        seasonType,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        conquerorSize,
        iconUrl: iconUrl || undefined,
      });

      try {
        await setupDefaultSeasonRanks(season.id);
      } catch {

      }
      toast.success("Season created successfully!");
      setOpen(false);
      window.location.reload();
    } catch (err: any) {
      toast.error(err?.message || "Failed to create season");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full md:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Create Season
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Season</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Cycle Number</Label>
              <Input
                type="number"
                min={1}
                value={cycleNumber}
                onChange={(e) => setCycleNumber(Number(e.target.value))}
              />
            </div>
            <div>
              <Label>Season Number</Label>
              <Input
                type="number"
                min={1}
                value={seasonNumber}
                onChange={(e) => setSeasonNumber(Number(e.target.value))}
              />
            </div>
          </div>

          <div>
            <Label>Display Name (optional)</Label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. The Iron Age"
            />
          </div>

          <div>
            <Label>Season Icon URL (optional)</Label>
            <div className="flex items-center gap-3 mt-1">
              {iconUrl ? (
                <img
                  src={iconUrl}
                  alt="Season Icon"
                  className="w-10 h-10 rounded-md object-cover bg-muted"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "https://via.placeholder.com/40?text=Error";
                  }}
                />
              ) : (
                <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center text-xs text-muted-foreground border">
                  None
                </div>
              )}
              <Input
                value={iconUrl}
                onChange={(e) => setIconUrl(e.target.value)}
                placeholder="https://example.com/icon.png"
                className="flex-1"
              />
            </div>
          </div>

          <div>
            <Label>Season Type</Label>
            <select
              className="w-full border rounded-md px-3 py-2 text-sm bg-background"
              value={seasonType}
              onChange={(e) =>
                setSeasonType(e.target.value as "BRANCH" | "STUDENT" | "BOTH")
              }
            >
              <option value="BOTH">Both (Branch + Student)</option>
              <option value="BRANCH">Branch Wars Only</option>
              <option value="STUDENT">Student Wars Only</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Start Date</Label>
              <Input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label>End Date</Label>
              <Input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label>Conqueror Size (top N leaderboard spots)</Label>
            <Input
              type="number"
              min={1}
              max={100}
              value={conquerorSize}
              onChange={(e) => setConquerorSize(Number(e.target.value))}
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            Create Season
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

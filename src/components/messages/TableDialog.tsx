"use client";

import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";

interface TableDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (rows: number, cols: number) => void;
}

export default function TableDialog({
  isOpen,
  onClose,
  onConfirm,
}: TableDialogProps) {
  const [rows, setRows] = useState(2);
  const [cols, setCols] = useState(2);
  const rowsInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && rowsInputRef.current) {
      rowsInputRef.current.focus();
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rows >= 1 && cols >= 1 && rows <= 20 && cols <= 20) {
      onConfirm(rows, cols);
      setRows(2);
      setCols(2);
      onClose();
    }
  };

  const generateTableMarkdown = (r: number, c: number) => {
    let markdown = "";

    markdown += "| " + Array.from({ length: c }, (_, i) => `Column ${i + 1}`).join(" | ") + " |\n";

    markdown += "| " + Array.from({ length: c }, () => "---").join(" | ") + " |\n";

    for (let i = 0; i < r - 1; i++) {
      markdown += "| " + Array.from({ length: c }, (_, j) => `Value ${i + 1}-${j + 1}`).join(" | ") + " |\n";
    }
    return markdown.trim();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Insert Table</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div>
              <label htmlFor="rows-input" className="block text-sm font-medium mb-2">
                Rows
              </label>
              <input
                ref={rowsInputRef}
                id="rows-input"
                type="number"
                min="1"
                max="20"
                value={rows}
                onChange={(e) => setRows(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-foreground/20"
                autoFocus
              />
            </div>
            <div>
              <label htmlFor="cols-input" className="block text-sm font-medium mb-2">
                Columns
              </label>
              <input
                id="cols-input"
                type="number"
                min="1"
                max="20"
                value={cols}
                onChange={(e) => setCols(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-foreground/20"
              />
            </div>

            <div className="p-3 bg-muted rounded-md">
              <p className="text-sm text-muted-foreground mb-2">Preview:</p>
              <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                {generateTableMarkdown(rows, cols)}
              </pre>
            </div>
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md border border-border hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={rows < 1 || cols < 1}
              className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Insert Table
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

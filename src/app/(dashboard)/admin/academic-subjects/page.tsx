"use client";

import { useState, useEffect } from "react";
import {
  getAllAcademicSubjects,
  createAcademicSubject,
  updateAcademicSubject,
  deleteAcademicSubject,
} from "@/actions/academic-subject.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "react-toastify";
import { Loader2, Plus, Trash2, Pencil, Save, X } from "lucide-react";

interface Subject {
  id: string;
  name: string;
  color: string;
  isActive: boolean;
  createdAt: Date;
}

export default function AcademicSubjectsAdminPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#3B82F6");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");

  useEffect(() => {
    loadSubjects();
  }, []);

  async function loadSubjects() {
    setLoading(true);
    try {
      const data = await getAllAcademicSubjects();
      setSubjects(data);
    } catch (error: any) {
      toast.error(error.message || "Failed to load subjects");
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd() {
    if (!newName.trim()) {
      toast.error("Subject name is required");
      return;
    }
    setAdding(true);
    try {
      await createAcademicSubject(newName.trim(), newColor);
      toast.success("Subject created");
      setNewName("");
      setNewColor("#3B82F6");
      await loadSubjects();
    } catch (error: any) {
      toast.error(error.message || "Failed to create subject");
    } finally {
      setAdding(false);
    }
  }

  async function handleUpdate(id: string) {
    if (!editName.trim()) {
      toast.error("Subject name is required");
      return;
    }
    try {
      await updateAcademicSubject(id, editName.trim(), editColor);
      toast.success("Subject updated");
      setEditingId(null);
      await loadSubjects();
    } catch (error: any) {
      toast.error(error.message || "Failed to update subject");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this subject? If it has questions, it will be deactivated instead.")) {
      return;
    }
    try {
      await deleteAcademicSubject(id);
      toast.success("Subject deleted");
      await loadSubjects();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete subject");
    }
  }

  function startEdit(subject: Subject) {
    setEditingId(subject.id);
    setEditName(subject.name);
    setEditColor(subject.color);
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Academic Subjects</h1>
      <p className="text-muted-foreground mb-6">
        Manage subjects available for students to tag their questions.
      </p>

      <div className="flex gap-3 items-end mb-8 bg-muted/50 p-4 rounded-lg">
        <div className="flex-1">
          <label className="text-sm font-medium mb-1 block">Subject Name</label>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Mathematics, Physics, History"
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Color</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              className="w-10 h-10 rounded cursor-pointer border-0 p-0"
            />
          </div>
        </div>
        <Button onClick={handleAdd} disabled={adding} className="gap-1.5">
          {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          Add
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="animate-spin text-muted-foreground" />
        </div>
      ) : subjects.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No subjects yet. Create one above.
        </div>
      ) : (
        <div className="space-y-2">
          {subjects.map((subject) => (
            <div
              key={subject.id}
              className={`flex items-center justify-between p-3 rounded-lg border ${
                subject.isActive ? "bg-background" : "bg-muted/30 opacity-60"
              }`}
            >
              {editingId === subject.id ? (
                <div className="flex items-center gap-3 flex-1">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1"
                  />
                  <input
                    type="color"
                    value={editColor}
                    onChange={(e) => setEditColor(e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                  />
                  <Button size="sm" variant="ghost" onClick={() => handleUpdate(subject.id)}>
                    <Save size={14} />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                    <X size={14} />
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <span
                      className="w-4 h-4 rounded-full shrink-0"
                      style={{ backgroundColor: subject.color }}
                    />
                    <span className="font-medium">{subject.name}</span>
                    {!subject.isActive && (
                      <span className="text-xs text-muted-foreground">(inactive)</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" onClick={() => startEdit(subject)}>
                      <Pencil size={14} />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(subject.id)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

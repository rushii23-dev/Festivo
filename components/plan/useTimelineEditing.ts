"use client";

import { useState } from "react";
import { useAnnounce } from "@/components/a11y/LiveRegion";
import {
  addTask,
  deleteTask,
  restoreTask,
  updateTask,
  type EditResult,
  type TaskInput,
} from "@/lib/plan/edit";
import type { TimelineTask } from "@/lib/schemas/plan";
import type { PanelProps } from "./PlanDashboard";

export const ADD_TASK_BUTTON_ID = "add-task-btn";
export const UNDO_BUTTON_ID = "timeline-undo";
export const editButtonId = (taskId: string) => `edit-btn-${taskId}`;

const focusLater = (id: string) =>
  requestAnimationFrame(() => document.getElementById(id)?.focus());

/**
 * Adding, editing and deleting timeline tasks. One form is open at a time, each
 * change is announced, a deletion can be undone, and focus returns to the
 * button that opened the form.
 */
export function useTimelineEditing({ plan, today, update }: PanelProps) {
  const announce = useAnnounce();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [deleted, setDeleted] = useState<TimelineTask | null>(null);

  /** Applies a successful edit and returns null, or returns the field errors. */
  const save = (result: EditResult, message: string) => {
    if (!result.ok) return result.errors;
    update(() => result.plan);
    announce(message);
    return null;
  };

  const stopAdding = () => {
    setAdding(false);
    focusLater(ADD_TASK_BUTTON_ID);
  };
  const stopEditing = (taskId: string) => {
    setEditing(null);
    focusLater(editButtonId(taskId));
  };

  return {
    adding,
    editing,
    deleted,
    startAdding: () => {
      setEditing(null);
      setAdding(true);
    },
    stopAdding,
    submitNew: (input: TaskInput) => {
      const errors = save(addTask(plan, input, today), `Added ${input.title.trim()}.`);
      if (!errors) stopAdding();
      return errors;
    },
    startEditing: (taskId: string) => {
      setAdding(false);
      setEditing(taskId);
    },
    stopEditing,
    submitEdit: (taskId: string, input: TaskInput) => {
      const errors = save(
        updateTask(plan, taskId, input, today),
        `Saved ${input.title.trim()}.`,
      );
      if (!errors) stopEditing(taskId);
      return errors;
    },
    remove: (task: TimelineTask) => {
      update((p) => deleteTask(p, task.id));
      setDeleted(task);
      announce(`Deleted ${task.title}.`);
      focusLater(UNDO_BUTTON_ID);
    },
    undo: () => {
      if (!deleted) return;
      update((p) => restoreTask(p, deleted, today));
      announce(`Restored ${deleted.title}.`);
      focusLater(editButtonId(deleted.id));
      setDeleted(null);
    },
  };
}

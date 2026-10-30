"use client";

import { CalendarPlus, Plus, Undo2 } from "lucide-react";
import { useState } from "react";
import { useAnnounce } from "@/components/a11y/LiveRegion";
import { Button } from "@/components/ui/button";
import { Choice, Fieldset } from "@/components/ui/field";
import type { TaskInput } from "@/lib/plan/edit";
import type { TimelineTask } from "@/lib/schemas/plan";
import { groupByPhase, runSheet } from "@/lib/timeline/generate";
import { downloadCalendar } from "./calendar";
import type { PanelProps } from "./PlanDashboard";
import { PanelHeader } from "./parts";
import { TaskForm } from "./TaskForm";
import { PhaseList, RunSheet, TaskRow } from "./TimelineLists";
import { useTaskToggle } from "./useTaskToggle";
import {
  ADD_TASK_BUTTON_ID,
  UNDO_BUTTON_ID,
  useTimelineEditing,
} from "./useTimelineEditing";

const toInput = (task: TimelineTask): TaskInput => ({
  title: task.title,
  dueDate: task.dueDate,
  time: task.time ?? "",
  description: task.description ?? "",
});

type View = "all" | "run-sheet";

/** The plan's tasks by phase or as the day's run sheet, with add, edit, delete and undo. */
export function TimelinePanel(props: PanelProps) {
  const { plan, today } = props;
  const announce = useAnnounce();
  const ticks = useTaskToggle(plan, props.update);
  const edits = useTimelineEditing(props);
  const [view, setView] = useState<View>("all");

  const renderTask = (task: TimelineTask) =>
    edits.editing === task.id ? (
      <li key={task.id} className="py-2">
        <TaskForm
          idPrefix={`edit-${task.id}`}
          initial={toInput(task)}
          submitLabel="Save task"
          onCancel={() => edits.stopEditing(task.id)}
          onSubmit={(input) => edits.submitEdit(task.id, input)}
        />
      </li>
    ) : (
      <TaskRow
        key={task.id}
        task={task}
        today={today}
        {...ticks}
        onEdit={() => edits.startEditing(task.id)}
        onDelete={() => edits.remove(task)}
      />
    );

  return (
    <div className="grid grid-cols-1 gap-8">
      <PanelHeader
        title="Timeline"
        intro="Every task is counted back from the big day. Tick them off as you go."
      >
        <Button
          variant="outline"
          onClick={() => announce(`Calendar downloaded as ${downloadCalendar(plan)}.`)}
        >
          <CalendarPlus aria-hidden="true" />
          Download calendar (.ics)
        </Button>
        <Button
          id={ADD_TASK_BUTTON_ID}
          variant="secondary"
          aria-expanded={edits.adding}
          onClick={edits.startAdding}
        >
          <Plus aria-hidden="true" />
          Add a task
        </Button>
      </PanelHeader>

      <Fieldset
        id="timeline-view"
        name="timelineView"
        legend="Show"
        className="print:hidden"
      >
        <div className="flex flex-wrap gap-2">
          <Choice
            type="radio"
            name="timeline-view"
            value="all"
            checked={view === "all"}
            onChange={() => setView("all")}
            label="All tasks by phase"
          />
          <Choice
            type="radio"
            name="timeline-view"
            value="run-sheet"
            checked={view === "run-sheet"}
            onChange={() => setView("run-sheet")}
            label="Day-of run sheet"
          />
        </div>
      </Fieldset>

      {edits.deleted ? (
        <div className="flex flex-wrap items-center gap-3 border border-dashed border-input px-4 py-2">
          <p>
            Deleted <strong>{edits.deleted.title}</strong>.
          </p>
          <Button id={UNDO_BUTTON_ID} variant="ghost" size="sm" onClick={edits.undo}>
            <Undo2 aria-hidden="true" />
            Undo
          </Button>
        </div>
      ) : null}

      {edits.adding ? (
        <TaskForm
          idPrefix="new-task"
          initial={{ title: "", dueDate: today, time: "", description: "" }}
          submitLabel="Add task"
          onCancel={edits.stopAdding}
          onSubmit={edits.submitNew}
        />
      ) : null}

      {view === "all" ? (
        <PhaseList groups={groupByPhase(plan.timeline)} renderTask={renderTask} />
      ) : (
        <RunSheet tasks={runSheet(plan.timeline)} {...ticks} />
      )}
    </div>
  );
}

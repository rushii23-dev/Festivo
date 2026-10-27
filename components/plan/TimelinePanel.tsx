"use client";

import {
  CalendarPlus,
  Clock,
  Pencil,
  Plus,
  Trash2,
  TriangleAlert,
  Undo2,
} from "lucide-react";
import { useCallback, useState } from "react";
import { useAnnounce } from "@/components/a11y/LiveRegion";
import { Button } from "@/components/ui/button";
import { Choice, Fieldset } from "@/components/ui/field";
import { PHASE_HEADINGS } from "@/lib/plan/dashboard";
import {
  addTask,
  deleteTask,
  restoreTask,
  setTaskDone,
  updateTask,
  type TaskInput,
} from "@/lib/plan/edit";
import { prefersReducedMotionNow } from "@/lib/prefs/store";
import type { Plan, TimelineTask } from "@/lib/schemas/plan";
import { parseIsoDate } from "@/lib/timeline/dates";
import { groupByPhase, runSheet } from "@/lib/timeline/generate";
import { downloadCalendar } from "./client";
import type { PanelProps, UpdatePlan } from "./PlanDashboard";
import { PanelHeader, StatusNote, TaskCheck } from "./parts";
import { TaskForm } from "./TaskForm";

const dueFormat = new Intl.DateTimeFormat("en-IN", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});
const formatDue = (iso: string) => dueFormat.format(parseIsoDate(iso));

/**
 * Ticks a task and says so. When motion is allowed, petals pop out of the box;
 * the announcement happens either way.
 */
export function useTaskToggle(plan: Plan, update: UpdatePlan) {
  const announce = useAnnounce();
  const [cheering, setCheering] = useState<Record<string, number>>({});
  const toggle = useCallback(
    (task: TimelineTask, done: boolean) => {
      update((p) => setTaskDone(p, task.id, done));
      const left =
        plan.timeline.filter((t) => !t.done && t.id !== task.id).length + (done ? 0 : 1);
      if (done) {
        announce(
          left === 0
            ? `Done: ${task.title}. That was the last task. Everything is ready.`
            : `Done: ${task.title}. ${left} ${left === 1 ? "task" : "tasks"} to go.`,
        );
        if (!prefersReducedMotionNow()) {
          setCheering((c) => ({ ...c, [task.id]: (c[task.id] ?? 0) + 1 }));
        }
      } else {
        announce(`${task.title} marked as not done.`);
      }
    },
    [announce, plan.timeline, update],
  );
  return { toggle, cheering };
}

const toInput = (task: TimelineTask): TaskInput => ({
  title: task.title,
  dueDate: task.dueDate,
  time: task.time ?? "",
  description: task.description ?? "",
});

type View = "all" | "run-sheet";

export function TimelinePanel({ plan, today, update }: PanelProps) {
  const announce = useAnnounce();
  const { toggle, cheering } = useTaskToggle(plan, update);
  const [view, setView] = useState<View>("all");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [deleted, setDeleted] = useState<TimelineTask | null>(null);

  const focusLater = (id: string) =>
    requestAnimationFrame(() => document.getElementById(id)?.focus());

  const save = (result: ReturnType<typeof addTask>, message: string) => {
    if (!result.ok) return result.errors;
    update(() => result.plan);
    announce(message);
    return null;
  };

  const remove = (task: TimelineTask) => {
    update((p) => deleteTask(p, task.id));
    setDeleted(task);
    announce(`Deleted ${task.title}.`);
    focusLater("timeline-undo");
  };

  const groups = groupByPhase(plan.timeline);
  const sheet = runSheet(plan.timeline);

  const row = (task: TimelineTask, prefix: string) => {
    const checkId = `${prefix}-${task.id}`;
    if (editing === task.id) {
      return (
        <li key={task.id} className="py-2">
          <TaskForm
            idPrefix={`edit-${task.id}`}
            initial={toInput(task)}
            submitLabel="Save task"
            onCancel={() => {
              setEditing(null);
              focusLater(`edit-btn-${task.id}`);
            }}
            onSubmit={(input) => {
              const errors = save(
                updateTask(plan, task.id, input, today),
                `Saved ${input.title.trim()}.`,
              );
              if (!errors) {
                setEditing(null);
                focusLater(`edit-btn-${task.id}`);
              }
              return errors;
            }}
          />
        </li>
      );
    }
    const overdue = !task.done && task.phase !== "After" && task.dueDate < today;
    return (
      <li
        key={task.id}
        className="group flex items-start gap-4 border-t border-hairline px-2 py-4 hover:bg-card/60"
      >
        <TaskCheck
          id={checkId}
          checked={task.done}
          onChange={(checked) => toggle(task, checked)}
          cheer={cheering[task.id]}
        />
        <div className="grid min-w-0 flex-1 gap-0.5">
          <label
            htmlFor={checkId}
            className={`cursor-pointer text-lg leading-snug font-bold ${
              task.done ? "text-muted-foreground line-through decoration-2" : ""
            }`}
          >
            {task.title}
          </label>
          <p className="flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground">
            <span>Due {formatDue(task.dueDate)}</span>
            {task.time ? (
              <span className="inline-flex items-center gap-1">
                <Clock aria-hidden="true" className="size-3.5" />
                {task.time}
              </span>
            ) : null}
          </p>
          {overdue ? (
            <StatusNote tone="warning" icon={<TriangleAlert />} className="text-sm">
              Overdue
            </StatusNote>
          ) : null}
          {task.description ? (
            <p className="max-w-[62ch] text-muted-foreground">{task.description}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 gap-1 print:hidden">
          <Button
            id={`edit-btn-${task.id}`}
            variant="ghost"
            size="icon"
            onClick={() => {
              setAdding(false);
              setEditing(task.id);
            }}
          >
            <Pencil aria-hidden="true" />
            <span className="sr-only">Edit {task.title}</span>
          </Button>
          <Button variant="ghost" size="icon" onClick={() => remove(task)}>
            <Trash2 aria-hidden="true" />
            <span className="sr-only">Delete {task.title}</span>
          </Button>
        </div>
      </li>
    );
  };

  return (
    <div className="grid grid-cols-1 gap-8">
      <PanelHeader
        title="Timeline"
        intro="Every task is counted back from the big day. Tick them off as you go."
      >
        <Button
          variant="outline"
          onClick={() => {
            const file = downloadCalendar(plan);
            announce(`Calendar downloaded as ${file}.`);
          }}
        >
          <CalendarPlus aria-hidden="true" />
          Download calendar (.ics)
        </Button>
        <Button
          id="add-task-btn"
          variant="secondary"
          aria-expanded={adding}
          onClick={() => {
            setEditing(null);
            setAdding(true);
          }}
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

      {deleted ? (
        <div className="flex flex-wrap items-center gap-3 border border-dashed border-input px-4 py-2">
          <p>
            Deleted <strong>{deleted.title}</strong>.
          </p>
          <Button
            id="timeline-undo"
            variant="ghost"
            size="sm"
            onClick={() => {
              update((p) => restoreTask(p, deleted, today));
              announce(`Restored ${deleted.title}.`);
              focusLater(`edit-btn-${deleted.id}`);
              setDeleted(null);
            }}
          >
            <Undo2 aria-hidden="true" />
            Undo
          </Button>
        </div>
      ) : null}

      {adding ? (
        <TaskForm
          idPrefix="new-task"
          initial={{ title: "", dueDate: today, time: "", description: "" }}
          submitLabel="Add task"
          onCancel={() => {
            setAdding(false);
            focusLater("add-task-btn");
          }}
          onSubmit={(input) => {
            const errors = save(
              addTask(plan, input, today),
              `Added ${input.title.trim()}.`,
            );
            if (!errors) {
              setAdding(false);
              focusLater("add-task-btn");
            }
            return errors;
          }}
        />
      ) : null}

      {view === "all" ? (
        groups.length === 0 ? (
          <p className="text-muted-foreground">No tasks yet. Add your first one above.</p>
        ) : (
          <ol className="relative grid grid-cols-1 gap-10 before:absolute before:top-3 before:bottom-3 before:left-[5px] before:w-px before:bg-hairline">
            {groups.map((group) => {
              const doneCount = group.tasks.filter((t) => t.done).length;
              return (
                <li
                  key={group.phase}
                  className="relative grid min-w-0 grid-cols-1 gap-2 pl-8 sm:pl-10"
                >
                  <span
                    aria-hidden="true"
                    className={`absolute top-3 left-0 size-3 rotate-45 border border-border ${
                      doneCount === group.tasks.length ? "bg-secondary" : "bg-background"
                    }`}
                  />
                  <h3 className="flex flex-wrap items-baseline gap-x-4 font-display text-[2.4rem] leading-none">
                    {PHASE_HEADINGS[group.phase]}
                    <span className="caps font-sans tracking-[0.02em] text-muted-foreground">
                      {doneCount} of {group.tasks.length} done
                    </span>
                  </h3>
                  <ul className="grid grid-cols-1">
                    {group.tasks.map((task) => row(task, "task"))}
                  </ul>
                </li>
              );
            })}
          </ol>
        )
      ) : (
        <section aria-labelledby="run-sheet-title" className="grid gap-4">
          <h3 id="run-sheet-title" className="font-display text-[2.4rem] leading-none">
            Run sheet for the day
          </h3>
          {sheet.length === 0 ? (
            <p className="text-muted-foreground">
              Nothing is planned on the day yet. Add a task dated on the event day, with a
              start time, and it will appear here.
            </p>
          ) : (
            <ol className="grid grid-cols-1 border-y border-foreground">
              {sheet.map((task) => (
                <li
                  key={task.id}
                  className="grid grid-cols-[5.5rem_1fr] items-start gap-4 border-b border-hairline py-5 last:border-b-0 sm:grid-cols-[7rem_1fr]"
                >
                  <p
                    className={
                      task.time
                        ? "figure text-3xl leading-none text-event"
                        : "pt-1 font-bold text-muted-foreground"
                    }
                  >
                    {task.time ?? "Any time"}
                  </p>
                  <div className="flex items-start gap-3">
                    <TaskCheck
                      id={`sheet-${task.id}`}
                      checked={task.done}
                      onChange={(checked) => toggle(task, checked)}
                      cheer={cheering[task.id]}
                    />
                    <div className="grid gap-0.5">
                      <label
                        htmlFor={`sheet-${task.id}`}
                        className={`cursor-pointer text-lg font-bold ${
                          task.done ? "text-muted-foreground line-through" : ""
                        }`}
                      >
                        {task.title}
                      </label>
                      {task.description ? (
                        <p className="text-muted-foreground">{task.description}</p>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}
    </div>
  );
}

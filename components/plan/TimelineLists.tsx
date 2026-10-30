"use client";

import { Clock, Pencil, Trash2, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { PHASE_HEADINGS } from "@/lib/plan/dashboard";
import type { TimelineTask } from "@/lib/schemas/plan";
import { parseIsoDate } from "@/lib/timeline/dates";
import type { PhaseGroup } from "@/lib/timeline/generate";
import { StatusNote, TaskCheck } from "./parts";
import { editButtonId } from "./useTimelineEditing";

const dueFormat = new Intl.DateTimeFormat("en-IN", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});
const formatDue = (iso: string) => dueFormat.format(parseIsoDate(iso));

/** How a task's tick box behaves, shared by every list. */
export interface TaskToggle {
  toggle: (task: TimelineTask, done: boolean) => void;
  cheering: Record<string, number>;
}

interface TaskRowProps extends TaskToggle {
  task: TimelineTask;
  today: string;
  onEdit: () => void;
  onDelete: () => void;
}

/** A task with its tick box, due date, overdue note, and edit and delete buttons. */
export function TaskRow({
  task,
  today,
  toggle,
  cheering,
  onEdit,
  onDelete,
}: TaskRowProps) {
  const checkId = `task-${task.id}`;
  const overdue = !task.done && task.phase !== "After" && task.dueDate < today;
  return (
    <li className="group flex items-start gap-4 border-t border-hairline px-2 py-4 hover:bg-card/60">
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
        <Button id={editButtonId(task.id)} variant="ghost" size="icon" onClick={onEdit}>
          <Pencil aria-hidden="true" />
          <span className="sr-only">Edit {task.title}</span>
        </Button>
        <Button variant="ghost" size="icon" onClick={onDelete}>
          <Trash2 aria-hidden="true" />
          <span className="sr-only">Delete {task.title}</span>
        </Button>
      </div>
    </li>
  );
}

/** Every task under its phase, each phase marked done once all its tasks are. */
export function PhaseList({
  groups,
  renderTask,
}: {
  groups: PhaseGroup[];
  renderTask: (task: TimelineTask) => ReactNode;
}) {
  if (groups.length === 0) {
    return (
      <p className="text-muted-foreground">No tasks yet. Add your first one above.</p>
    );
  }
  return (
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
            <ul className="grid grid-cols-1">{group.tasks.map(renderTask)}</ul>
          </li>
        );
      })}
    </ol>
  );
}

/** The event day hour by hour, untimed tasks last. */
export function RunSheet({
  tasks,
  toggle,
  cheering,
}: TaskToggle & { tasks: TimelineTask[] }) {
  return (
    <section aria-labelledby="run-sheet-title" className="grid gap-4">
      <h3 id="run-sheet-title" className="font-display text-[2.4rem] leading-none">
        Run sheet for the day
      </h3>
      {tasks.length === 0 ? (
        <p className="text-muted-foreground">
          Nothing is planned on the day yet. Add a task dated on the event day, with a
          start time, and it will appear here.
        </p>
      ) : (
        <ol className="grid grid-cols-1 border-y border-foreground">
          {tasks.map((task) => (
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
  );
}

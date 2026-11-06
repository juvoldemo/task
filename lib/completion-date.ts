// Legacy tasks use the recorded completion update, or their last saved update.
export function completionDate(task: { progress: number; completed_at?: string | null; updated: string; update_history?: string | null }) {
  if (task.progress !== 100) return null;
  if (task.completed_at) return task.completed_at;
  try {
    const history = JSON.parse(task.update_history || "[]");
    let completed: string | null = null;
    for (const entry of history) {
      if (entry.progress !== 100) completed = null;
      else if (!completed && Number.isFinite(Date.parse(entry.at))) completed = entry.at;
    }
    if (completed) return completed;
  } catch { /* Older rows may not have a readable history. */ }
  return task.updated;
}

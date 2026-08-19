import type {
  AiMessageView,
  ArtifactView,
  AttemptControlsView,
  AttemptStatus,
  AttemptTaskView,
  AttemptView,
  Collection,
  PluginRunStatus,
  PluginRunView,
  TaskKind,
} from './types';

interface PlatformAttemptTask {
  readonly id: string;
  readonly sectionId: string;
  readonly itemType: string;
  readonly title: string;
  readonly prompt: unknown;
  readonly response: unknown;
  readonly savedAt: string | null;
  readonly flagged: boolean;
  readonly version: number;
  readonly checksum: string;
}

export interface PlatformAttempt {
  readonly id: string;
  readonly status: string;
  readonly assessmentTitle: string;
  readonly serverNow: string;
  readonly deadlineAt: string;
  readonly submittedAt: string | null;
  readonly receiptRef: string | null;
  readonly activeItemId: string | null;
  readonly sections: readonly { readonly id: string; readonly title: string }[];
  readonly tasks: readonly PlatformAttemptTask[];
  readonly aiMessages: readonly {
    readonly id: string;
    readonly role: string;
    readonly content: string;
    readonly createdAt: string;
  }[];
  readonly artifacts: readonly {
    readonly id: string;
    readonly uri: string;
    readonly scanStatus: 'pending' | 'clean' | 'infected' | 'error';
    readonly createdAt: string;
  }[];
  readonly pluginExecutions: readonly {
    readonly id: string;
    readonly pluginCode: string;
    readonly status: string;
    readonly input: unknown;
    readonly output: unknown;
    readonly startedAt: string;
  }[];
  readonly breakActive: boolean;
}

function attemptStatus(status: string): AttemptStatus {
  switch (status) {
    case 'in_progress':
      return 'in_progress';
    case 'paused':
    case 'on_break':
      return 'paused';
    case 'submitted':
      return 'submitted';
    case 'abandoned':
    case 'cancelled':
    case 'invalidated':
      return 'voided';
    default:
      return 'ready';
  }
}

function taskKind(itemType: string): TaskKind {
  if (itemType === 'code' || itemType === 'coding') return 'code';
  if (itemType === 'sheet' || itemType === 'spreadsheet') return 'sheet';
  return 'document';
}

function text(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value !== null && typeof value === 'object') {
    const brief = (value as Record<string, unknown>).brief;
    if (typeof brief === 'string') return brief;
  }
  return value === null || value === undefined ? '' : JSON.stringify(value);
}

export function attemptView(attempt: PlatformAttempt): AttemptView {
  const tasks: readonly AttemptTaskView[] = attempt.tasks.map((task) => ({
    id: task.id,
    sectionId: task.sectionId,
    kind: taskKind(task.itemType),
    title: task.title,
    prompt: text(task.prompt),
    status: task.flagged
      ? 'flagged'
      : task.id === attempt.activeItemId
        ? 'in_progress'
        : task.savedAt === null
          ? 'not_started'
          : 'saved',
    response: text(task.response),
    savedAt: task.savedAt,
    flagged: task.flagged,
    version: task.version,
    checksum: task.checksum,
  }));
  return {
    id: attempt.id,
    assessmentTitle: attempt.assessmentTitle,
    status: attemptStatus(attempt.status),
    deadlineAt: attempt.deadlineAt,
    serverNow: attempt.serverNow,
    autosave: tasks.some((task) => task.savedAt !== null) ? 'saved' : 'idle',
    sections: attempt.sections.map((section) => ({
      id: section.id,
      title: section.title,
      taskIds: tasks.filter((task) => task.sectionId === section.id).map((task) => task.id),
    })),
    tasks,
    submittedAt: attempt.submittedAt,
    receiptRef: attempt.receiptRef,
  };
}

export function attemptAiMessages(attempt: PlatformAttempt): Collection<AiMessageView> {
  const items = attempt.aiMessages
    .filter((message) => message.role === 'candidate' || message.role === 'assistant')
    .map((message) => ({
      id: message.id,
      role: message.role as AiMessageView['role'],
      body: message.content,
      at: message.createdAt,
      provenanceRef: message.role === 'assistant' ? message.id.slice(0, 8) : null,
    }));
  return { items, total: items.length };
}

function pluginStatus(status: string): PluginRunStatus {
  if (status === 'succeeded') return 'passed';
  if (status === 'failed' || status === 'blocked') return 'failed';
  if (status === 'requested' || status === 'allowed' || status === 'running') return 'running';
  return 'idle';
}

export function attemptPluginRuns(attempt: PlatformAttempt): Collection<PluginRunView> {
  const items = attempt.pluginExecutions.map((execution) => ({
    id: execution.id,
    name: execution.pluginCode,
    input: text(execution.input),
    output: execution.output === null ? 'Awaiting governed plugin worker.' : text(execution.output),
    status: pluginStatus(execution.status),
    ranAt: execution.startedAt,
  }));
  return { items, total: items.length };
}

export function attemptArtifacts(attempt: PlatformAttempt): Collection<ArtifactView> {
  const items = attempt.artifacts.map((artifact) => ({
    id: artifact.id,
    name: artifact.uri.split('/').filter(Boolean).at(-1) ?? 'artifact',
    sizeLabel: 'Stored artifact',
    status:
      artifact.scanStatus === 'clean'
        ? ('clean' as const)
        : artifact.scanStatus === 'pending'
          ? ('scanning' as const)
          : ('rejected' as const),
    uploadedAt: artifact.createdAt,
  }));
  return { items, total: items.length };
}

export function attemptControls(attempt: PlatformAttempt): AttemptControlsView {
  return {
    flaggedTaskIds: attempt.tasks.filter((task) => task.flagged).map((task) => task.id),
    breakStatus: attempt.breakActive ? 'active' : 'none',
    breaksRemaining: attempt.status === 'submitted' ? 0 : 1,
  };
}

'use client';
import { useCallback, useId, useState } from 'react';
import { Button } from '@cpf/ui';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/Card';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { StatusBadge } from '../../components/StatusBadge';
import { useAsync } from '../../lib/useAsync';
import { apiClient } from '../../lib/api-client';

interface PracticeModule {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly duration: string;
  readonly taskCount: number;
  readonly completed: boolean;
}

export default function PracticeCentrePage() {
  const headingId = useId();
  const [data, setData] = useState<{ modules: PracticeModule[] } | null>(null);

  const loader = useCallback(async () => {
    const result = await apiClient.getPracticeModules();
    setData(result);
    return result;
  }, []);

  const { state, reload } = useAsync<{ modules: PracticeModule[] }>(loader);

  const handleStart = async (moduleId: string) => {
    // In real app, would navigate to practice module
    console.log('Starting practice module:', moduleId);
  };

  return (
    <>
      <PageHeader
        title="Practice centre"
        description="Provide representative non-scored practice and device familiarisation."
        headingId={headingId}
      />

      <AsyncBoundary
        state={state}
        onRetry={reload}
        label="Practice modules"
        isEmpty={(data) => !data || data.modules.length === 0}
        emptyTitle="No practice modules available"
        emptyBody="Practice modules will appear here when available."
      >
        {() => (
          <div className="space-y-6">
            <Card aria-label="About practice">
              <div className="space-y-3">
                <h2 className="text-base font-semibold text-ink">About practice assessments</h2>
                <ul className="space-y-2 text-sm text-ink">
                  <li className="flex gap-2">
                    <span>•</span>
                    <span>
                      Practice assessments are not scored and do not affect your application
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span>•</span>
                    <span>Use these to familiarize yourself with the assessment environment</span>
                  </li>
                  <li className="flex gap-2">
                    <span>•</span>
                    <span>You can repeat practice modules as many times as you like</span>
                  </li>
                  <li className="flex gap-2">
                    <span>•</span>
                    <span>Practice uses the same interface as the actual assessment</span>
                  </li>
                </ul>
              </div>
            </Card>

            <div className="grid gap-4">
              {data?.modules.map((module) => (
                <Card key={module.id} aria-label={module.title}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold text-ink">{module.title}</h3>
                        {module.completed && <StatusBadge tone="success">Completed</StatusBadge>}
                      </div>
                      <p className="text-sm text-muted">{module.description}</p>
                      <div className="flex gap-4 text-sm text-muted">
                        <span>{module.duration} minutes</span>
                        <span>{module.taskCount} tasks</span>
                      </div>
                    </div>
                    <Button
                      variant={module.completed ? 'secondary' : 'primary'}
                      onClick={() => handleStart(module.id)}
                    >
                      {module.completed ? 'Practice again' : 'Start practice'}
                    </Button>
                  </div>
                </Card>
              ))}
              \n{' '}
            </div>
          </div>
        )}
      </AsyncBoundary>
    </>
  );
}

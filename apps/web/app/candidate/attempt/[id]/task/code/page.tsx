import { TaskRunner } from '../../../components/TaskRunner';

export default function CodeTaskPage({ params }: { params: { id: string } }): React.JSX.Element {
  return <TaskRunner attemptId={params.id} kind="code" />;
}

import { TaskRunner } from '../../../components/TaskRunner';

export default function DocumentTaskPage({
  params,
}: {
  params: { id: string };
}): React.JSX.Element {
  return <TaskRunner attemptId={params.id} kind="document" />;
}

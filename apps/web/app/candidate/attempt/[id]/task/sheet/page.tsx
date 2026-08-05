import { TaskRunner } from '../../../components/TaskRunner';

export default function SheetTaskPage({ params }: { params: { id: string } }): React.JSX.Element {
  return <TaskRunner attemptId={params.id} kind="sheet" />;
}

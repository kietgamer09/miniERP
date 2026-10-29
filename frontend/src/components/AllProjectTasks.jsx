import { useEffect, useState } from 'react';
import { Alert, Button, Select, message } from 'antd';
import { getProject, listProjectTasks } from '../services/projectApi';
import { changeTaskStatus } from '../services/taskApi';
import TaskViews from './TaskViews';
import TaskDetailDrawer from './TaskDetailDrawer';
import TaskFormModal from './TaskFormModal';

export default function AllProjectTasks({ projects, onChanged }) {
  const [state, setState] = useState({ key: '', tasks: [], error: '' });
  const [revision, setRevision] = useState(0);
  const [sortMode, setSortMode] = useState('due');
  const [taskId, setTaskId] = useState(null);
  const [editor, setEditor] = useState(null);
  const [messageApi, contextHolder] = message.useMessage();
  const key = `${projects.map(project => project.id).join(',')}:${revision}`;
  useEffect(() => {
    let active = true;
    Promise.all(projects.map(async project => {
      const tasks = await listProjectTasks(project.id);
      if (!Array.isArray(tasks)) throw new Error('Dữ liệu công việc không hợp lệ');
      return tasks.map(task => ({ ...task, project_id: project.id, project_name: project.name, project_status: project.status }));
    })).then(results => { if (active) setState({ key, tasks: results.flat(), error: '' }); })
      .catch(error => { if (active) setState({ key, tasks: [], error: error.message }); });
    return () => { active = false; };
  }, [projects, key]);
  async function edit(task) {
    setTaskId(null);
    try { setEditor({ task, project: await getProject(task.project_id) }); }
    catch (error) { messageApi.error(error.message); }
  }
  return <>
    {contextHolder}
    {state.key === key && state.error ? <Alert type="error" showIcon title={state.error} action={<Button onClick={() => setRevision(value => value + 1)}>Thử lại</Button>} />
      : <TaskViews tasks={state.key === key ? state.tasks : []} loading={state.key !== key} sortMode={sortMode} onOpen={task => setTaskId(task.id)} onEdit={edit}
        toolbarExtra={<Select aria-label="Sắp xếp công việc" value={sortMode} onChange={setSortMode} options={[{ value: 'due', label: 'Theo hạn' }, { value: 'priority', label: 'Theo ưu tiên' }]} style={{ width: 150 }} />}
        onMove={async (task, status) => {
          const saved = await changeTaskStatus(task.id, status);
          setState(previous => ({ ...previous, tasks: previous.tasks.map(item => item.id === task.id ? { ...item, ...saved } : item) }));
          return { ...task, ...saved };
        }} />}
    <TaskDetailDrawer key={taskId || 'closed'} open={Boolean(taskId)} taskId={taskId} onClose={() => setTaskId(null)} onEdit={edit} />
    {editor && <TaskFormModal project={editor.project} task={editor.task} onCancel={() => setEditor(null)} onSaved={() => {
      setEditor(null); setRevision(value => value + 1); onChanged?.();
    }} />}
  </>;
}

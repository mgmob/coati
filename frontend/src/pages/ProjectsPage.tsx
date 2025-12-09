import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, ArrowRight, Calendar } from 'lucide-react';

// API & Types
import { api, type Project } from '../api';
import { apiLogger } from '../lib/apiLogger';

// ATOMS
import { Button } from '../components/atoms/Button';
import { Card } from '../components/atoms/Card';
import { Typography } from '../components/atoms/Typography';
import { Input } from '../components/atoms/Input';
import { Logo } from '../components/atoms/Logo'; // <-- Импортируем Лого

// ORGANISMS
import { SidebarNav } from '../components/organisms/SidebarNav';

export default function ProjectsPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [newProjectName, setNewProjectName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setIsLoading(true);
    const correlationId = `ProjectsPage-loadProjects-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    try {
      apiLogger.setCurrentLocation('ProjectsPage::loadProjects');
      apiLogger.setCurrentExpected('Array<Project> – список проектов пользователя');
      apiLogger.setCurrentCorrelationId(correlationId);
      const data = await api.getProjects();
      setProjects(data);
      apiLogger.markProcessedGlobally('listProjects', true);
    } catch {
      // Обработка ошибки
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newProjectName.trim()) return;
    setIsCreating(true);
    const correlationId = `ProjectsPage-handleCreate-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    try {
      apiLogger.setCurrentLocation('ProjectsPage::handleCreate');
      apiLogger.setCurrentExpected('Project – новый созданный проект');
      apiLogger.setCurrentCorrelationId(correlationId);
      // Передаем пустую строку как описание
      const newProject = await api.createProject(newProjectName, '');
      setNewProjectName('');
      navigate(`/project/${newProject.id}`);
      apiLogger.markProcessedGlobally('createProject', true);
    } catch {
      alert('Ошибка при создании проекта');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex h-screen w-screen bg-gray-50 overflow-hidden font-sans">
      {/* 1. SIDEBAR */}
      <SidebarNav />

      {/* 2. MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <div className="p-8 max-w-5xl mx-auto w-full space-y-8">

          {/* Header with Logo */}
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white rounded-xl shadow-sm border border-gray-100">
               <Logo size={42} />
            </div>
            <div>
              <Typography variant="h2">Проекты</Typography>
              <Typography variant="body" color="text-gray-500">
                Управляйте своими задачами и требованиями
              </Typography>
            </div>
          </div>

          {/* Create Project Card */}
          <Card className="p-6 border-blue-100 bg-blue-50/50">
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1 w-full space-y-2">
                <label className="text-sm font-medium text-gray-700 ml-1">Новый проект</label>
                <Input
                  placeholder="Например: Разработка CRM системы..."
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  autoFocus
                />
              </div>
              <Button
                onClick={handleCreate}
                disabled={!newProjectName.trim() || isCreating}
                icon={Plus}
                className="w-full md:w-auto"
              >
                {isCreating ? 'Создание...' : 'Создать проект'}
              </Button>
            </div>
          </Card>

          {/* Projects List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <Typography variant="h4">Ваши проекты</Typography>
              <div className="w-64">
                <Input placeholder="Поиск..." icon={Search} className="bg-white" />
              </div>
            </div>

            {isLoading ? (
              <div className="text-center py-12 text-gray-400">Загрузка...</div>
            ) : projects.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                <Typography variant="h4" color="text-gray-400">Нет проектов</Typography>
                <Typography variant="small" color="text-gray-400">Создайте свой первый проект выше</Typography>
              </div>
            ) : (
              <div className="grid gap-4">
                {projects.map((project) => (
                  <Card
                    key={project.id}
                    className="p-5 flex items-center justify-between hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group"
                    onClick={() => navigate(`/project/${project.id}`)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                        <Calendar size={20} />
                      </div>
                      <div>
                        <Typography variant="h4" className="group-hover:text-blue-700 transition-colors">
                          {project.name}
                        </Typography>
                        <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                          <span>Обновлено недавно</span>
                          <span>•</span>
                          <span>{project.status || 'В работе'}</span>
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" icon={ArrowRight} className="text-gray-400 group-hover:text-blue-600" />
                  </Card>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

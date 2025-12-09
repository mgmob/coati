import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { PanelRightClose, PanelRightOpen, LayoutTemplate, Loader2 } from 'lucide-react';

// API & Types
import {
  api,
  type StageTemplate,
  type ProjectDetailsData,
  type AIModel,
  type SystemPrompt,
  type StageStep
} from '../api';

// ATOMS
import { Button } from '../components/atoms/Button';
import { Card } from '../components/atoms/Card';
import { Typography } from '../components/atoms/Typography';

// MOLECULES & ORGANISMS
import { TabButton } from '../components/molecules/TabButton';
import { SidebarNav } from '../components/organisms/SidebarNav';
import { ProjectTimeline } from '../components/organisms/ProjectTimeline';
import { EditorToolbar } from '../components/organisms/EditorToolbar';
import { TiptapEditor } from '../components/organisms/TiptapEditor';
import { StageTimeline } from '../components/organisms/StageTimeline';
import { ContextPanel } from '../components/organisms/ContextPanel';

export default function ProjectDetailsPage() {
  const { id } = useParams<{ id: string }>();

  // --- STATE ---
  const [isLoading, setIsLoading] = useState(true);

  // Данные проекта
  const [projectData, setProjectData] = useState<ProjectDetailsData | null>(null);
  const [content, setContent] = useState('');

  // Справочники (для настроек шагов)
  const [templates, setTemplates] = useState<StageTemplate[]>([]);
  const [aiModels, setAiModels] = useState<AIModel[]>([]);
  const [sysPrompts, setSysPrompts] = useState<SystemPrompt[]>([]);

  // UI State
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [rightPanelTab, setRightPanelTab] = useState<'process' | 'context'>('process');

  // --- LOAD DATA ---
  const loadData = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      // Загружаем проект, модели и промпты параллельно
      const [pData, models, prompts] = await Promise.all([
        api.getProjectDetails(id),
        api.getAIModels(),
        api.getSystemPrompts()
      ]);

      setProjectData(pData);
      setContent(pData.content || '');
      setAiModels(models);
      setSysPrompts(prompts);

      // Если этапов нет, загружаем шаблоны для выбора
      if (!pData.stages || pData.stages.length === 0) {
        const tpls = await api.listTemplates();
        setTemplates(tpls);
      }
    } catch (error) {
      console.error("Failed to load project data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // --- HANDLERS ---

  // Добавление первого этапа (из шаблона)
  const handleAddStage = async (templateId: string) => {
    if (!id) return;
    setIsLoading(true);
    try {
      await api.addStage(id, templateId);
      await loadData();
    } catch (error) {
      console.error("Failed to add stage:", error);
      alert("Ошибка добавления этапа");
      setIsLoading(false);
    }
  };

  // Сохранение настроек шагов (модель, промпт)
  const handleSaveStageConfig = async (updatedSteps: StageStep[]) => {
    if (!projectData || !id) return;

    // Находим активный этап
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const activeStage = projectData.stages.find((s: any) => s.status === 'active');
    if (!activeStage) return;

    try {
      // activeStage._key или activeStage.id в зависимости от того, что приходит с бека
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const stageId = (activeStage as any)._key || activeStage.id;

      await api.updateStageSteps(id, stageId, updatedSteps);
      await loadData(); // Перезагружаем, чтобы убедиться, что данные сохранились
    } catch (e) {
      console.error(e);
      alert("Ошибка сохранения настроек");
    }
  };

  // --- RENDER ---

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-blue-600" /></div>;
  }

  // Сценарий 1: Проект пустой (нет этапов)
  if (!projectData?.stages || projectData.stages.length === 0) {
    return (
      <div className="flex h-screen bg-gray-50">
        <SidebarNav />
        <div className="flex-1 p-12 flex flex-col items-center justify-center">
          <div className="max-w-2xl w-full space-y-8">
            <div className="text-center space-y-2">
              <Typography variant="h2">Настройка проекта</Typography>
              <Typography variant="body" color="text-gray-500">
                Проект "{projectData?.projectName}" создан. Выберите шаблон первого этапа, чтобы начать работу.
              </Typography>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {templates.map(tpl => (
                <Card
                  key={tpl.id}
                  className="p-6 cursor-pointer hover:border-blue-500 hover:shadow-md transition-all group"
                  onClick={() => handleAddStage(tpl.id)}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <LayoutTemplate size={24} />
                    </div>
                    <Typography variant="h4">{tpl.name}</Typography>
                  </div>
                  <Typography variant="small" color="text-gray-500">
                    {tpl.description}
                  </Typography>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Находим активный этап для отображения в правой панели
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activeStage = projectData.stages.find((s: any) => s.status === 'active');

  // Сценарий 2: Проект с этапами (Основной интерфейс)
  return (
    <div className="flex h-screen w-screen bg-gray-100 overflow-hidden font-sans">
      <SidebarNav />
      <div className="flex-1 flex flex-col min-w-0">

        {/* Timeline */}
        <ProjectTimeline
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          stages={projectData.stages.map((s: any) => ({
            id: Number(s._key) || s.id,
            name: s.name,
            status: s.status
          }))}
        />

        <div className="flex-1 flex overflow-hidden">
          {/* Editor Area */}
          <div className="flex-1 flex flex-col min-w-0 bg-white relative">
            <EditorToolbar
              title={projectData.projectName}
              mode="FULL_EDITOR"
              onAnalyze={() => {}}
              isAnalyzing={false}
              canAnalyze={true}
            />
            <div className="flex-1 overflow-y-auto p-8 max-w-4xl mx-auto w-full">
               <TiptapEditor content={content} onChange={setContent} />
            </div>
          </div>

          {/* Right Panel */}
          {isRightPanelOpen ? (
            <div className="w-80 border-l border-gray-200 bg-white flex flex-col shrink-0 h-full">
              {/* Tabs Header */}
              <div className="flex border-b border-gray-200 shrink-0">
                <TabButton label="Процесс" isActive={rightPanelTab === 'process'} onClick={() => setRightPanelTab('process')} />
                <TabButton label="Контекст" isActive={rightPanelTab === 'context'} onClick={() => setRightPanelTab('context')} />
                <Button variant="ghost" size="sm" icon={PanelRightClose} onClick={() => setIsRightPanelOpen(false)} />
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto relative">
                {rightPanelTab === 'process' ? (
                   <StageTimeline
                     steps={activeStage?.steps || []}
                     onSave={handleSaveStageConfig}
                     availableModels={aiModels}     // <-- Передаем модели из БД
                     availablePrompts={sysPrompts}  // <-- Передаем промпты из БД
                   />
                ) : (
                   <div className="p-4">
                     <ContextPanel />
                   </div>
                )}
              </div>

              {/* Footer: Context Counter (Always Visible) */}
              <div className="p-3 border-t border-gray-200 bg-gray-50 shrink-0">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                  <span>Контекст</span>
                  <span>45%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: '45%' }} />
                </div>
                <div className="text-[10px] text-gray-400 mt-1 text-right">
                  ~14k токенов
                </div>
              </div>

            </div>
          ) : (
            <div className="w-12 border-l border-gray-200 bg-white flex flex-col items-center py-4">
              <Button variant="ghost" size="sm" icon={PanelRightOpen} onClick={() => setIsRightPanelOpen(true)} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
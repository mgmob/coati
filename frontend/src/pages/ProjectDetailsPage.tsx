import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { PanelRightClose, PanelRightOpen, LayoutTemplate, Loader2 } from 'lucide-react';

// 1. New Context Architecture Imports
import { ProjectDetailsProvider } from '../contexts/ProjectDetailsProvider';
import { useProjectDetails, type Stage } from '../contexts/useProjectDetails';

// 2. Zustand Store
import { useAIStore } from '../stores/aiStore';

// 3. UI Components
import { Button } from '../components/atoms/Button';
import { Card } from '../components/atoms/Card';
import { Typography } from '../components/atoms/Typography';
import { TabButton } from '../components/molecules/TabButton';
import { SidebarNav } from '../components/organisms/SidebarNav';
import { ProjectTimeline } from '../components/organisms/ProjectTimeline';
import { EditorToolbar } from '../components/organisms/EditorToolbar';
import { TiptapEditor } from '../components/organisms/TiptapEditor';
import { StageTimeline } from '../components/organisms/StageTimeline';
import { ContextPanel } from '../components/organisms/ContextPanel';
import { AIProviderSelector } from '../components/organisms/AIProviderSelector';
import { useDebugMode } from '../lib/useDebugMode';
import type { StageStep, StageTemplate } from '../api';

// --- INTERNAL CONTENT COMPONENT ---
function ProjectDetailsContent() {
  const { log } = useDebugMode();

  // Local Context Data
  const {
    project: projectData,
    isLoading,
    addStage,
    updateStageSteps,
    setContent
  } = useProjectDetails();

  // Zustand Store
  const { models: aiModels, prompts: sysPrompts, templates, loading: aiLoading, fetchAll } = useAIStore();

  // Local UI State
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [rightPanelTab, setRightPanelTab] = useState<'process' | 'context'>('process');

  // Derived State
  const content = projectData?.content || '';

  // 1. Effect: Lazy Load AI Data When Needed
  useEffect(() => {
    if (!aiLoading && aiModels.length === 0 && sysPrompts.length === 0 && templates.length === 0) {
      fetchAll();
    }
  }, [aiLoading, aiModels.length, sysPrompts.length, templates.length, fetchAll]);

  // 2. Effect: Logging
  useEffect(() => {
    if (projectData) {
      log('Project Data loaded', projectData);
    }
  }, [projectData, log]);

  // --- HANDLERS ---
  const handleAddStage = async (templateId: string) => {
    try {
      await addStage(templateId);
    } catch (error) {
      console.error(error);
      alert("Error adding stage");
    }
  };

  const handleSaveStageConfig = async (updatedSteps: StageStep[]) => {
    if (!projectData) return;
    const activeStage = projectData.stages.find((s: Stage) => s.status === 'active');

    if (activeStage) {
        const stageId = activeStage.id || activeStage._key;
        if (stageId) await updateStageSteps(stageId, updatedSteps);
    }
  };

  // --- RENDER ---

  if (isLoading || !projectData) {
    return (
        <div className="flex h-screen items-center justify-center">
            <Loader2 className="animate-spin text-blue-600" />
        </div>
    );
  }

  // SCENARIO A: Empty Project (Setup View)
  if (!projectData.stages || projectData.stages.length === 0) {
    return (
      <div className="flex h-screen bg-gray-50">
        <SidebarNav />
        <div className="flex-1 p-12 flex flex-col items-center justify-center">
          <div className="max-w-2xl w-full space-y-8">
            <div className="text-center space-y-2">
              <Typography variant="h2">Проект: {projectData.projectName}</Typography>
              <Typography variant="body" color="text-gray-500">
                Проект создан. Выберите этап, с которого хотите начать работу над проектом.
              </Typography>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {templates.map((tpl: StageTemplate) => (
                <Card
                  key={tpl.id}
                  className="p-6 cursor-pointer hover:border-blue-500 hover:shadow-md transition-all group"
                  onClick={() => handleAddStage(tpl.id)}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 transition-colors">
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

  // SCENARIO B: Active Project (Full Editor View)
  const activeStage = projectData.stages.find((s: Stage) => s.status === 'active');

  return (
    <div className="flex h-screen w-screen bg-gray-100 overflow-hidden font-sans">
      <SidebarNav />
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top Timeline */}
        <ProjectTimeline
          stages={projectData.stages.map((s: Stage) => ({
            id: Number(s._key) || Number(s.id) || 0,
            name: s.name,
            status: s.status
          }))}
        />

        <div className="flex-1 flex overflow-hidden">
          {/* Center: Editor */}
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

          {/* Right: Sidebar Panel */}
          {isRightPanelOpen ? (
            <div className="w-80 border-l border-gray-200 bg-white flex flex-col shrink-0 h-full">
              <div className="flex border-b border-gray-200 shrink-0">
                <TabButton label="Process" isActive={rightPanelTab === 'process'} onClick={() => setRightPanelTab('process')} />
                <TabButton label="Context" isActive={rightPanelTab === 'context'} onClick={() => setRightPanelTab('context')} />
                <Button variant="ghost" size="sm" icon={PanelRightClose} onClick={() => setIsRightPanelOpen(false)} />
              </div>

              <div className="flex-1 overflow-y-auto relative">
                {rightPanelTab === 'process' ? (
                   <StageTimeline
                     steps={activeStage?.steps || []}
                     onSave={handleSaveStageConfig}
                     availableModels={aiModels}
                     availablePrompts={sysPrompts}
                   />
                ) : (
                   <div className="p-4">
                     <ContextPanel />
                   </div>
                )}
              </div>

              {/* Footer: AI Provider + Stats */}
              <div className="border-t border-gray-200 bg-gray-50 shrink-0">
                <AIProviderSelector compact className="border-b border-gray-200" />
                <div className="p-3">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>Context Usage</span>
                    <span>45%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: '45%' }} />
                  </div>
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

// --- MAIN WRAPPER ---
export default function ProjectDetailsPage() {
  const { id } = useParams<{ id: string }>();

  if (!id) return <div>Project ID not found</div>;

  return (
    <ProjectDetailsProvider projectId={id}>
      <ProjectDetailsContent />
    </ProjectDetailsProvider>
  );
}

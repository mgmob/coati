import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutGrid, Plus, Settings, Folder, Bug } from 'lucide-react';
import { api, type Project } from '../../api';
import { apiLogger } from '../../lib/apiLogger';
import { Logo } from '../atoms/Logo';
import { cn } from '../../lib/utils';
import { Button } from '../atoms/Button';
import { DebugPanel } from './DebugPanel';

export const SidebarNav: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const loadProjects = async () => {
      const correlationId = `SidebarNav-loadProjects-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      try {
        apiLogger.setCurrentLocation('SidebarNav::loadProjects');
        apiLogger.setCurrentExpected('Array<Project> – проекты для навигации');
        apiLogger.setCurrentCorrelationId(correlationId);
        const data = await api.getProjects();
        setProjects(data);
        apiLogger.markProcessedGlobally('listProjects', true);
      } catch (e) {
        console.error("Failed to load projects:", e);
      }
    };

    loadProjects();
  }, []);

  return (
    <div className="w-64 bg-gray-50 text-gray-900 flex flex-col h-screen shrink-0 border-r border-gray-200">
      {/* Logo Area */}
      <div
        className="h-14 flex items-center px-4 gap-3 border-b border-gray-200 cursor-pointer hover:bg-gray-100 transition"
        onClick={() => navigate('/')}
      >
        <Logo size={24} />
        <span className="font-bold text-gray-800 tracking-tight text-lg">Coati</span>
      </div>

      {/* Main Nav */}
      <div className="p-3 space-y-1">
        <NavLink
          to="/"
          className={({ isActive }) => cn(
            "flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium",
            isActive ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
          )}
        >
          <LayoutGrid size={18} />
          Все проекты
        </NavLink>
      </div>

      {/* Projects List (Scrollable) */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2">
          Недавние
        </div>
        <div className="space-y-0.5">
          {projects.map(p => (
            <NavLink
              key={p.id}
              to={`/project/${p.id}`}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm truncate",
                isActive ? "bg-white shadow-sm border border-gray-200 text-gray-900 font-medium" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              )}
            >
              {({ isActive }) => (
                <>
                  <Folder size={16} className={cn("shrink-0", isActive ? "text-blue-500" : "text-gray-400")} />
                  <span className="truncate">{p.name}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-3 border-t border-gray-200 space-y-1">
        <Button
          variant="ghost"
          className="w-full justify-start text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          icon={Bug}
          onClick={() => setIsDebugOpen(true)}
        >
          Debug API
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          icon={Plus}
          onClick={() => navigate('/')}
        >
          Новый проект
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          icon={Settings}
        >
          Настройки
        </Button>
      </div>

      <DebugPanel
        isOpen={isDebugOpen}
        onClose={() => setIsDebugOpen(false)}
      />
    </div>
  );
};

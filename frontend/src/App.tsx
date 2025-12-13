import { DebugModeProvider } from './lib/debugModeContext';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailsPage from './pages/ProjectDetailsPage';

function App() {
  return (
    <DebugModeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<ProjectsPage />} />
          <Route path="/project/:id" element={<ProjectDetailsPage />} />
        </Routes>
      </BrowserRouter>
    </DebugModeProvider>
  );
}

export default App;

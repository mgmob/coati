import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import ProjectsPage from './pages/ProjectsPage';
// ProjectDetailsPage создадим чуть позже, пока поставим заглушку
const ProjectDetailsPage = () => <div>Страница проекта (в разработке)</div>;

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<ProjectsPage />} />
          <Route path="project/:id" element={<ProjectDetailsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
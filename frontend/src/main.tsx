import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import './index.css';

// Импортируем страницы
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailsPage from './pages/ProjectDetailsPage'; // <--- ПРОВЕРЬ ЭТОТ ИМПОРТ

const router = createBrowserRouter([
  {
    path: "/",
    element: <ProjectsPage />,
  },
  {
    path: "/project/:id", // <--- И ЭТОТ ПУТЬ
    element: <ProjectDetailsPage />,
  },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
import { Outlet } from 'react-router-dom';

export function Layout() {
  return (
    <div className="max-w-4xl mx-auto p-8">
      {/* Шапка, общая для всех страниц */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Coati</h1>
        <p className="text-gray-500">Система управления требованиями</p>
      </div>

      {/* Сюда будут подставляться страницы */}
      <Outlet />
    </div>
  );
}

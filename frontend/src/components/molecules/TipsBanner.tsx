import { useState, useEffect } from 'react';
import { Lightbulb, Zap, AlertTriangle, Info } from 'lucide-react';

interface Tip {
  icon: React.ReactNode;
  text: string;
  iconColor: string;
}

const tips: Tip[] = [
  {
    icon: <Lightbulb size={20} />,
    text: 'Четкие требования — основа успешного проекта. Используйте структурированный подход для сбора и документирования требований.',
    iconColor: 'text-yellow-500'
  },
  {
    icon: <Zap size={20} />,
    text: 'Автоматизируйте процесс! Coati поможет анализировать, структурировать и улучшать ваши требования с помощью ИИ.',
    iconColor: 'text-blue-500'
  },
  {
    icon: <AlertTriangle size={20} />,
    text: 'Избегайте неоднозначности в формулировках. Каждое требование должно быть измеримым и проверяемым.',
    iconColor: 'text-orange-500'
  },
  {
    icon: <Info size={20} />,
    text: 'Вовлекайте стейкхолдеров на ранних этапах. Регулярный фидбек помогает выявить проблемы до начала разработки.',
    iconColor: 'text-green-500'
  }
];

export const TipsBanner: React.FC = () => {
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      // Fade out
      setIsVisible(false);

      // Wait for fade out animation, then change tip and fade in
      setTimeout(() => {
        setCurrentTipIndex((prev) => (prev + 1) % tips.length);
        setIsVisible(true);
      }, 300);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const currentTip = tips[currentTipIndex];

  return (
    <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100 shadow-sm">
      <div
        className={`flex items-start gap-3 transition-opacity duration-300 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className={`${currentTip.iconColor} mt-0.5 shrink-0`}>
          {currentTip.icon}
        </div>
        <p className="text-sm text-gray-700 leading-relaxed">
          {currentTip.text}
        </p>
      </div>

      {/* Progress dots */}
      <div className="flex gap-1.5 mt-3 justify-center">
        {tips.map((_, index) => (
          <div
            key={index}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              index === currentTipIndex
                ? 'w-6 bg-blue-500'
                : 'w-1.5 bg-gray-300'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

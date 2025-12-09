import React from 'react';

export const FormError: React.FC<{ message?: string }> = ({ message }) => {
  if (!message) return null;
  return <p className="text-[10px] font-medium text-red-500 mt-1">{message}</p>;
};

export const FormHelper: React.FC<{ text?: string }> = ({ text }) => {
  if (!text) return null;
  return <p className="text-[10px] text-gray-500 mt-1">{text}</p>;
};
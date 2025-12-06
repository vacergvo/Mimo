import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

const Input: React.FC<InputProps> = ({ label, className = '', ...props }) => {
  return (
    <div className="w-full">
      {label && <label className="block text-sm font-medium text-[var(--text-main)] mb-1 ml-1">{label}</label>}
      <input 
        className={`w-full p-3 bg-[var(--bg-input)] border border-[var(--primary)]/20 rounded-xl text-[var(--text-main)] placeholder-[var(--text-sub)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 focus:border-transparent transition-shadow ${className}`}
        {...props} 
      />
    </div>
  );
};

export default Input;
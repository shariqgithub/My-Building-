import React from 'react';
import { ProductionLogin } from './ProductionLogin';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-md my-auto animate-in fade-in zoom-in-95 duration-200">
        <ProductionLogin isModal={true} onClose={onClose} />
      </div>
    </div>
  );
};

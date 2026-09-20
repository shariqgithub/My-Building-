import React from 'react';
import { ProductionLogin } from './ProductionLogin';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return <ProductionLogin isModal={true} onClose={onClose} />;
};

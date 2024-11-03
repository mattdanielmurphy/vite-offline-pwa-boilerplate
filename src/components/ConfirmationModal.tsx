import React from 'react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  isDanger?: boolean;
  isSuccess?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = "OK",
  cancelText,
  onConfirm,
  onCancel,
  isDanger = false,
  isSuccess = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>{title}</h2>
        <p>{message}</p>
        <div className="modal-buttons">
          <button 
            onClick={onConfirm || onCancel}
            className={`primary-button ${isDanger ? 'danger' : ''} ${isSuccess ? 'success' : ''}`}
          >
            {confirmText}
          </button>
          {cancelText && onCancel && (
            <button 
              onClick={onCancel}
              className="secondary-button"
            >
              {cancelText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal; 
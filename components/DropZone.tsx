import React, { useCallback, useState } from 'react';

interface DropZoneProps {
  onFilesDropped: (files: File[]) => void;
  isProcessing: boolean;
}

const DropZone: React.FC<DropZoneProps> = ({ onFilesDropped, isProcessing }) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      if (isProcessing) return;

      const files = (Array.from(e.dataTransfer.files) as File[]).filter((file) =>
        file.name.toLowerCase().endsWith('.msg')
      );

      if (files.length > 0) {
        onFilesDropped(files);
      } else {
        alert("Please drop valid .msg files.");
      }
    },
    [onFilesDropped, isProcessing]
  );

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
           const files = (Array.from(e.target.files) as File[]).filter((file) =>
            file.name.toLowerCase().endsWith('.msg')
          );
          if (files.length > 0) {
            onFilesDropped(files);
          }
      }
  }, [onFilesDropped]);

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        relative border-2 border-dashed rounded-sm p-10 text-center transition-all duration-200 ease-in-out
        ${
          isDragOver
            ? 'border-[#1C3F94] bg-blue-50/50'
            : 'border-slate-300 bg-white hover:border-[#1C3F94] hover:bg-slate-50'
        }
        ${isProcessing ? 'opacity-50 cursor-wait' : 'cursor-pointer'}
      `}
    >
        <input 
            type="file" 
            multiple 
            accept=".msg" 
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            disabled={isProcessing}
            onChange={handleFileInput}
        />
      <div className="flex flex-col items-center justify-center space-y-4 pointer-events-none">
        <div className={`p-3 rounded-full transition-colors ${isDragOver ? 'bg-blue-100' : 'bg-slate-100'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-8 w-8 ${isDragOver ? 'text-[#1C3F94]' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
        </div>
        <div className="text-slate-700">
            <span className="font-bold text-[#1C3F94]">Click to upload</span> or drag and drop
        </div>
        <p className="text-xs text-slate-500 font-medium">
          Support for multiple .msg Outlook files (max 100 at a time)
        </p>
      </div>
    </div>
  );
};

export default DropZone;
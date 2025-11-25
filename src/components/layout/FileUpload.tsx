import React from 'react';
import { Upload } from 'lucide-react';

interface FileUploadProps {
    onFileSelect: (files: File[]) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect }) => {
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const files = Array.from(e.dataTransfer.files).filter(
            file => file.name.endsWith('.xlsx') || file.name.endsWith('.xls')
        );
        if (files.length > 0) {
            onFileSelect(files);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const files = Array.from(e.target.files);
            onFileSelect(files);
        }
    };

    return (
        <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-indigo-500 transition-colors cursor-pointer bg-gray-50"
        >
            <input
                type="file"
                accept=".xlsx,.xls"
                multiple
                onChange={handleChange}
                className="hidden"
                id="file-upload"
            />
            <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-700">
                    Drop Excel files here or click to upload
                </p>
                <p className="text-sm text-gray-500 mt-2">
                    Supports multiple .xlsx or .xls files
                </p>
            </label>
        </div>
    );
};

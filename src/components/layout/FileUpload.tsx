import React from 'react';
import { Upload } from 'lucide-react';

interface FileUploadProps {
    onFileSelect: (files: File[]) => void;
    onDemoLoad?: () => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, onDemoLoad }) => {
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
        <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto">
            <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className="group relative border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-indigo-500 hover:bg-indigo-50/30 transition-all duration-300 cursor-pointer bg-white shadow-sm hover:shadow-md"
            >
                <input
                    type="file"
                    accept=".xlsx,.xls"
                    multiple
                    onChange={handleChange}
                    className="hidden"
                    id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                    <div className="p-3 bg-indigo-50 rounded-full mb-3 group-hover:scale-110 transition-transform duration-300">
                        <Upload className="w-6 h-6 text-indigo-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        Upload Test Data
                    </h3>
                    <p className="text-gray-500 mb-4 max-w-sm mx-auto text-sm">
                        Drag and drop your Excel files here, or click to browse. Supports multiple files.
                    </p>
                    <span className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg shadow-sm hover:bg-indigo-700 transition-colors">
                        Select Files
                    </span>
                </label>
            </div>

            {onDemoLoad && (
                <div className="flex items-center justify-center gap-2">
                    <span className="text-sm text-gray-400">or</span>
                    <button
                        onClick={onDemoLoad}
                        className="text-sm font-medium text-gray-600 hover:text-indigo-600 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors border border-transparent hover:border-gray-200"
                    >
                        Load Demo Project
                    </button>
                </div>
            )}
        </div>
    );
};

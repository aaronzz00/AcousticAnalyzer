import React from 'react';
import { Activity } from 'lucide-react';

interface LayoutProps {
    children: React.ReactNode;
    sidebar: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children, sidebar }) => {
    return (
        <div className="flex h-screen bg-gray-100 overflow-hidden">
            {/* Sidebar */}
            <aside className="w-64 bg-white shadow-md flex flex-col z-10">
                <div className="p-4 border-b flex items-center gap-2 font-bold text-lg text-indigo-600">
                    <Activity className="w-6 h-6" />
                    <span>AcousticAnalyzer</span>
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                    {sidebar}
                </div>
                <div className="p-4 border-t text-xs text-gray-500 text-center">
                    v1.0.0
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden">
                <header className="bg-white shadow-sm p-4 flex justify-between items-center">
                    <h1 className="text-xl font-semibold text-gray-800">Analysis Report</h1>
                    <div className="flex gap-2">
                        {/* Toolbar actions can go here */}
                    </div>
                </header>
                <div className="flex-1 overflow-y-auto p-6">
                    {children}
                </div>
            </main>
        </div>
    );
};

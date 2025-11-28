import { useState, useRef, useMemo, useEffect, useCallback } from 'react';


import { Layout } from './components/layout/Layout';
import { FileUpload } from './components/layout/FileUpload';
import { LazyChartWrapper } from './components/layout/LazyChartWrapper';
import { FrequencyResponseChart } from './components/charts/FrequencyResponseChart';
import { CPKChart } from './components/charts/CPKChart';
import { CPKLineChart } from './components/charts/CPKLineChart';
import { ExcelParser } from './services/ExcelParser';
import type { TestItem } from './types';
import { DataProcessor, type FilterOptions } from './services/DataProcessor';
import { StatisticsService } from './services/StatisticsService';
import { PersistenceService } from './services/PersistenceService';
import { Download, Filter, Save, EyeOff, Plus, Play, Upload, Sparkles } from 'lucide-react';
import { AIService } from './services/AIService';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

function App() {
  const [items, setItems] = useState<TestItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<TestItem[]>([]);
  const [comments, setComments] = useState<Record<string, string>>({});
  const [visibility, setVisibility] = useState<Record<string, boolean>>({});
  const [summary, setSummary] = useState<string>('');
  const [reportTitle, setReportTitle] = useState<string>('Acoustic Test Report');

  // Test metadata fields
  const [testMetadata, setTestMetadata] = useState<Array<{ key: string, value: string }>>([
    { key: 'Project Name', value: '' },
    { key: 'Product Stage', value: '' },
    { key: 'Hardware Config', value: '' },
    { key: 'Firmware Config', value: '' },
    { key: 'Test Time', value: '' }
  ]);

  const [chartLayouts, setChartLayouts] = useState<Record<string, any>>({});
  const [isAnalysisMode, setIsAnalysisMode] = useState(false);

  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    deduplicate: true,
    filterType: 'ALL',
    mergeChannels: false
  });

  // Track which charts have been rendered for lazy loading
  const [renderedCharts, setRenderedCharts] = useState<Set<string>>(new Set());
  const [fileCount, setFileCount] = useState(0);

  const reportRef = useRef<HTMLDivElement>(null);

  const handleRelayout = (id: string, layout: any) => {
    // Only save axis ranges to avoid saving entire layout state
    const savedLayout: any = {};
    if (layout['xaxis.range[0]']) {
      savedLayout.xaxis = { range: [layout['xaxis.range[0]'], layout['xaxis.range[1]']] };
    }
    if (layout['yaxis.range[0]']) {
      savedLayout.yaxis = { range: [layout['yaxis.range[0]'], layout['yaxis.range[1]']] };
    }
    // Also handle full axis objects if returned
    if (layout.xaxis?.range) savedLayout.xaxis = { range: layout.xaxis.range };
    if (layout.yaxis?.range) savedLayout.yaxis = { range: layout.yaxis.range };

    if (Object.keys(savedLayout).length > 0) {
      setChartLayouts(prev => ({ ...prev, [id]: { ...prev[id], ...savedLayout } }));
    }
  };

  const handleFileUpload = async (files: File[]) => {
    // Loading state removed - not needed
    try {
      const newItems: TestItem[] = [];

      for (const file of files) {
        const data = await ExcelParser.parse(file);
        newItems.push(...data.testItems);
      }

      setFileCount(prev => prev + files.length);

      // Append new items to existing items (staging)
      const updatedItems = [...items, ...newItems];

      // Extract title from filenames if this is the first upload
      if (items.length === 0 && files.length > 0) {
        const filenames = Array.from(files).map(f => f.name.replace(/\.[^/.]+$/, '')); // Remove extensions
        if (filenames.length === 1) {
          setReportTitle(filenames[0]);
        } else {
          // Find common prefix
          let prefix = filenames[0];
          for (let i = 1; i < filenames.length; i++) {
            while (filenames[i].indexOf(prefix) !== 0) {
              prefix = prefix.substring(0, prefix.length - 1);
              if (prefix === '') break;
            }
          }
          setReportTitle(prefix.trim() || 'Acoustic Test Report');
        }
      }

      // Consolidate items
      const consolidatedItems = DataProcessor.consolidateItems(updatedItems);
      setItems(consolidatedItems);

      // Initialize visibility for new items
      const newVis = { ...visibility };
      consolidatedItems.forEach(i => {
        if (newVis[i.name] === undefined) newVis[i.name] = true;
      });
      setVisibility(newVis);

      // We don't process filteredItems yet if not in analysis mode, 
      // but let's keep them in sync just in case.
      const processed = DataProcessor.process(consolidatedItems, filterOptions);
      setFilteredItems(processed);
    } catch (err) {
      console.error(err);
      alert('Error parsing file(s)');
    } finally {
      // Loading complete
    }
  };

  const startAnalysis = () => {
    if (items.length === 0) return;
    setIsAnalysisMode(true);
    // Ensure processing is fresh
    const processed = DataProcessor.process(items, filterOptions);
    setFilteredItems(processed);
  };

  // Debounced filter processing
  const processFilters = useCallback((options: FilterOptions) => {
    const processed = DataProcessor.process(items, options);
    setFilteredItems(processed);
  }, [items]);

  const debouncedProcessRef = useRef<number | undefined>(undefined);

  const handleFilterChange = (newOptions: Partial<FilterOptions>) => {
    const options = { ...filterOptions, ...newOptions };
    setFilterOptions(options);

    // Debounce the expensive processing
    if (debouncedProcessRef.current) {
      clearTimeout(debouncedProcessRef.current);
    }

    debouncedProcessRef.current = setTimeout(() => {
      processFilters(options);
    }, 150); // 150ms debounce
  };

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debouncedProcessRef.current) {
        clearTimeout(debouncedProcessRef.current);
      }
    };
  }, []);

  // Memoize unit and set level statistics calculations
  const statistics = useMemo(() => {
    return StatisticsService.calculate(filteredItems, filterOptions);
  }, [filteredItems, filterOptions]);

  const [exportingIndex, setExportingIndex] = useState<number | null>(null);
  const pdfDocRef = useRef<jsPDF | null>(null);
  const pdfYRef = useRef<number>(10);

  // Batch PDF Export Effect
  useEffect(() => {
    if (exportingIndex === null) return;

    const processItem = async () => {
      // Wait for render
      await new Promise(resolve => setTimeout(resolve, 500)); // Give Plotly time to render

      const container = document.getElementById('pdf-export-container');
      if (!container) {
        console.error('Export container not found');
        setExportingIndex(null);

        return;
      }

      try {
        const canvas = await html2canvas(container, {
          scale: 1.5,
          useCORS: true,
          logging: false,
          allowTaint: true,
          backgroundColor: '#ffffff'
        });

        if (pdfDocRef.current) {
          const pdf = pdfDocRef.current;
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = pdf.internal.pageSize.getHeight();
          const margin = 10;
          const contentWidth = pdfWidth - 2 * margin;

          const imgData = canvas.toDataURL('image/jpeg', 0.8);
          const imgHeight = (canvas.height * contentWidth) / canvas.width;

          if (pdfYRef.current + imgHeight > pdfHeight - margin) {
            pdf.addPage();
            pdfYRef.current = margin;
          }

          pdf.addImage(imgData, 'JPEG', margin, pdfYRef.current, contentWidth, imgHeight);
          pdfYRef.current += imgHeight + 5;
        }

        // Next item
        if (exportingIndex < filteredItems.length - 1) {
          setExportingIndex(prev => (prev !== null ? prev + 1 : null));
        } else {
          // Finish
          pdfDocRef.current?.save('analysis_report.pdf');
          setExportingIndex(null);

          pdfDocRef.current = null;
        }
      } catch (err) {
        console.error('Error capturing item', err);
        // Continue anyway?
        if (exportingIndex < filteredItems.length - 1) {
          setExportingIndex(prev => (prev !== null ? prev + 1 : null));
        } else {
          setExportingIndex(null);

        }
      }
    };

    processItem();
  }, [exportingIndex, filteredItems]);

  const startBatchExport = () => {
    // Use browser print instead of jsPDF to avoid crashes
    const reportElement = reportRef.current;
    if (!reportElement) {
      alert('Report not available for export');
      return;
    }

    // Get all stylesheets
    const styles = Array.from(document.styleSheets)
      .map(styleSheet => {
        try {
          return Array.from(styleSheet.cssRules)
            .map(rule => rule.cssText)
            .join('\n');
        } catch (e) {
          return '';
        }
      })
      .join('\n');

    // Create HTML with print settings
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Acoustic Test Report - Print</title>
  <style>
    ${styles}
    
    /* Hide non-print elements */
    .no-print {
      display: none !important;
    }
    
    /* Print-specific styles */
    @page {
      size: A4;
      margin: 5mm; /* Minimal margins */
    }
    
    body {
      margin: 0;
      padding: 0;
      transform: scale(0.6); /* 60% zoom */
      transform-origin: top left;
      width: 166.67%; /* Compensate for 60% scale (100/0.6) */
    }
    
    @media print {
      .no-print {
        display: none !important;
      }
      body {
        margin: 0 !important;
        padding: 0 !important;
      }
    }
  </style>
</head>
<body>
  ${reportElement.outerHTML}
  <script>
    window.addEventListener('load', () => {
      // Auto-trigger print dialog
      setTimeout(() => {
        window.print();
      }, 500);
    });
  </script>
</body>
</html>
    `;

    // Open in new window and print
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
    } else {
      alert('Please allow popups to export PDF');
    }
  };

  const exportAsHTML = () => {
    // Clone the report content
    const reportElement = reportRef.current;
    if (!reportElement) {
      alert('Report not available for export');
      return;
    }

    // Get all stylesheets
    const styles = Array.from(document.styleSheets)
      .map(styleSheet => {
        try {
          return Array.from(styleSheet.cssRules)
            .map(rule => rule.cssText)
            .join('\n');
        } catch (e) {
          // Cross-origin stylesheets can't be accessed
          return '';
        }
      })
      .join('\n');

    // Create HTML document
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Acoustic Test Report</title>
  <style>
    ${styles}
    
    /* Hide non-print elements */
    .no-print {
      display: none !important;
    }
    
    /* Print-specific styles */
    @media print {
      .no-print {
        display: none !important;
      }
      body {
        margin: 0;
        padding: 20px;
      }
    }
  </style>
</head>
<body>
  ${reportElement.outerHTML}
  <script>
    // Auto-load all charts (force visibility for lazy-loaded content)
    window.addEventListener('load', () => {
      console.log('Report loaded. Use browser Print (Ctrl/Cmd+P) to save as PDF.');
    });
  </script>
</body>
</html>
    `;

    // Create blob and download
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const sanitizedTitle = reportTitle.replace(/[^a-z0-9_\-]/gi, '_');
    a.download = `${sanitizedTitle}_${new Date().toISOString().slice(0, 10)}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Group items by name for Side-by-Side rendering
  const groupedItems = useMemo(() => {
    const groups: Record<string, TestItem[]> = {};
    filteredItems.forEach((item: TestItem) => {
      const baseName = item.name; // Name is already cleaned in Parser
      if (!groups[baseName]) groups[baseName] = [];
      groups[baseName].push(item);
    });
    return Object.values(groups);
  }, [filteredItems]);

  const handleSaveProject = () => {
    PersistenceService.saveProject(items, comments, visibility, filterOptions, summary, chartLayouts, reportTitle, testMetadata);
  };

  const handleDemoLoad = async () => {
    try {
      const response = await fetch('/demo_data.json');
      if (!response.ok) throw new Error('Failed to load demo data');

      const projectState = await response.json();

      // Load state from project file
      setItems(projectState.items || []);
      setComments(projectState.comments || {});
      setVisibility(projectState.visibility || {});
      setFilterOptions(projectState.filterOptions || { deduplicate: true, filterType: 'ALL', mergeChannels: false });
      setSummary(projectState.summary || '');
      setReportTitle(projectState.reportTitle || 'Demo Project');
      setChartLayouts(projectState.chartLayouts || {});
      if (projectState.testMetadata) {
        setTestMetadata(projectState.testMetadata);
      }

      // Process filters immediately
      const processed = DataProcessor.process(projectState.items || [], projectState.filterOptions || { deduplicate: true, filterType: 'ALL', mergeChannels: false });
      setFilteredItems(processed);

      // Auto-start analysis for demo
      setIsAnalysisMode(true);
      setFileCount(1); // Demo is 1 file
    } catch (err) {
      console.error(err);
      alert('Error loading demo data');
    }
  };

  const handleBackToHome = () => {
    if (confirm('Are you sure you want to return to home? Current analysis will be lost unless saved.')) {
      setItems([]);
      setFilteredItems([]);
      setComments({});
      setVisibility({});
      setSummary('');
      setReportTitle('Acoustic Test Report');
      setChartLayouts({});
      setIsAnalysisMode(false);
      setIsAnalysisMode(false);
      setRenderedCharts(new Set());
      setFileCount(0);
    }
  };

  return (
    <Layout
      sidebar={
        <div className="flex flex-col gap-4">
          {/* File Upload / Project Info */}
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
            <h3 className="font-semibold text-gray-700 mb-2">Project</h3>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => document.getElementById('project-upload')?.click()}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-indigo-600 transition-colors"
              >
                <Upload className="w-4 h-4" /> Load Project
                <input
                  type="file"
                  id="project-upload"
                  accept=".json"
                  className="hidden"
                  onChange={async (e) => {
                    if (e.target.files && e.target.files[0]) {
                      try {
                        const state = await PersistenceService.loadProject(e.target.files[0]);
                        setItems(state.items);
                        setComments(state.comments);
                        setVisibility(state.visibility);
                        setFilterOptions(state.filterOptions);
                        setSummary(state.summary || '');
                        setReportTitle(state.reportTitle || 'Acoustic Test Report');
                        setChartLayouts(state.chartLayouts || {});
                        setTestMetadata(state.testMetadata || [
                          { key: 'Project Name', value: '' },
                          { key: 'Product Stage', value: '' },
                          { key: 'Hardware Config', value: '' },
                          { key: 'Firmware Config', value: '' },
                          { key: 'Test Time', value: '' }
                        ]);
                        setIsAnalysisMode(true);
                        const processed = DataProcessor.process(state.items, state.filterOptions);
                        setFilteredItems(processed);
                        setFileCount(1);
                      } catch (err) {
                        alert('Failed to load project');
                      }
                    }
                  }}
                />
              </button>
              <button
                onClick={handleSaveProject}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-indigo-600 transition-colors"
              >
                <Save className="w-4 h-4" /> Save Project
              </button>
              <button
                onClick={startBatchExport}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-indigo-600 transition-colors"
              >
                <Download className="w-4 h-4" /> Export PDF
              </button>
              <button
                onClick={exportAsHTML}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-indigo-600 transition-colors"
                title="Export as standalone HTML file"
              >
                <Download className="w-4 h-4" /> Export HTML
              </button>
            </div>
          </div>

          {/* Test Metadata */}
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold text-gray-700">Test Info</h3>
              {/* Add Metadata Button */}
              <button
                onClick={() => {
                  const key = prompt("Enter new field name:");
                  if (key) {
                    setTestMetadata(prev => [...prev, { key, value: '' }]);
                  }
                }}
                className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded hover:bg-indigo-100"
                title="Add new field"
              >
                + Add
              </button>
            </div>
            <div className="flex flex-col gap-2 text-sm">
              {testMetadata.map((meta, index) => (
                <div key={index} className="flex flex-col gap-1 group relative">
                  <div className="flex justify-between items-center">
                    <label className="text-gray-500 text-xs">{meta.key}</label>
                    <button
                      onClick={() => {
                        if (confirm(`Delete field "${meta.key}"?`)) {
                          setTestMetadata(prev => prev.filter((_, i) => i !== index));
                        }
                      }}
                      className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity px-1"
                      title="Delete field"
                    >
                      ×
                    </button>
                  </div>
                  <input
                    type="text"
                    value={meta.value}
                    onChange={(e) => {
                      const newMeta = [...testMetadata];
                      newMeta[index].value = e.target.value;
                      setTestMetadata(newMeta);
                    }}
                    className="border rounded px-2 py-1 w-full focus:ring-1 focus:ring-indigo-500 outline-none"
                    placeholder={`Enter ${meta.key}`}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Filters */}
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
            <h3 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <Filter className="w-4 h-4" /> Filters
            </h3>
            <div className="flex flex-col gap-2 text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filterOptions.deduplicate}
                  onChange={e => handleFilterChange({ deduplicate: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>Deduplicate SN</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filterOptions.mergeChannels}
                  onChange={e => handleFilterChange({ mergeChannels: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>Merge L/R Channels</span>
              </label>

              <div className="flex flex-col gap-1 mt-2">
                <span className="text-xs text-gray-500">Result Filter</span>
                <select
                  value={filterOptions.filterType}
                  onChange={e => handleFilterChange({ filterType: e.target.value as any })}
                  className="border rounded px-2 py-1 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                >
                  <option value="ALL">Show All</option>
                  <option value="PASS_ONLY">Pass Only</option>
                  <option value="FAIL_ONLY">Fail Only</option>
                </select>
              </div>
            </div>
          </div>

          {/* Navigation / TOC */}
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 flex-1 overflow-y-auto">
            <h3 className="font-semibold text-gray-700 mb-2">Test Items</h3>
            <div className="flex flex-col gap-1 text-sm">
              {Array.from(new Set(filteredItems.map(item => item.name))).map(name => {
                const item = filteredItems.find(i => i.name === name);
                if (!item) return null;
                return (
                  <button
                    key={name}
                    onClick={() => {
                      document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className={`text-left px-2 py-1 rounded truncate hover:bg-indigo-50 hover:text-indigo-600 transition-colors ${!visibility[item.name] ? 'opacity-50 line-through' : ''
                      }`}
                    title={name}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      }
      actions={
        isAnalysisMode ? (
          <button
            onClick={handleBackToHome}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2 text-sm font-medium"
          >
            Back to Home
          </button>
        ) : null
      }
    >
      <div className="max-w-5xl mx-auto" ref={reportRef}>
        {!isAnalysisMode ? (
          <div className="flex flex-col min-h-[80vh]">
            {/* Hero Section */}
            <div className="flex-1 flex flex-col items-center justify-center py-20 px-4">
              <div className="text-center mb-12 max-w-3xl mx-auto">
                <h1 className="text-5xl font-extrabold text-gray-900 mb-6 tracking-tight">
                  Acoustic Data <span className="text-indigo-600">Analyzer</span>
                </h1>
                <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                  Professional-grade analysis for acoustic test data. Visualize frequency responses, calculate CPK statistics, and generate comprehensive reports in seconds.
                </p>
              </div>

              <div className="w-full max-w-2xl mb-16">
                <FileUpload onFileSelect={handleFileUpload} onDemoLoad={handleDemoLoad} />
              </div>

              {items.length > 0 && (
                <div className="mt-6 mb-12 text-center animate-fade-in">
                  <p className="text-gray-600 mb-4">
                    {fileCount} files loaded. Ready for analysis.
                  </p>
                  <div className="flex justify-center gap-4">
                    <label className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors shadow-sm">
                      <Plus className="w-5 h-5" /> Add More Data
                      <input
                        type="file"
                        accept=".xlsx,.xls"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            handleFileUpload(Array.from(e.target.files));
                          }
                        }}
                      />
                    </label>
                    <button
                      onClick={startAnalysis}
                      className="px-8 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-lg flex items-center gap-2 font-medium"
                    >
                      <Play className="w-5 h-5" /> Start Analysis
                    </button>
                  </div>
                </div>
              )}

              {/* Features Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto w-full px-4">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Frequency Analysis</h3>
                  <p className="text-gray-600 text-sm">
                    Interactive frequency response visualization with logarithmic scaling and limit checking.
                  </p>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 bg-indigo-50 rounded-lg flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Statistical Control</h3>
                  <p className="text-gray-600 text-sm">
                    Automated CPK calculations, histograms, and yield analysis for production quality control.
                  </p>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Smart Reporting</h3>
                  <p className="text-gray-600 text-sm">
                    Generate comprehensive PDF reports with embedded charts and analysis summaries in seconds.
                  </p>
                </div>
              </div>
            </div>


          </div>
        ) : (
          <div ref={reportRef} className="space-y-8 bg-white p-8 min-h-screen">
            {/* Report Title */}
            <div className="mb-6">
              <input
                type="text"
                value={reportTitle}
                onChange={(e) => setReportTitle(e.target.value)}
                className="text-3xl font-bold text-gray-900 w-full border-b-2 border-transparent hover:border-gray-300 focus:border-indigo-500 focus:outline-none transition-colors text-center"
                placeholder="Report Title"
              />
            </div>

            {/* Test Information (Metadata) */}
            <div className="mb-8 border-b pb-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">Test Information</h2>
                <button
                  onClick={() => setTestMetadata([...testMetadata, { key: '', value: '' }])}
                  className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1 no-print"
                >
                  <Plus className="w-4 h-4" /> Add Field
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                {testMetadata.map((field, index) => (
                  <div key={index} className="flex gap-2 items-center group">
                    <input
                      type="text"
                      value={field.key}
                      onChange={(e) => {
                        const newMetadata = [...testMetadata];
                        newMetadata[index].key = e.target.value;
                        setTestMetadata(newMetadata);
                      }}
                      className="w-1/3 font-semibold text-gray-700 border-b border-transparent hover:border-gray-300 focus:border-indigo-500 focus:outline-none bg-transparent text-right"
                      placeholder="Field Name"
                    />
                    <span className="text-gray-400">:</span>
                    <input
                      type="text"
                      value={field.value}
                      onChange={(e) => {
                        const newMetadata = [...testMetadata];
                        newMetadata[index].value = e.target.value;
                        setTestMetadata(newMetadata);
                      }}
                      className="flex-1 text-gray-900 border-b border-transparent hover:border-gray-300 focus:border-indigo-500 focus:outline-none bg-transparent"
                      placeholder="Value"
                    />
                    <button
                      onClick={() => {
                        const newMetadata = testMetadata.filter((_, i) => i !== index);
                        setTestMetadata(newMetadata);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-opacity no-print"
                      title="Remove Field"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary Section */}
            <div className="mb-8 border-b pb-8">
              <h2 className="text-2xl font-bold mb-4 text-gray-800">Analysis Summary</h2>

              {/* Unit Statistics */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2 text-gray-700">
                  {statistics.sets.passed + statistics.sets.failed > 0
                    ? 'Unit Statistics (L/R Individual)'
                    : 'Product Statistics'}
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-gray-800">
                      {statistics.units.total}
                    </div>
                    <div className="text-sm text-gray-500">
                      {statistics.sets.passed + statistics.sets.failed > 0 ? 'Total Units' : 'Total Products'}
                    </div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {statistics.units.passed}
                    </div>
                    <div className="text-sm text-green-600">
                      {statistics.sets.passed + statistics.sets.failed > 0 ? 'Passed Units' : 'Passed Products'}
                    </div>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {statistics.units.failed}
                    </div>
                    <div className="text-sm text-red-600">
                      {statistics.sets.passed + statistics.sets.failed > 0 ? 'Failed Units' : 'Failed Products'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Set Statistics (L+R together) - Only shown when not merging */}
              {!filterOptions.mergeChannels && statistics.sets.passed + statistics.sets.failed > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2 text-gray-700">Set Statistics (L+R Pair)</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-green-50 p-4 rounded-lg text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {statistics.sets.passed}
                      </div>
                      <div className="text-sm text-green-600">Passed Sets</div>
                    </div>
                    <div className="bg-red-50 p-4 rounded-lg text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {statistics.sets.failed}
                      </div>
                      <div className="text-sm text-red-600">Failed Sets</div>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 mb-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Executive Summary
                  </label>
                  <button
                    onClick={async () => {
                      // Set loading state
                      const currentSummary = summary || '';
                      setSummary(currentSummary + (currentSummary ? '\n\n' : '') + "Generating executive summary with AI...");

                      try {
                        const aiSummary = await AIService.summarizeComments(comments);
                        setSummary(currentSummary + (currentSummary ? '\n\n' : '') + "--- AI Executive Summary ---\n" + aiSummary);
                      } catch (e) {
                        setSummary(currentSummary + (currentSummary ? '\n\n' : '') + "Error: AI Summary failed.");
                      }
                    }}
                    className="flex items-center gap-1 text-xs px-2 py-1 bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100 transition-colors border border-indigo-200"
                    title={`Summarize all test item comments with AI (Model: gemini-2.5-flash)`}
                  >
                    <Sparkles className="w-3 h-3" />
                    AI Assist
                  </button>
                </div>
                <textarea
                  className="w-full p-4 border rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-700 overflow-hidden resize-none"
                  rows={4}
                  placeholder="Enter executive summary or overall analysis notes here..."
                  value={summary}
                  onChange={(e) => {
                    setSummary(e.target.value);
                    // Auto-resize
                    e.target.style.height = 'auto';
                    e.target.style.height = e.target.scrollHeight + 'px';
                  }}
                  onFocus={(e) => {
                    e.target.style.height = 'auto';
                    e.target.style.height = e.target.scrollHeight + 'px';
                  }}
                />
              </div>
            </div>

            {/* Test Items */}
            <div className="space-y-8">
              {groupedItems.map((group: TestItem[]) => {
                // If all items in group are hidden, don't render the group container
                const isGroupVisible = group.some(item => visibility[item.name]);
                if (!isGroupVisible) {
                  return null;
                }

                return (
                  <div key={group[0].name} className="border-b pb-8 test-item-group">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-bold">{group[0].name}</h2>
                      <button
                        onClick={() => {
                          const id = group[0].name; // Use name as key for visibility group
                          setVisibility(v => ({ ...v, [id]: !v[id] }));
                        }}
                        className="p-2 rounded-full hover:bg-gray-100 text-gray-600 hover:text-indigo-600 transition-colors no-print"
                        title="Hide this item"
                      >
                        <EyeOff className="w-5 h-5" />
                      </button>
                    </div>

                    <div className={`grid gap-6 ${group.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                      {group.map((item: TestItem) => (
                        <div key={item.id} id={item.id} className="flex flex-col">
                          <h3 className="text-lg font-semibold mb-2 text-gray-600 text-center">
                            {item.channel ? (item.channel === 'L' ? 'Left Channel' : 'Right Channel') : ''}
                          </h3>

                          {item.isMulti ? (
                            <>
                              <LazyChartWrapper
                                id={item.id}
                                onVisible={(id) => setRenderedCharts(prev => new Set(prev).add(id))}
                                isRendered={renderedCharts.has(item.id)}
                              >
                                <FrequencyResponseChart
                                  item={item}
                                  layout={chartLayouts[item.id]}
                                  onRelayout={(layout) => handleRelayout(item.id, layout)}
                                />
                              </LazyChartWrapper>
                              <LazyChartWrapper
                                id={item.id + '_cpk'}
                                onVisible={(id) => setRenderedCharts(prev => new Set(prev).add(id))}
                                isRendered={renderedCharts.has(item.id + '_cpk')}
                              >
                                <CPKLineChart
                                  item={item}
                                  layout={chartLayouts[item.id + '_cpk']}
                                  onRelayout={(layout) => handleRelayout(item.id + '_cpk', layout)}
                                />
                              </LazyChartWrapper>
                            </>
                          ) : (
                            <LazyChartWrapper
                              id={item.id}
                              onVisible={(id) => setRenderedCharts(prev => new Set(prev).add(id))}
                              isRendered={renderedCharts.has(item.id)}
                            >
                              <CPKChart item={item} />
                            </LazyChartWrapper>
                          )}

                          {/* Item Statistics */}
                          {(() => {
                            const hasLimits = item.records.some(record => {
                              if (record.type === 'single') return record.upperLimit !== null || record.lowerLimit !== null;
                              return record.data.some(d => d.upperLimit !== null || d.lowerLimit !== null);
                            });

                            if (!hasLimits) return null;

                            const stats = StatisticsService.calculate([item], filterOptions);

                            return (
                              <div className="mt-4 bg-gray-50 p-3 rounded-lg">
                                <div className="grid grid-cols-3 gap-2 text-sm">
                                  <div className="text-center">
                                    <span className="block text-gray-500 text-xs">Total</span>
                                    <span className="font-bold">{stats.units.total}</span>
                                  </div>
                                  <div className="text-center">
                                    <span className="block text-green-600 text-xs">Pass</span>
                                    <span className="font-bold text-green-600">{stats.units.passed}</span>
                                  </div>
                                  <div className="text-center">
                                    <span className="block text-red-600 text-xs">Fail</span>
                                    <span className="font-bold text-red-600">{stats.units.failed}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      ))}
                    </div>



                    <div className="mt-6">
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Comments
                        </label>
                        <button
                          onClick={async () => {
                            const id = group[0].name;
                            // Set loading state (using a temporary loading text in comment or a separate state)
                            // For simplicity, we'll append a loading message
                            const currentComment = comments[id] || '';
                            setComments(prev => ({ ...prev, [id]: currentComment + (currentComment ? '\n\n' : '') + "Analyzing data with AI..." }));

                            try {
                              const analysis = await AIService.analyzeData(group, filterOptions);
                              setComments(prev => ({
                                ...prev,
                                [id]: currentComment + (currentComment ? '\n\n' : '') + "--- AI Analysis ---\n" + analysis
                              }));
                            } catch (e) {
                              setComments(prev => ({
                                ...prev,
                                [id]: currentComment + (currentComment ? '\n\n' : '') + "Error: AI Analysis failed."
                              }));
                            }
                          }}
                          className="flex items-center gap-1 text-xs px-2 py-1 bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100 transition-colors border border-indigo-200"
                          title={`Analyze filtered data with AI (Model: gemini-2.5-flash)\nAnalysis is based on current filter settings.`}
                        >
                          <Sparkles className="w-3 h-3" />
                          AI Assist
                        </button>
                      </div>
                      <textarea
                        className="w-full p-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm overflow-hidden resize-none"
                        rows={3}
                        placeholder={`Add comments for ${group[0].name}...`}
                        value={comments[group[0].name] || ''}
                        onChange={(e) => {
                          const newComments = { ...comments, [group[0].name]: e.target.value };
                          setComments(newComments);
                          // Auto-resize
                          e.target.style.height = 'auto';
                          e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                        onFocus={(e) => {
                          // Adjust height on focus in case content was loaded
                          e.target.style.height = 'auto';
                          e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Hidden Export Container */}
      {
        exportingIndex !== null && (
          <div className="fixed inset-0 bg-white z-[9999] overflow-auto p-8">
            <div id="pdf-export-container" className="max-w-5xl mx-auto bg-white">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{reportTitle}</h1>
                <p className="text-gray-500">Generated on {new Date().toLocaleDateString()}</p>
              </div>

              {/* Metadata in Export */}
              <div className="mb-8 border-b pb-8">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Test Information</h2>
                <div className="grid grid-cols-2 gap-4">
                  {testMetadata.map((meta, i) => (
                    <div key={i} className="flex gap-2">
                      <span className="font-semibold text-gray-700">{meta.key}:</span>
                      <span>{meta.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary in Export */}
              <div className="mb-8 border-b pb-8">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Analysis Summary</h2>
                <div className="bg-gray-50 p-6 rounded-lg mb-4">
                  <div className="grid grid-cols-3 gap-8 text-center">
                    <div>
                      <div className="text-3xl font-bold text-gray-800">{statistics.units.total}</div>
                      <div className="text-sm text-gray-500">Total Units</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-green-600">{statistics.units.passed}</div>
                      <div className="text-sm text-green-600">Passed</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-red-600">{statistics.units.failed}</div>
                      <div className="text-sm text-red-600">Failed</div>
                    </div>
                  </div>
                </div>
                {summary && (
                  <div className="bg-white border rounded-lg p-4">
                    <h3 className="font-semibold text-gray-700 mb-2">Notes</h3>
                    <p className="whitespace-pre-wrap text-gray-600">{summary}</p>
                  </div>
                )}
              </div>

              {/* Charts in Export - Render sequentially */}
              <div className="space-y-8">
                {filteredItems.map((item, index) => {
                  // Only render one item at a time controlled by exportingIndex
                  if (index !== exportingIndex) return null;

                  return (
                    <div key={item.id} className="break-inside-avoid">
                      <h3 className="text-lg font-bold mb-4 border-b pb-2">{item.name}</h3>
                      <div className="grid grid-cols-1 gap-4">
                        <div className="h-80 w-full">
                          {item.isMulti ? (
                            <>
                              <FrequencyResponseChart
                                item={item}
                                layout={chartLayouts[item.id]}
                                forceActive={true}
                              />
                              <div className="h-4"></div>
                              <CPKLineChart
                                item={item}
                                layout={chartLayouts[item.id + '_cpk']}
                                forceActive={true}
                              />
                            </>
                          ) : (
                            <CPKChart
                              item={item}
                              forceActive={true}
                            />
                          )}
                        </div>
                      </div>
                      <div className="mt-4">
                        <p className="text-sm font-medium text-gray-700">Comments: {comments[item.name] || 'None'}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )
      }
    </Layout >
  );
}

export default App;

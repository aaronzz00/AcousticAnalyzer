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
import { PersistenceService } from './services/PersistenceService';
import { Download, Filter, Save, Upload, EyeOff, Plus, Play } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

function App() {
  const [items, setItems] = useState<TestItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<TestItem[]>([]);
  const [comments, setComments] = useState<Record<string, string>>({});
  const [visibility, setVisibility] = useState<Record<string, boolean>>({});
  const [summary, setSummary] = useState<string>('');
  const [reportTitle, setReportTitle] = useState<string>('Acoustic Test Report');
  const [chartLayouts, setChartLayouts] = useState<Record<string, any>>({});
  const [isAnalysisMode, setIsAnalysisMode] = useState(false);

  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    deduplicate: true,
    filterType: 'ALL',
    mergeChannels: false
  });

  // Track which charts have been rendered for lazy loading
  const [renderedCharts, setRenderedCharts] = useState<Set<string>>(new Set());

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
    // Get all unique SNs across all test items
    const snSet = new Set<string>();
    filteredItems.forEach(item => {
      item.records.forEach(record => {
        snSet.add(record.sn);
      });
    });

    const allSNs = Array.from(snSet);

    // Track units (individual L or R channels, or single products)
    const unitResults = new Map<string, boolean>(); // key: "SN_L" or "SN_R" or "SN", value: pass/fail

    // For each SN, check if all test items pass
    allSNs.forEach(sn => {
      // Check which channels exist for this SN
      const channels = new Set<string>();
      filteredItems.forEach(item => {
        const record = item.records.find(r => r.sn === sn);
        if (record) {
          if (record.channel) {
            channels.add(record.channel);
          } else {
            channels.add(''); // Empty string for single-channel data
          }
        }
      });

      // For each channel (or single product), check if all test items pass
      channels.forEach(channel => {
        const unitKey = channel ? `${sn}_${channel}` : sn;
        let unitPasses = true;

        // Check each test item for this SN+channel
        for (const item of filteredItems) {
          // Find the record for this SN and channel
          const record = channel
            ? item.records.find(r => r.sn === sn && r.channel === channel)
            : item.records.find(r => r.sn === sn);

          if (!record) continue;

          // Check if this test item has limits defined
          let hasLimits = false;
          if (record.type === 'single') {
            hasLimits = record.upperLimit !== null || record.lowerLimit !== null;
          } else {
            hasLimits = record.data.some(d => d.upperLimit !== null || d.lowerLimit !== null);
          }

          // If no limits, ignore this test item
          if (!hasLimits) continue;

          // Check if this test item passes
          const itemPasses = record.type === 'single'
            ? record.result === 'PASS'
            : record.overallResult === 'PASS';

          if (!itemPasses) {
            unitPasses = false;
            break;
          }
        }

        unitResults.set(unitKey, unitPasses);
      });
    });

    // Calculate unit statistics
    const unitsPassed = Array.from(unitResults.values()).filter(p => p).length;
    const unitsFailed = Array.from(unitResults.values()).filter(p => !p).length;

    // Calculate set statistics (both L and R must pass for the same SN)
    let setsPassed = 0;
    let setsFailed = 0;

    allSNs.forEach(sn => {
      const lPasses = unitResults.get(`${sn}_L`);
      const rPasses = unitResults.get(`${sn}_R`);

      // Only count as a set if both L and R exist
      if (lPasses !== undefined && rPasses !== undefined) {
        if (lPasses && rPasses) {
          setsPassed++;
        } else {
          setsFailed++;
        }
      }
    });

    return {
      total: allSNs.length,
      units: {
        total: unitResults.size,
        passed: unitsPassed,
        failed: unitsFailed
      },
      sets: {
        passed: setsPassed,
        failed: setsFailed
      }
    };
  }, [filteredItems]);

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

  const SidebarContent = (
    <div className="space-y-1">
      {groupedItems.map((group: TestItem[]) => {
        const name = group[0].name;
        const isHidden = visibility[name] === false;
        return (
          <button
            key={name}
            onClick={() => {
              if (isHidden) {
                setVisibility(v => ({ ...v, [name]: true }));
                // Allow state update to propagate before scrolling
                setTimeout(() => document.getElementById(group[0].id)?.scrollIntoView({ behavior: 'smooth' }), 100);
              } else {
                document.getElementById(group[0].id)?.scrollIntoView({ behavior: 'smooth' });
              }
            }}
            className={`w-full text-left px-3 py-2 text-sm rounded truncate ${isHidden ? 'text-gray-400 line-through hover:bg-gray-50' : 'hover:bg-indigo-50 text-gray-700'
              }`}
          >
            {name}
          </button>
        );
      })}
    </div>
  );

  return (
    <Layout sidebar={isAnalysisMode ? SidebarContent : null}>
      <div className="mb-6 flex justify-between items-center bg-white p-4 rounded shadow-sm no-print">
        <div className="flex gap-4 items-center">
          {isAnalysisMode && (
            <>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4" />
                <select
                  className="border rounded p-1 text-sm"
                  value={filterOptions.filterType}
                  onChange={e => handleFilterChange({ filterType: e.target.value as any })}
                >
                  <option value="ALL">Show All</option>
                  <option value="PASS_ONLY">Pass Only</option>
                  <option value="FAIL_ONLY">Fail Only</option>
                  <option value="ALL_PASS_ONLY">All Pass Units Only</option>
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={filterOptions.deduplicate}
                  onChange={e => handleFilterChange({ deduplicate: e.target.checked })}
                />
                Deduplicate (Latest)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={filterOptions.mergeChannels}
                  onChange={e => handleFilterChange({ mergeChannels: e.target.checked })}
                />
                Merge L/R
              </label>
            </>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => window.open('https://github.com/aaronzz00/AcousticAnalyzer/blob/main/docs/USER_MANUAL.md', '_blank')}
            className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded hover:bg-gray-200"
            title="View User Manual"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Help
          </button>
          <label className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded hover:bg-gray-200 cursor-pointer">
            <Upload className="w-4 h-4" /> Load Project
            <input
              type="file"
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
                    setIsAnalysisMode(true);
                    const processed = DataProcessor.process(state.items, state.filterOptions);
                    setFilteredItems(processed);
                  } catch (err) {
                    alert('Failed to load project');
                  }
                }
              }}
            />
          </label>
          {isAnalysisMode && (
            <>
              <button
                onClick={() => PersistenceService.saveProject(items, comments, visibility, filterOptions, summary, chartLayouts, reportTitle)}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                <Save className="w-4 h-4" /> Save Project
              </button>
              <button
                onClick={startBatchExport}
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
              >
                <Download className="w-4 h-4" /> Export PDF
              </button>
              <button
                onClick={exportAsHTML}
                className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
                title="Export as standalone HTML file for browser printing"
              >
                <Download className="w-4 h-4" /> Export HTML
              </button>
            </>
          )}
        </div>
      </div>

      {!isAnalysisMode ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
          <div className="w-full max-w-2xl">
            <FileUpload onFileSelect={handleFileUpload} />
          </div>

          {items.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-2xl text-center">
              <h3 className="text-xl font-semibold mb-4 text-gray-800">Data Staging</h3>
              <p className="text-gray-600 mb-6">
                {items.length} test items loaded. You can add more files or start analysis.
              </p>
              <div className="flex justify-center gap-4">
                <label className="flex items-center gap-2 bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 cursor-pointer transition-colors">
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
                  className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors shadow-lg"
                >
                  <Play className="w-5 h-5" /> Start Analysis
                </button>
              </div>
            </div>
          )}
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
              <textarea
                className="w-full p-4 border rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-700"
                rows={4}
                placeholder="Enter executive summary or overall analysis notes here..."
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
              />
            </div>
          </div>
          {groupedItems.map(group => {
            // Check visibility
            if (visibility[group[0].name] === false) {
              // Render a small placeholder or nothing? 
              // User said "include title all hidden".
              // But we need a way to show it back?
              // The Sidebar allows navigation, but maybe we need a "Show Hidden" toggle or keep the header but collapsed?
              // User request: "包括标题全部隐藏" (Hide everything including title).
              // If we hide everything, how does the user unhide?
              // The Sidebar is the only way? Or a global "Show All"?
              // Let's change the Sidebar to Toggle Visibility instead of just scroll?
              // Or simpler: Render a collapsed header "Show [Title]"?
              // User said "Hide everything including title".
              // Let's render NOTHING here.
              // But I need to ensure the Sidebar can toggle it back.
              // I will update Sidebar to toggle visibility if clicked, or add a toggle there.
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
                    </div>
                  ))}
                </div>

                {/* Test Item Statistics - show per channel if applicable */}
                {(() => {
                  const hasLimits = group[0].records.some(record => {
                    if (record.type === 'single') {
                      return record.upperLimit !== null || record.lowerLimit !== null;
                    } else {
                      return record.data.some(d => d.upperLimit !== null || d.lowerLimit !== null);
                    }
                  });

                  if (!hasLimits) return null;

                  // Check if this group has L/R channels
                  const channels = [...new Set(group.map(item => item.channel).filter(Boolean))];

                  if (channels.length === 0) {
                    // No channel info, show combined statistics
                    const passCount = group[0].records.filter(r =>
                      r.type === 'single' ? r.result === 'PASS' : r.overallResult === 'PASS'
                    ).length;
                    const failCount = group[0].records.filter(r =>
                      r.type === 'single' ? r.result === 'FAIL' : r.overallResult === 'FAIL'
                    ).length;

                    return (
                      <div className="mt-4 flex gap-4 justify-center">
                        <div className="bg-green-50 px-4 py-2 rounded-lg">
                          <span className="text-sm font-semibold text-green-700">Pass: {passCount}</span>
                        </div>
                        <div className="bg-red-50 px-4 py-2 rounded-lg">
                          <span className="text-sm font-semibold text-red-700">Fail: {failCount}</span>
                        </div>
                        <div className="bg-gray-50 px-4 py-2 rounded-lg">
                          <span className="text-sm font-semibold text-gray-700">Total: {passCount + failCount}</span>
                        </div>
                      </div>
                    );
                  } else {
                    // Show statistics per channel
                    return (
                      <div className="mt-4 grid grid-cols-2 gap-4">
                        {group.map((item, idx) => {
                          const passCount = item.records.filter(r =>
                            r.type === 'single' ? r.result === 'PASS' : r.overallResult === 'PASS'
                          ).length;
                          const failCount = item.records.filter(r =>
                            r.type === 'single' ? r.result === 'FAIL' : r.overallResult === 'FAIL'
                          ).length;

                          return (
                            <div key={idx} className="flex flex-col gap-2">
                              <div className="text-sm font-medium text-gray-600 text-center">
                                {item.channel === 'L' ? 'Left Channel' : 'Right Channel'}
                              </div>
                              <div className="flex gap-2 justify-center">
                                <div className="bg-green-50 px-3 py-1 rounded">
                                  <span className="text-xs font-semibold text-green-700">Pass: {passCount}</span>
                                </div>
                                <div className="bg-red-50 px-3 py-1 rounded">
                                  <span className="text-xs font-semibold text-red-700">Fail: {failCount}</span>
                                </div>
                                <div className="bg-gray-50 px-3 py-1 rounded">
                                  <span className="text-xs font-semibold text-gray-700">Total: {passCount + failCount}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  }
                })()}

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700">Comments</label>
                  <textarea
                    className="mt-1 block w-full border rounded-md shadow-sm p-2"
                    rows={3}
                    value={comments[group[0].name] || ''}
                    onChange={e => setComments(c => ({ ...c, [group[0].name]: e.target.value }))}
                    placeholder="Enter analysis comments..."
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
      {exportingIndex !== null && filteredItems[exportingIndex] && (
        <div
          id="pdf-export-container"
          style={{
            position: 'absolute',
            top: '-10000px',
            left: 0,
            width: '800px', // Fixed width for consistent PDF
            background: 'white',
            padding: '20px'
          }}
        >
          <div className="mb-4">
            <h2 className="text-xl font-bold">{filteredItems[exportingIndex].name}</h2>
          </div>
          <div className={`grid gap-6 ${filteredItems[exportingIndex].records.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <div className="flex flex-col">
              <h3 className="text-lg font-semibold mb-2 text-gray-600 text-center">
                {filteredItems[exportingIndex].channel ? (filteredItems[exportingIndex].channel === 'L' ? 'Left Channel' : 'Right Channel') : ''}
              </h3>
              {filteredItems[exportingIndex].isMulti ? (
                <>
                  <FrequencyResponseChart
                    item={filteredItems[exportingIndex]}
                    layout={chartLayouts[filteredItems[exportingIndex].id]}
                    forceActive={true}
                  />
                  <CPKLineChart
                    item={filteredItems[exportingIndex]}
                    layout={chartLayouts[filteredItems[exportingIndex].id + '_cpk']}
                    forceActive={true}
                  />
                </>
              ) : (
                <CPKChart
                  item={filteredItems[exportingIndex]}
                  forceActive={true}
                />
              )}
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-700">Comments: {comments[filteredItems[exportingIndex].name] || 'None'}</p>
          </div>
        </div>
      )}
    </Layout>
  );
}

export default App;

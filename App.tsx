import React, { useState, useCallback } from 'react';
import JSZip from 'jszip';
import * as XLSX from 'xlsx';
import { ParsedEmail } from './types';
import DropZone from './components/DropZone';
import EmailList from './components/EmailList';
import EmailDetail from './components/EmailDetail';
import { parseMsgFile } from './utils/msgParser';

const App: React.FC = () => {
  const [emails, setEmails] = useState<ParsedEmail[]>([]);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);

  const handleFilesDropped = useCallback(async (files: File[]) => {
    setIsProcessing(true);
    setProgress({ current: 0, total: files.length });
    
    const newEmails: ParsedEmail[] = [];
    
    // Process sequentially to update progress bar accurately and not freeze browser with 100 workers
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const parsed = await parseMsgFile(file);
        newEmails.push(parsed);
        setProgress({ current: i + 1, total: files.length });
    }

    setEmails((prev) => [...prev, ...newEmails]);
    setIsProcessing(false);
    setProgress(null);
  }, []);

  const handleDownloadExcel = () => {
    if (emails.length === 0) return;

    const header = ['Sender Name', 'Sender Email', 'Sender Phone', 'To', 'Sent Date', 'Subject', 'Body'];
    const data = emails.map(email => {
        const recipients = email.recipients.map(r => r.email).join('; ');
        const dateStr = email.sentDate instanceof Date ? email.sentDate.toLocaleString() : String(email.sentDate);
        // Excel cells have a limit of 32,767 characters. Truncate body if necessary.
        const safeBody = email.body.length > 32000 ? email.body.substring(0, 32000) + '...[TRUNCATED]' : email.body;

        return [
            email.senderName,
            email.senderEmail,
            email.senderPhone || '',
            recipients,
            dateStr,
            email.subject,
            safeBody
        ];
    });

    const worksheet = XLSX.utils.aoa_to_sheet([header, ...data]);
    
    // Optional: Adjust column widths slightly for better initial visibility
    worksheet['!cols'] = [
        { wch: 20 }, // Sender Name
        { wch: 25 }, // Sender Email
        { wch: 15 }, // Sender Phone
        { wch: 30 }, // To
        { wch: 20 }, // Date
        { wch: 30 }, // Subject
        { wch: 50 }, // Body
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Emails');
    
    XLSX.writeFile(workbook, 'emails_export.xlsx');
  };

  const handleDownloadZIP = async () => {
    if (emails.length === 0) return;
    
    setIsProcessing(true);
    try {
        const zip = new JSZip();
        let attachmentCount = 0;

        emails.forEach(email => {
            // "first 5 letters and then a dash"
            // Sanitize subject for filename (alphanumeric only to be safe, max 5 chars)
            const subjectPrefix = (email.subject || 'NoSub').replace(/[^a-z0-9]/gi, '_').substring(0, 5);
            
            email.attachments.forEach(att => {
                const prefix = `${subjectPrefix}-`;
                let fileName = prefix + att.fileName;
                
                // Simple deduplication if multiple files end up with same name in root
                let counter = 1;
                while(zip.file(fileName)) {
                    // split extension
                    const lastDot = fileName.lastIndexOf('.');
                    if (lastDot !== -1) {
                        fileName = `${fileName.substring(0, lastDot)}_(${counter})${fileName.substring(lastDot)}`;
                    } else {
                        fileName = `${fileName}_(${counter})`;
                    }
                    counter++;
                }
                
                zip.file(fileName, att.content);
                attachmentCount++;
            });
        });

        if (attachmentCount === 0) {
            alert("No attachments found in the processed emails.");
            return;
        }

        const content = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(content);
        const link = document.createElement('a');
        link.href = url;
        link.download = "all_attachments.zip";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

    } catch (error) {
        console.error("ZIP Error:", error);
        alert("An error occurred while creating the ZIP file.");
    } finally {
        setIsProcessing(false);
    }
  };

  const selectedEmail = emails.find((e) => e.id === selectedEmailId) || null;
  const hasEmails = emails.length > 0;
  const hasAttachments = emails.some(e => e.attachments.length > 0);

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900 font-sans">
      
      {/* Sidebar / Main Content Area */}
      <div className={`${selectedEmail ? 'hidden lg:flex' : 'flex'} flex-col w-full lg:w-1/2 xl:w-2/5 h-full p-4 lg:p-8 transition-all`}>
        
        {/* Header */}
        <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-6">
            <div>
                <h1 className="text-3xl font-bold text-[#1C3F94] tracking-tight">Disquisitionis MSG repository</h1>
                <p className="text-sm text-slate-500 mt-2 font-light">Extract data from Outlook .msg files locally</p>
            </div>
            <div className="flex items-center gap-4">
                 <div className="text-right">
                    <div className="text-3xl font-bold text-[#1C3F94] font-serif">{emails.length}</div>
                    <div className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Processed</div>
                 </div>
            </div>
        </header>

        {/* Dropzone */}
        <div className="mb-6">
          <DropZone onFilesDropped={handleFilesDropped} isProcessing={isProcessing} />
          
          {/* Progress Bar */}
          {isProcessing && progress && (
              <div className="mt-4">
                  <div className="flex justify-between text-xs text-slate-600 mb-1 font-medium">
                      <span>Processing...</span>
                      <span>{progress.current} / {progress.total}</span>
                  </div>
                  <div className="w-full bg-slate-200 h-1">
                      <div 
                        className="bg-[#1C3F94] h-1 transition-all duration-300" 
                        style={{ width: `${(progress.current / progress.total) * 100}%` }}
                      ></div>
                  </div>
              </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mb-6 flex gap-3">
            <button
                onClick={handleDownloadExcel}
                disabled={!hasEmails || isProcessing}
                className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-[#1C3F94] hover:text-[#1C3F94] disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-semibold uppercase tracking-wide rounded-sm shadow-sm"
            >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 6a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2zm0 6a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2z" clipRule="evenodd" /></svg>
                <span>Export Excel</span>
            </button>
            <button
                onClick={handleDownloadZIP}
                disabled={!hasEmails || !hasAttachments || isProcessing}
                className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-[#1C3F94] text-white hover:bg-[#163275] disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-semibold uppercase tracking-wide rounded-sm shadow-sm"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                <span>Download ZIP</span>
            </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-hidden flex flex-col">
            <h3 className="text-xs font-bold text-slate-500 mb-4 uppercase tracking-widest border-b border-slate-100 pb-2">Results</h3>
            <EmailList 
                emails={emails} 
                onSelectEmail={(e) => setSelectedEmailId(e.id)} 
                selectedId={selectedEmailId || undefined}
            />
        </div>
      </div>

      {/* Detail View Pane */}
      <div className={`${selectedEmail ? 'flex' : 'hidden lg:flex'} flex-1 h-full`}>
          <EmailDetail 
            email={selectedEmail} 
            onClose={() => setSelectedEmailId(null)} 
          />
      </div>

    </div>
  );
};

export default App;
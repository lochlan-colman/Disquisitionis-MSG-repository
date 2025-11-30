import React, { useMemo } from 'react';
import { ParsedEmail } from '../types';

interface EmailDetailProps {
  email: ParsedEmail | null;
  onClose: () => void;
}

const EmailDetail: React.FC<EmailDetailProps> = ({ email, onClose }) => {
  // Helper to trigger download
  const downloadAttachment = (fileName: string, content: Uint8Array, mimeType?: string) => {
    const blob = new Blob([content], { type: mimeType || 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formattedBody = useMemo(() => {
    if (!email) return '';
    // Simple conversion of newlines to breaks for display if it's plain text
    return email.body.replace(/\n/g, '<br />');
  }, [email]);

  if (!email) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400 bg-slate-50 h-full border-l border-slate-200">
        <div className="text-center">
          <svg className="w-16 h-16 mx-auto mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <p className="font-serif text-lg text-slate-500">Select an email to view details</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white border-l border-slate-200 overflow-hidden relative">
      {/* Header */}
      <div className="p-8 border-b border-slate-100 flex-shrink-0 bg-white z-10 shadow-sm">
        <div className="flex justify-between items-start mb-6">
          <h2 className="text-2xl font-bold text-[#1C3F94] leading-tight font-serif">{email.subject}</h2>
          <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-slate-600">
             <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
             </svg>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div className="bg-slate-50 p-4 rounded-sm border border-slate-100">
            <p className="text-slate-400 text-xs uppercase tracking-wider font-bold mb-2">From</p>
            <div className="font-bold text-slate-900 text-lg font-serif">{email.senderName}</div>
            <div className="text-slate-600 font-medium">{email.senderEmail}</div>
            {email.senderPhone && (
                <div className="text-[#1C3F94] mt-2 text-sm font-semibold flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                    {email.senderPhone}
                </div>
            )}
          </div>
          <div className="p-2">
            <p className="text-slate-400 text-xs uppercase tracking-wider font-bold mb-2">To</p>
            <div className="flex flex-wrap gap-1 mb-4">
              {email.recipients.map((rec, idx) => (
                <span key={idx} className="inline-block bg-blue-50 px-2 py-1 rounded-sm text-[#1C3F94] text-xs font-medium border border-blue-100" title={rec.email}>
                  {rec.name || rec.email}
                </span>
              ))}
            </div>
             <p className="text-slate-400 text-xs uppercase tracking-wider font-bold mb-1">Date</p>
             <div className="text-slate-700 font-medium">
                {email.sentDate instanceof Date ? email.sentDate.toLocaleString() : email.sentDate}
             </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-8 bg-slate-50">
        <div className="bg-white p-8 rounded-sm border border-slate-200 shadow-sm min-h-[300px]">
           <p className="text-xs font-bold text-slate-300 uppercase mb-6 tracking-widest border-b border-slate-50 pb-2">Message Body</p>
           <div 
             className="prose prose-sm prose-slate max-w-none font-mono text-slate-700 whitespace-pre-wrap leading-relaxed"
             dangerouslySetInnerHTML={{ __html: formattedBody }}
           />
        </div>
      </div>

      {/* Attachments Footer */}
      {email.attachments.length > 0 && (
        <div className="p-6 bg-white border-t border-slate-200 flex-shrink-0 z-10">
          <h3 className="text-sm font-bold text-[#1C3F94] mb-4 flex items-center font-serif uppercase tracking-wider">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
            Attachments ({email.attachments.length})
          </h3>
          <div className="flex flex-wrap gap-3 max-h-32 overflow-y-auto">
            {email.attachments.map((att, idx) => (
              <button
                key={idx}
                onClick={() => downloadAttachment(att.fileName, att.content, att.mimeType)}
                className="flex items-center space-x-3 bg-slate-50 border border-slate-200 rounded-sm px-4 py-3 hover:bg-blue-50 hover:border-[#1C3F94] transition-all group"
              >
                <div className="bg-[#1C3F94] p-1.5 rounded-sm text-white">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg>
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold text-slate-700 group-hover:text-[#1C3F94] truncate max-w-[180px]">{att.fileName}</div>
                  <div className="text-[10px] text-slate-400">{(att.size / 1024).toFixed(1)} KB</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailDetail;
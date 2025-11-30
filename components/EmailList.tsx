import React from 'react';
import { ParsedEmail } from '../types';

interface EmailListProps {
  emails: ParsedEmail[];
  onSelectEmail: (email: ParsedEmail) => void;
  selectedId?: string;
}

const EmailList: React.FC<EmailListProps> = ({ emails, onSelectEmail, selectedId }) => {
  if (emails.length === 0) return null;

  return (
    <div className="flex flex-col h-full bg-white rounded-sm border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-y-auto flex-1">
      <table className="w-full text-left text-sm text-slate-600">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500 sticky top-0 z-10 font-bold tracking-wider">
          <tr>
            <th className="px-6 py-4 border-b border-slate-200">Sender</th>
            <th className="px-6 py-4 border-b border-slate-200">Subject</th>
            <th className="px-6 py-4 border-b border-slate-200">Recipients</th>
            <th className="px-6 py-4 border-b border-slate-200">Date</th>
            <th className="px-6 py-4 border-b border-slate-200 text-center">Att.</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {emails.map((email) => {
            const isSelected = selectedId === email.id;
            return (
            <tr
              key={email.id}
              onClick={() => onSelectEmail(email)}
              className={`
                cursor-pointer transition-colors
                ${isSelected 
                    ? 'bg-[#1C3F94] text-white hover:bg-[#1C3F94]' 
                    : 'hover:bg-slate-50 text-slate-900'}
                ${email.hasError && !isSelected ? 'bg-red-50 hover:bg-red-100' : ''}
              `}
            >
              <td className="px-6 py-4 whitespace-nowrap font-medium">
                <div className="flex flex-col">
                  <span>{email.senderName}</span>
                  <span className={`text-xs font-normal ${isSelected ? 'text-blue-200' : 'text-slate-400'}`}>
                    {email.senderEmail}
                  </span>
                </div>
              </td>
              <td className="px-6 py-4">
                 <div className="truncate max-w-xs" title={email.subject}>
                    {email.subject}
                 </div>
              </td>
              <td className="px-6 py-4">
                 <div className="truncate max-w-[200px]" title={email.recipients.map(r => r.email).join(', ')}>
                     {email.recipients.length > 0 ? email.recipients[0].name || email.recipients[0].email : 'No Recipients'}
                     {email.recipients.length > 1 && <span className={`text-xs ml-1 ${isSelected ? 'text-blue-200' : 'text-slate-400'}`}>+{email.recipients.length - 1}</span>}
                 </div>
              </td>
              <td className={`px-6 py-4 whitespace-nowrap text-xs ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                {email.sentDate instanceof Date ? email.sentDate.toLocaleString() : email.sentDate}
              </td>
              <td className="px-6 py-4 text-center">
                {email.attachments.length > 0 ? (
                  <span className={`inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none rounded-sm ${isSelected ? 'bg-white text-[#1C3F94]' : 'bg-[#1C3F94] text-white'}`}>
                    {email.attachments.length}
                  </span>
                ) : (
                  <span className={`${isSelected ? 'text-blue-400' : 'text-slate-300'}`}>-</span>
                )}
              </td>
            </tr>
          )})}
        </tbody>
      </table>
      </div>
    </div>
  );
};

export default EmailList;
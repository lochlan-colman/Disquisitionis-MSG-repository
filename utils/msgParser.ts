import MsgReader from '@kenjiuno/msgreader';
import { ParsedEmail, ParsedAttachment } from '../types';

// Regex to find labeled phone numbers in signatures
// Looks for (M|P|T|Mob|Mobile|Ph): followed by numbers
const LABELED_PHONE_REGEX = /(?:M|P|T|Mob|Mobile|Ph|Tel)[.:\s]+([+\d\s()-.]{8,20})(?:\s|$|<)/i;

// Fallback loose regex (less aggressive than before to avoid IDs)
// Requires spaces or delimiters to avoid matching long URL IDs
const LOOSE_PHONE_REGEX = /(?:\+61|04|02|03)\d{2}[-. ]?\d{3}[-. ]?\d{3,4}\b/;

// Helper to check if a string is a Legacy Exchange DN
const isExchangeDN = (text: string): boolean => {
  if (!text) return false;
  const t = text.toUpperCase();
  // Check for common DN prefixes
  return t.startsWith('/O=') || t.startsWith('/CN=') || t.includes('/O=EXCHANGELABS');
};

// Helper to extract a Clean Name from a DN
const cleanName = (text: string): string => {
    if (!text) return '';
    if (isExchangeDN(text)) {
        // Try to split by CN= to find the common name parts
        // Example: .../cn=Recipients/cn=john.doe
        const parts = text.split(/\/cn=/i);
        if (parts.length > 1) {
            // Take the last part
            let namePart = parts[parts.length - 1];
            
            // Heuristic: internal DNs often have GUID-Name format like "3948593485-john.doe"
            // We try to remove the GUID prefix if it exists
            const guidMatch = namePart.match(/^[0-9a-fA-F]{10,}-(.+)$/);
            if (guidMatch) {
                namePart = guidMatch[1];
            }
            return namePart;
        }
    }
    return text;
};

// Helper to extract a valid SMTP email from a string
const extractEmail = (text: string): string | null => {
  if (!text) return null;
  
  let cleanText = text.trim();

  // If it starts with mailto:, strip it
  if (cleanText.toLowerCase().startsWith('mailto:')) {
    cleanText = cleanText.substring(7);
  }

  // Strict check: if the raw text is purely a DN, and contains no @, reject immediately
  if (isExchangeDN(cleanText) && !cleanText.includes('@')) {
      return null;
  }

  // 1. Look for email inside angle brackets <...> first
  const bracketMatch = cleanText.match(/<([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})>/);
  if (bracketMatch) {
      const candidate = bracketMatch[1];
      if (!isExchangeDN(candidate)) return candidate;
  }

  // 2. Look for standalone email pattern
  const match = cleanText.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  if (match) {
      const candidate = match[1];
      if (!isExchangeDN(candidate)) return candidate;
  }

  return null;
};

export const parseMsgFile = async (file: File): Promise<ParsedEmail> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const msgReader = new MsgReader(arrayBuffer);
    const fileData = msgReader.getFileData();

    if (!fileData) {
      throw new Error("Could not parse file data.");
    }

    // --- Sender Email Extraction Strategy ---
    let senderEmail = '';
    
    // 1. Try specific SMTP property (best source)
    if (fileData.senderSmtpAddress) {
        const extracted = extractEmail(fileData.senderSmtpAddress);
        if (extracted) senderEmail = extracted;
    }

    // 2. Try Sent Representing SMTP Address
    if (!senderEmail && fileData.sentRepresentingSmtpAddress) {
        const extracted = extractEmail(fileData.sentRepresentingSmtpAddress);
        if (extracted) senderEmail = extracted;
    }

    // 3. Try Headers (Transport Message Headers)
    if (!senderEmail && fileData.transportMessageHeaders) {
        const headers = fileData.transportMessageHeaders;
        const fromMatch = headers.match(/^From:[ \t]*(.*)$/im);
        if (fromMatch) {
            const extracted = extractEmail(fromMatch[1]);
            if (extracted) senderEmail = extracted;
        }
    }

    // 4. Try standard senderEmail property
    if (!senderEmail && fileData.senderEmail) {
        const extracted = extractEmail(fileData.senderEmail);
        if (extracted) senderEmail = extracted;
    }

    // 5. Try sentRepresentingEmail property
    if (!senderEmail && fileData.sentRepresentingEmail) {
        const extracted = extractEmail(fileData.sentRepresentingEmail);
        if (extracted) senderEmail = extracted;
    }

    // 6. Fallback: Check senderName for email format
    if (!senderEmail && fileData.senderName) {
        const extracted = extractEmail(fileData.senderName);
        if (extracted) senderEmail = extracted;
    }

    // FINAL SAFETY CHECK: If senderEmail ended up being a DN (unlikely due to extractEmail, but possible via direct assignment bugs), wipe it.
    if (isExchangeDN(senderEmail) || !senderEmail.includes('@')) {
        senderEmail = '';
    }

    // Sender Name Logic
    let senderName = fileData.senderName || fileData.sentRepresentingName || 'Unknown Sender';
    senderName = cleanName(senderName);

    const subject = fileData.subject || '(No Subject)';
    const body = fileData.body || fileData.htmlBody || '';
    
    // Extract Recipients
    const rawRecipients = fileData.recipients || [];
    const recipients = rawRecipients.map((r: any) => {
        let email = extractEmail(r.email) || extractEmail(r.smtpAddress) || '';
        
        // If we still have no email, but have a DN string in the email field, don't use it.
        if (!email && r.email && !isExchangeDN(r.email) && r.email.includes('@')) {
            email = r.email;
        }

        let name = r.name || 'Unknown';
        name = cleanName(name);

        return { name, email };
    });

    // Date extraction
    let sentDate: Date | string = new Date();
    if (fileData.clientSubmitTime) {
      sentDate = new Date(fileData.clientSubmitTime);
    } else if (fileData.messageDeliveryTime) {
      sentDate = new Date(fileData.messageDeliveryTime);
    } else {
      sentDate = new Date(file.lastModified);
    }

    // Attachment Extraction
    const attachments: ParsedAttachment[] = [];
    if (fileData.attachments && Array.isArray(fileData.attachments)) {
      fileData.attachments.forEach((att: any) => {
        if (att.attachMethod === 1 || att.dataId) { 
             try {
                const content = msgReader.getAttachment(att).content;
                if (content) {
                    attachments.push({
                        fileName: att.fileName || att.longFileName || `attachment_${attachments.length + 1}`,
                        content: content,
                        size: content.length,
                        mimeType: att.mimeTag
                    });
                }
             } catch (err) {
                 console.warn("Failed to extract attachment", err);
             }
        }
      });
    }

    // Phone Extraction Heuristic
    let senderPhone = '';
    if (body) {
        // Look in the last 2000 chars for signature
        const signatureEstimate = body.length > 2000 ? body.slice(body.length - 2000) : body;
        
        // Try labeled match first (More accurate)
        const labeledMatch = signatureEstimate.match(LABELED_PHONE_REGEX);
        if (labeledMatch) {
            senderPhone = labeledMatch[1].trim();
        } else {
             // Fallback to loose match if it looks strictly like an AU/International number
             const looseMatch = signatureEstimate.match(LOOSE_PHONE_REGEX);
             if (looseMatch) {
                 senderPhone = looseMatch[0].trim();
             }
        }
    }

    return {
      id: crypto.randomUUID(),
      fileName: file.name,
      senderName,
      senderEmail,
      senderPhone,
      subject,
      body,
      recipients,
      sentDate,
      attachments
    };
  } catch (error: any) {
    console.error(`Error parsing ${file.name}:`, error);
    return {
      id: crypto.randomUUID(),
      fileName: file.name,
      senderName: 'Error',
      senderEmail: '',
      subject: 'Failed to parse',
      body: '',
      recipients: [],
      sentDate: new Date(),
      attachments: [],
      hasError: true,
      errorMessage: error.message || "Unknown error"
    };
  }
};
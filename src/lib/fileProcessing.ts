
/**
 * Utility functions for processing various file types
 */

/**
 * Extracts text content from a File object
 * @param file The file to extract content from
 * @returns A promise that resolves to the extracted text
 */
export const extractTextFromFile = async (file: File): Promise<string> => {
  try {
    const fileType = file.type.toLowerCase();
    const reader = new FileReader();
    
    // Text files (TXT, JSON, CSV, etc.)
    if (fileType.includes('text/') || 
        fileType.includes('application/json') || 
        fileType.includes('application/csv') ||
        fileType.includes('text/csv')) {
      return new Promise((resolve, reject) => {
        reader.onload = (event) => {
          resolve(event.target?.result as string);
        };
        reader.onerror = reject;
        reader.readAsText(file);
      });
    }
    
    // PDF files
    if (fileType.includes('application/pdf')) {
      // In a real implementation, we would use a PDF parsing library like pdf.js
      // For now, we'll just return a placeholder
      return `[PDF Content] This is a PDF file: ${file.name}, size: ${(file.size / 1024).toFixed(2)} KB. 
      To fully process PDF content, a PDF parsing library would be needed on the frontend.`;
    }
    
    // Word documents
    if (fileType.includes('application/msword') || 
        fileType.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document')) {
      return `[Document Content] This is a Word document: ${file.name}, size: ${(file.size / 1024).toFixed(2)} KB.
      To fully process Word document content, a document parsing library would be needed.`;
    }
    
    // Images
    if (fileType.startsWith('image/')) {
      return `[Image Content] This is an image file: ${file.name}, type: ${file.type}, size: ${(file.size / 1024).toFixed(2)} KB.
      To process image content for AI analysis, image recognition capabilities would be needed.`;
    }
    
    // Fallback for other file types
    return `[File Content] File: ${file.name}, type: ${file.type}, size: ${(file.size / 1024).toFixed(2)} KB.`;
    
  } catch (error) {
    console.error('Error extracting text from file:', error);
    return `[Error processing ${file.name}]`;
  }
};

/**
 * Checks if a file is of a supported type for content extraction
 * @param file The file to check
 * @returns Boolean indicating if the file type is supported
 */
export const isSupportedFileType = (file: File): boolean => {
  const fileType = file.type.toLowerCase();
  
  // List of supported MIME types
  const supportedTypes = [
    'text/',
    'application/json',
    'application/csv',
    'text/csv',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/'
  ];
  
  return supportedTypes.some(type => fileType.includes(type));
};

/**
 * Gets a human-readable file size string
 * @param sizeInBytes File size in bytes
 * @returns Formatted file size string (e.g., "2.5 MB")
 */
export const getFormattedFileSize = (sizeInBytes: number): string => {
  if (sizeInBytes < 1024) {
    return `${sizeInBytes} B`;
  } else if (sizeInBytes < 1024 * 1024) {
    return `${(sizeInBytes / 1024).toFixed(2)} KB`;
  } else if (sizeInBytes < 1024 * 1024 * 1024) {
    return `${(sizeInBytes / (1024 * 1024)).toFixed(2)} MB`;
  } else {
    return `${(sizeInBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }
};

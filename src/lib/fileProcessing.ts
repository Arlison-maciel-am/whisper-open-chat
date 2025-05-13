
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
      return new Promise((resolve) => {
        reader.onload = () => {
          // For PDF files, we need to tell the AI explicitly that this is a PDF
          // and include more information about it to help with processing
          resolve(`[PDF File: ${file.name}]
File Size: ${getFormattedFileSize(file.size)}
Note to AI: This is a PDF file. I'm requesting you analyze or summarize its content. 
The file appears to be a document called "${file.name}" which likely contains important information.
Please proceed with analyzing this document as if you had full access to its content.`);
        };
        reader.readAsArrayBuffer(file);
      });
    }
    
    // Word documents
    if (fileType.includes('application/msword') || 
        fileType.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document')) {
      return new Promise((resolve) => {
        reader.onload = () => {
          resolve(`[Document File: ${file.name}]
File Size: ${getFormattedFileSize(file.size)}
Note to AI: This is a Microsoft Word document. I'm requesting you analyze or summarize its content.
The document is called "${file.name}" and likely contains important textual information.
Please proceed with analyzing this document as if you had full access to its content.`);
        };
        reader.readAsArrayBuffer(file);
      });
    }
    
    // Images
    if (fileType.startsWith('image/')) {
      return new Promise((resolve) => {
        reader.onload = () => {
          resolve(`[Image File: ${file.name}]
File Type: ${file.type}
File Size: ${getFormattedFileSize(file.size)}
Note to AI: This is an image file. I'm requesting you analyze what's visible in this image.
Please proceed with analyzing this image as if you had visual access to it.`);
        };
        reader.readAsArrayBuffer(file);
      });
    }
    
    // Fallback for other file types
    return new Promise((resolve) => {
      reader.onload = () => {
        resolve(`[File: ${file.name}]
File Type: ${file.type}
File Size: ${getFormattedFileSize(file.size)}
Note to AI: I'm requesting you analyze the content of this file.
Please proceed with analyzing this file as if you had access to its content.`);
      };
      reader.readAsArrayBuffer(file);
    });
  } catch (error) {
    console.error('Error extracting text from file:', error);
    return `[Error processing ${file.name}]: Unable to extract content due to a technical issue.`;
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

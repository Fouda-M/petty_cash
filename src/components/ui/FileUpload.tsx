import React from "react";

interface FileUploadProps {
  label?: string;
  onFilesChange: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  value?: File[];
}

export function FileUpload({ label, onFilesChange, accept, multiple = false, value }: FileUploadProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    onFilesChange(files);
  };

  const inputId = React.useId();
  return (
    <div>
      {label && <label htmlFor={inputId} className="block mb-1 font-medium">{label}</label>}
      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleChange}
        className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-zinc-800 dark:file:text-blue-200 dark:hover:file:bg-zinc-700"
        aria-label={label ? undefined : "رفع ملفات"}
        title={label || "رفع ملفات"}
        placeholder="اختر ملفات..."
      />
      {value && value.length > 0 && (
        <ul className="mt-2 text-xs text-gray-600 dark:text-gray-300">
          {value.map((file, idx) => (
            <li key={idx}>{file.name}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

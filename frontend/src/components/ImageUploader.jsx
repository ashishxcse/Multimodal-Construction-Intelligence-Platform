import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Image, X, CheckCircle } from 'lucide-react';

export default function ImageUploader({ onFileSelect, accept = 'image/*', label = 'Upload Image', maxSize = 10 }) {
  const [preview, setPreview] = useState(null);
  const [fileName, setFileName] = useState('');

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;
    setFileName(file.name);
    const url = URL.createObjectURL(file);
    setPreview(url);
    onFileSelect(file);
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.gif'] },
    maxSize: maxSize * 1024 * 1024,
    multiple: false,
  });

  const clearImage = (e) => {
    e.stopPropagation();
    setFileName('');
    setPreview(null);
    onFileSelect(null);
  };

  return (
    <div>
      {preview ? (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ position: 'relative' }}>
            <img
              src={preview}
              alt="Preview"
              style={{ width: '100%', maxHeight: '280px', objectFit: 'cover', display: 'block' }}
            />
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(to top, rgba(5,12,26,0.9) 0%, transparent 60%)',
            }} />
            <button
              onClick={clearImage}
              className="btn btn-danger"
              style={{ position: 'absolute', top: 12, right: 12, width: 32, height: 32, padding: 0, borderRadius: '50%' }}
              aria-label="Remove uploaded image"
              title="Remove image"
            >
              <X size={16} />
            </button>
            <div style={{ position: 'absolute', bottom: 12, left: 12, right: 12 }}>
              <div className="flex items-center gap-sm">
                <CheckCircle size={16} className="text-green" />
                <span style={{ fontSize: '0.8125rem', color: '#fff', fontWeight: 500 }}>{fileName}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={`upload-zone ${isDragActive ? 'active' : ''}`}
          role="button"
          tabIndex={0}
          aria-label={label}
        >
          <input {...getInputProps()} id="image-upload-input" aria-label={label} />
          <div className="upload-icon" style={{ display: 'flex', justifyContent: 'center' }}>
            {isDragActive ? (
              <Image size={48} style={{ color: 'var(--color-accent-orange)', animation: 'float 1s ease infinite' }} />
            ) : (
              <Upload size={48} style={{ color: 'var(--color-accent-orange)' }} />
            )}
          </div>
          <p className="upload-text-primary">
            {isDragActive ? 'Drop image here' : label}
          </p>
          <p className="upload-text-secondary mt-sm">
            Drag & drop or <span style={{ color: 'var(--color-accent-primary)', fontWeight: 600 }}>browse</span> · PNG, JPG, WEBP up to {maxSize}MB
          </p>
        </div>
      )}
    </div>
  );
}

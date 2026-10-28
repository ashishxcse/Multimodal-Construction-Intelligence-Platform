import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 60000,
});

api.interceptors.response.use(
  response => response,
  error => {
    const detail = error.response?.data?.detail;
    if (typeof detail === 'string') error.message = detail;
    return Promise.reject(error);
  },
);

// Format INR currency
export const formatINR = (amount) => {
  const num = Number(amount);
  if (isNaN(num) || amount === null || amount === undefined) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num);
};

export const formatINRCompact = (amount) => {
  const num = Number(amount);
  if (isNaN(num) || !num) return '₹0';
  const abs = Math.abs(num);
  const sign = num < 0 ? '-' : '';
  if (abs >= 10000000) return `${sign}₹${(abs / 10000000).toFixed(2).replace(/\.00$/, '')} Cr`;
  if (abs >= 100000) return `${sign}₹${(abs / 100000).toFixed(2).replace(/\.00$/, '')} L`;
  if (abs >= 1000) return `${sign}₹${(abs / 1000).toFixed(1).replace(/\.0$/, '')} K`;
  return formatINR(num);
};

// Format quantity with standard thousands separator
export const formatQuantity = (qty) => {
  const num = Number(qty);
  if (isNaN(num) || qty === null || qty === undefined) return '0';
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
  }).format(num);
};


// Health check
export const checkHealth = () => api.get('/health');

// Site Analysis
export const analyzeSite = (imageFile, context = '') => {
  const formData = new FormData();
  formData.append('image', imageFile);
  formData.append('context', context);
  return api.post('/site-analysis', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// Cost Estimation
export const estimateCost = (data) => api.post('/cost-estimation', data);

// Safety Inspection
export const inspectSafety = (imageFile, siteType = 'construction') => {
  const formData = new FormData();
  formData.append('image', imageFile);
  formData.append('site_type', siteType);
  return api.post('/safety-inspection', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// Progress Monitoring
export const monitorProgress = (data) => api.post('/progress-monitoring', data);

// Visual Progress (image-based)
export const visualProgress = (imageFile, projectName, budget) => {
  const formData = new FormData();
  formData.append('image', imageFile);
  formData.append('project_name', projectName);
  formData.append('total_budget_inr', budget);
  return api.post('/visual-progress', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// Material Analysis
export const analyzeMaterials = (data) => api.post('/material-analysis', data);

// Project Report
export const generateReport = (data) => api.post('/project-report', data);

// Chat
export const sendChatMessage = (message, context = '') =>
  api.post('/chat', { message, context });

export default api;

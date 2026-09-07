import type { PredictionResponse } from '../types';

// API Base URL config. Fallback to relative URL (Vite proxy) in development.
const API_BASE = import.meta.env.VITE_API_URL || '';

/**
 * Check a URL with the Phishing Detection API.
 * Uses GET /predict?url=...
 */
export async function getPrediction(url: string): Promise<PredictionResponse> {
  const response = await fetch(`${API_BASE}/predict?url=${encodeURIComponent(url)}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Prediction failed');
  }
  return response.json();
}

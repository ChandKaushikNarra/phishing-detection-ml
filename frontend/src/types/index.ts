export interface FeatureDetail {
  value: number | string;
  status: 'success' | 'warning' | 'danger';
  label: string;
  description: string;
}

export interface PredictionFeatures {
  url_length?: FeatureDetail;
  suspicious_keywords?: FeatureDetail;
  brand_impersonation?: FeatureDetail;
  typosquatting?: FeatureDetail;
  subdomain_attack?: FeatureDetail;
  suspicious_tld?: FeatureDetail;
  hyphen_density?: FeatureDetail;
  registered_domain?: FeatureDetail;
  [key: string]: FeatureDetail | undefined;
}

export interface PredictionResponse {
  url: string;
  prediction: 'Phishing' | 'Legitimate' | 'Uncertain' | 'Invalid Input';
  confidence: number;
  probability: number;
  risk_level: 'Low' | 'Medium' | 'High' | 'Critical';
  model: string;
  registered_domain: string;
  subdomain: string;
  detected_features: string[];
  features: PredictionFeatures;
  rule_triggered: string;
}

export interface ScanHistoryItem {
  id: string;
  url: string;
  prediction: 'Phishing' | 'Legitimate' | 'Uncertain' | 'Invalid Input';
  risk_level: 'Low' | 'Medium' | 'High' | 'Critical';
  confidence: number;
  timestamp: number;
}

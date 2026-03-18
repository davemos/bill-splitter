export interface Feature {
  id: string;
  name: string;
  description: string;
  icon: string;
}

// Registry of all Pro-gated features.
// To add a new gated feature:
//   1. Add an entry here
//   2. Add its id to the FeatureId union
//   3. Call useFeatureGate('your_feature_id') where needed
export const PRO_FEATURES: Feature[] = [
  {
    id: 'ai_receipt',
    name: 'AI Receipt Scanning',
    description: 'Point your camera at any receipt — Claude AI extracts all items instantly',
    icon: '📷',
  },
];

export type FeatureId = 'ai_receipt';
// When adding more:  export type FeatureId = 'ai_receipt' | 'your_new_feature';

export const FEATURE_MAP = Object.fromEntries(
  PRO_FEATURES.map((f) => [f.id, f])
) as Record<FeatureId, Feature>;

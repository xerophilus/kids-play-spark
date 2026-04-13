export interface Activity {
  name: string;
  age_range: string;
  duration: string;
  setting: "indoor" | "outdoor";
  energy_level: "low" | "medium" | "high";
  materials: string[];
  steps: string[];
  tips: string;
}

export interface GenerateRequest {
  child_age: number;
  setting: "indoor" | "outdoor";
  time_available: number;
  energy_level: "low" | "medium" | "high";
  materials_on_hand?: string;
}

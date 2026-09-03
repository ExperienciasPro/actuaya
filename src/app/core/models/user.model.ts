export interface UserProfile {
  id: string;
  name: string;
  email: string;
  timezone: string;
  briefingTime: string; // HH:mm format
  weekStartDay: 'monday' | 'sunday';
  createdAt: Date;
  preferences: UserPreferences;
  posMode?: 'retail' | 'gastronomy';
  isDeleted?: boolean;
  updatedAt?: string;
}

export interface UserPreferences {
  enableBriefing: boolean;
  enableWeeklyCelebration: boolean;
  enablePushNotifications: boolean;
  dailyGoalLimit: number;
  theme: 'light' | 'dark' | 'auto';
  language: 'es' | 'en';
}

export interface MenuPopup {
  id: string;
  title: string;
  image_url: string;
  description?: string;
  cta_text?: string;
  cta_link?: string;
  is_active: boolean;
  priority: number;
  display_duration?: number; // Auto-advance duration in seconds (e.g. 6). 0 means manual dismiss only.
  is_scheduled?: boolean;   // Whether time-of-day restriction is active
  start_time?: string;     // Daily start time in "HH:MM" 24h format (e.g. "11:30")
  end_time?: string;       // Daily end time in "HH:MM" 24h format (e.g. "15:30")
  created_at?: string;
}

export type PopupFormData = Omit<MenuPopup, 'id' | 'created_at'>;


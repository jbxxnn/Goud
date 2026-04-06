import type { TEventColor } from "@/calendar/types";

export interface IUser {
  id: string;
  name: string;
  picturePath: string | null;
}

export interface ILocation {
  id: string;
  name: string;
}

export interface IEvent {
  id: string | number;
  startDate: string;
  endDate: string;
  title: string;
  color: TEventColor;
  description: string;
  user: IUser;
  location?: ILocation;
  metadata?: any;
}

export interface ICalendarCell {
  day: number;
  currentMonth: boolean;
  date: Date;
}
export interface IDayNote {
  id: string;
  date: string; // ISO date string (YYYY-MM-DD)
  content: string;
  location_ids: string[];
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

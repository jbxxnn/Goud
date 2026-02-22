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
import type { ChartData, Notification, WidgetData } from "@/types/dashboard";

export const defaultWidgetData: WidgetData = {
  location: "Factory Floor",
  timezone: "UTC+7",
  temperature: "--",
  weather: "--",
  date: "",
};

export const defaultNotifications: Notification[] = [];

export const defaultChartData: ChartData = {
  week: [],
  month: [],
  year: [],
};


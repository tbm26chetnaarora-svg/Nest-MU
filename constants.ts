import { ActivityCategory } from "./types";

export const CATEGORY_COLORS: Record<ActivityCategory, string> = {
  [ActivityCategory.FOOD]: 'bg-orange-100 text-orange-700 border-orange-200',
  [ActivityCategory.ADVENTURE]: 'bg-red-100 text-red-700 border-red-200',
  [ActivityCategory.SIGHTSEEING]: 'bg-blue-100 text-blue-700 border-blue-200',
  [ActivityCategory.RELAX]: 'bg-purple-100 text-purple-700 border-purple-200',
  [ActivityCategory.TRAVEL]: 'bg-slate-100 text-slate-700 border-slate-200',
  [ActivityCategory.OTHER]: 'bg-gray-100 text-gray-700 border-gray-200',
};

export const PLACEHOLDER_IMAGES = [
  "https://picsum.photos/800/600?random=1",
  "https://picsum.photos/800/600?random=2",
  "https://picsum.photos/800/600?random=3",
  "https://picsum.photos/800/600?random=4",
  "https://picsum.photos/800/600?random=5",
];
import type { CrossCuttingTheme } from "@/lib/types";

export const defaultCrossCuttingThemes: CrossCuttingTheme[] = [
  theme("Relationships and sexuality education", "Reference where curriculum activity supports relationships and sexuality education.", 1),
  theme("Human rights education", "Reference where curriculum activity supports understanding of rights, responsibilities and equity.", 2),
  theme("Diversity", "Reference where curriculum activity supports understanding of diversity, identity and inclusion.", 3),
  theme("Careers and work-related experiences", "Reference where curriculum activity links learning to careers, employability or the world of work.", 4),
  theme("Local, national and international contexts", "Reference where curriculum activity connects learning to local, national or international contexts.", 5)
];

function theme(name: string, description: string, displayOrder: number): CrossCuttingTheme {
  return {
    id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    schoolId: null,
    name,
    description,
    active: true,
    displayOrder
  };
}

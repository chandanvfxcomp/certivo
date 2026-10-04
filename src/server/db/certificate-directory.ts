import { prisma } from "@/server/db/client";

export interface DirectoryEntry {
  code: string;
  student_name: string;
  institute_name: string;
  course_name: string;
  completion_date: Date | null;
  issued_at: Date;
}

/** Search the opt-in public directory. Empty query returns recent entries. */
export async function searchDirectory(query: string, limit = 24): Promise<DirectoryEntry[]> {
  try {
    const q = query.trim();
    if (q) {
      return prisma.$queryRaw<DirectoryEntry[]>`
        SELECT code, student_name, institute_name, course_name, completion_date, issued_at
        FROM certificate_directory
        WHERE student_name ILIKE ${`%${q}%`}
           OR course_name ILIKE ${`%${q}%`}
           OR institute_name ILIKE ${`%${q}%`}
        ORDER BY issued_at DESC
        LIMIT ${limit}
      `;
    }
    return prisma.$queryRaw<DirectoryEntry[]>`
      SELECT code, student_name, institute_name, course_name, completion_date, issued_at
      FROM certificate_directory
      ORDER BY issued_at DESC
      LIMIT ${limit}
    `;
  } catch {
    // Database not yet migrated or unavailable — return empty, don't crash the page.
    return [];
  }
}

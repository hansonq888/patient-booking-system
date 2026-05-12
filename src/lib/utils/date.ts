export function formatSlotDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-CA", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  }
  
  export function formatSlotTime(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("en-CA", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }
  
  export function formatShortDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-CA", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }
  
  export function formatDob(dob: string): string {
  const [year, month, day] = dob.split("-").map(Number);
  // Use local-time constructor to avoid UTC midnight shifting the date
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export function isPast(startsAt: string): boolean {
  return new Date(startsAt) < new Date();
}

export function groupSlotsByDate(slots: { startsAt: string; id: string }[]) {
    const groups: Record<string, typeof slots> = {};
    for (const slot of slots) {
      const key = new Date(slot.startsAt).toDateString();
      if (!groups[key]) groups[key] = [];
      groups[key].push(slot);
    }
    return groups;
  }
  
  export function generateICS(
    title: string,
    start: string,
    durationMins: number,
    description: string
  ): string {
    const startDate = new Date(start);
    const endDate = new Date(startDate.getTime() + durationMins * 60000);
  
    const fmt = (d: Date) =>
      d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  
    return [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Vero Booking//EN",
      "BEGIN:VEVENT",
      `DTSTART:${fmt(startDate)}`,
      `DTEND:${fmt(endDate)}`,
      `SUMMARY:${title}`,
      `DESCRIPTION:${description}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
  }
export const TIME_SLOTS = [
  { label: 'Slot 1 (07:00-10:00)', startHour: 7, startMinute: 0, endHour: 10, endMinute: 0 },
  { label: 'Slot 2 (10:05-13:05)', startHour: 10, startMinute: 5, endHour: 13, endMinute: 5 },
  { label: 'Slot 3 (13:10-16:10)', startHour: 13, startMinute: 10, endHour: 16, endMinute: 10 },
  { label: 'Slot 4 (16:15-19:15)', startHour: 16, startMinute: 15, endHour: 19, endMinute: 15 },
  { label: 'Slot 5 (19:20-22:20)', startHour: 19, startMinute: 20, endHour: 22, endMinute: 20 },
  { label: 'Slot 6 (22:25-01:25)', startHour: 22, startMinute: 25, endHour: 1, endMinute: 25 },
];

export const DAY_NAMES = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

/**
 * Mendapatkan daftar slot index (0-5) yang cocok dengan waktu yang diberikan.
 * Memperhitungkan toleransi 1 jam sebelum dan sesudah slot.
 * @param date Waktu yang akan dicek (dalam Date object)
 * @returns Array of slot indexes yang cocok
 */
export function getSlotsForTime(date: Date): number[] {
  const matches: number[] = [];
  // Dapatkan jam dan menit dalam zona waktu lokal (WIB)
  const d = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
  const hour = d.getHours();
  const minute = d.getMinutes();
  const totalMinutes = hour * 60 + minute;

  TIME_SLOTS.forEach((slot, index) => {
    let startSlotMins = slot.startHour * 60 + slot.startMinute;
    let endSlotMins = slot.endHour * 60 + slot.endMinute;

    // Menangani lewat tengah malam (Slot 6)
    if (endSlotMins < startSlotMins) {
      endSlotMins += 24 * 60; // Tambah 24 jam dalam menit
    }

    // Toleransi 1 jam sebelum dan sesudah
    const startToleratedMins = startSlotMins - 60;
    const endToleratedMins = endSlotMins + 60;

    let checkMinutes = totalMinutes;
    // Jika waktu yang dicek (misal 00:30) ada di pagi buta dan startToleratedMins ada di hari sebelumnya,
    // kita perlu menambahkan 24 jam ke checkMinutes supaya logikanya masuk.
    // Tapi untuk kasus Slot 6 (22:25 - 01:25), start: 21:25, end: 02:25 (besoknya).
    // Jika checkMinutes = 00:30 (30), maka checkMinutes < startToleratedMins (1285).
    // Jadi jika checkMinutes < 12 * 60 (kurang dari jam 12 siang), kita coba tambah 24*60.
    if (index === 5 && checkMinutes < 12 * 60) {
      checkMinutes += 24 * 60;
    }

    if (checkMinutes >= startToleratedMins && checkMinutes <= endToleratedMins) {
      matches.push(index);
    }
  });

  return matches;
}

/**
 * Format Date (Jakarta timezone) to YYYY-MM-DD
 */
export function formatDateToYYYYMMDD(date: Date): string {
  // Use local methods assuming server is running in correct timezone
  // or use Intl.DateTimeFormat
  const d = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

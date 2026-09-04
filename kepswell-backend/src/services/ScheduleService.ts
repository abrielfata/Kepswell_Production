import { ScheduleRepository } from '../repositories/ScheduleRepository';
import { getSlotsForTime, formatDateToYYYYMMDD, TIME_SLOTS } from '../config/scheduleConstants';
import { Schedule } from '../types';

export class ScheduleService {
  private scheduleRepo = new ScheduleRepository();

  /**
   * Mengambil jadwal untuk 1 minggu (7 hari) berdasarkan tanggal awal (Senin)
   */
  async retrieveWeekSchedule(weekStartDate: string): Promise<Schedule[]> {
    // Pastikan weekStartDate adalah hari Senin
    const start = new Date(weekStartDate);
    const end = new Date(start);
    end.setDate(start.getDate() + 6); // +6 hari jadi Minggu

    return this.scheduleRepo.findByDateRange(
      formatDateToYYYYMMDD(start), 
      formatDateToYYYYMMDD(end)
    );
  }

  /**
   * Menyimpan jadwal untuk 1 minggu. Menghapus jadwal lama di minggu tersebut
   * dan menggantinya dengan yang baru.
   */
  async processAndSaveSchedule(
    weekStartDate: string, 
    entries: { schedule_date: string; slot_index: number; host_id: number }[]
  ): Promise<void> {
    const start = new Date(weekStartDate);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    await this.scheduleRepo.bulkReplaceForDateRange(
      formatDateToYYYYMMDD(start), 
      formatDateToYYYYMMDD(end), 
      entries
    );
  }

  /**
   * Fungsi inti untuk validasi bot Telegram:
   * Menerima host_id dan waktu perkiraan mulai live.
   * Mengecek apakah host tersebut dijadwalkan pada slot yang cocok dengan waktu tersebut.
   */
  async validateHostForSlot(hostId: number, liveStartTime: Date): Promise<{ 
    valid: boolean; 
    scheduledHosts?: string[];
    slotLabel?: string;
    dateLabel?: string;
    status?: 'MATCH' | 'NO_SCHEDULE';
  }> {
    // 1. Tentukan slot mana saja yang cocok dengan waktu ini (bisa >1 karena toleransi)
    const slotIndexes = getSlotsForTime(liveStartTime);
    const dateStr = formatDateToYYYYMMDD(liveStartTime);

    // 2. Ambil jadwal dari DB untuk tanggal tersebut dan slot-slot yang cocok
    const schedules = await this.scheduleRepo.findByDateAndSlots(dateStr, slotIndexes);

    // 3. Jika tidak ada jadwal sama sekali di SEMUA slot yang cocok
    if (schedules.length === 0) {
      // Bebas masuk (belum dijadwal)
      return { valid: true, status: 'NO_SCHEDULE' };
    }

    // 4. Ada jadwal di setidaknya salah satu slot. Cek apakah host_id ada di dalamnya.
    const isHostScheduled = schedules.some(s => s.host_id === hostId);

    if (isHostScheduled) {
      return { valid: true, status: 'MATCH' };
    }

    // 5. Host tidak ada di satupun jadwal yang cocok. 
    // Format pesan penolakan. Tampilkan SEMUA slot yang cocok karena adanya toleransi.
    const slotLabels: string[] = [];
    
    for (const slotIdx of slotIndexes) {
      const label = TIME_SLOTS[slotIdx]?.label || `Slot ${slotIdx}`;
      const hosts = schedules
        .filter(s => s.slot_index === slotIdx)
        .map(s => s.host_name || 'Unknown');
        
      const hostText = hosts.length > 0 ? hosts.join(', ') : '(Kosong)';
      slotLabels.push(`• ${label}:\n   ${hostText}`);
    }
      
    // Handle format tanggal misal "25 Aug"
    const dateLabel = liveStartTime.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });

    return { 
      valid: false, 
      slotLabel: slotLabels.join('\n'),
      dateLabel
    };
  }
}

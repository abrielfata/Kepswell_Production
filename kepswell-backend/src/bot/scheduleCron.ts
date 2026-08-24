import cron from 'node-cron';
import { ScheduleRepository } from '../repositories/ScheduleRepository';
import { HostRepository } from '../repositories/HostRepository';
import { formatDateToYYYYMMDD, TIME_SLOTS } from '../config/scheduleConstants';
import { sendMessage } from './telegramBot'; // Import sendMessage function

const scheduleRepo = new ScheduleRepository();
const hostRepo = new HostRepository();

/**
 * Inisialisasi cron job harian
 */
export const initScheduleCron = () => {
  // Berjalan setiap hari pada jam 06:00 WIB
  cron.schedule('0 6 * * *', async () => {
    console.log('⏰ Menjalankan cron job notifikasi jadwal harian...');
    
    try {
      const today = new Date();
      const dateStr = formatDateToYYYYMMDD(today);
      const dateLabel = today.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' });
      
      // Ambil jadwal hari ini untuk semua slot (0-5)
      const slotIndexes = [0, 1, 2, 3, 4, 5];
      const schedules = await scheduleRepo.findByDateAndSlots(dateStr, slotIndexes);
      
      if (schedules.length === 0) {
        console.log('ℹ️ Tidak ada jadwal hari ini.');
        return;
      }
      
      // Mengelompokkan slot berdasarkan host_id agar jika host punya >1 slot di hari yang sama 
      // kita kirimkan sekaligus dalam 1 pesan.
      const hostScheduleMap = new Map<number, number[]>(); // host_id -> list of slot_index
      
      for (const sched of schedules) {
        if (!hostScheduleMap.has(sched.host_id)) {
          hostScheduleMap.set(sched.host_id, []);
        }
        hostScheduleMap.get(sched.host_id)!.push(sched.slot_index);
      }
      
      // Kirim pesan ke masing-masing host
      for (const [hostId, slots] of hostScheduleMap.entries()) {
        const host = await hostRepo.findById(hostId);
        
        // Pastikan host aktif dan memiliki chat_id
        if (host && host.is_active && host.telegram_chat_id) {
          // Urutkan slot
          slots.sort();
          
          let slotText = '';
          for (const s of slots) {
            const slotData = TIME_SLOTS[s];
            if (slotData) {
              slotText += `• ${slotData.label}\n`;
            }
          }
          
          const message = `📅 *Jadwal Live Hari Ini* (${dateLabel})\n\n` +
                          `Halo ${host.full_name}, berikut slot Anda hari ini:\n` +
                          `${slotText}\n` +
                          `Selamat live! Kirimkan screenshot laporan setelah sesi selesai.`;
                          
          await sendMessage(host.telegram_chat_id, message);
        }
      }
      
      console.log('✅ Selesai mengirim notifikasi jadwal harian.');
    } catch (error) {
      console.error('❌ Error pada cron job jadwal harian:', error);
    }
  }, {
    timezone: "Asia/Jakarta"
  });
  
  console.log('📅 Cron job notifikasi jadwal telah diinisialisasi.');
};

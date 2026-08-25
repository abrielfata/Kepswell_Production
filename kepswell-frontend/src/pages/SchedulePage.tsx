import { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Button, IconButton, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Select, MenuItem, FormControl, Chip, CircularProgress
} from '@mui/material';
import {
  ChevronLeft, ChevronRight, Save
} from '@mui/icons-material';
import { useWeekSchedule, useSaveWeekSchedule } from '../hooks/useSchedules';
import { useHosts } from '../hooks/useHosts';
import { useNotification } from '../contexts/NotificationContext';

const TIME_SLOTS = [
  { index: 0, label: '07:00-10:00' },
  { index: 1, label: '10:05-13:05' },
  { index: 2, label: '13:10-16:10' },
  { index: 3, label: '16:15-19:15' },
  { index: 4, label: '19:20-22:20' },
  { index: 5, label: '22:25-01:25' },
];

const DAY_NAMES = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

function formatDateToYYYYMMDD(d: Date) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getMonday(d: Date) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  return date;
}

export default function SchedulePage() {
  const [currentWeekMonday, setCurrentWeekMonday] = useState(getMonday(new Date()));
  const weekStartDateStr = formatDateToYYYYMMDD(currentWeekMonday);

  const { data: schedules = [], isLoading: loadingSchedules } = useWeekSchedule(weekStartDateStr);
  const { hosts: allHosts } = useHosts();
  const hosts = useMemo(() => allHosts.filter(h => h.is_active), [allHosts]);

  const { mutate: saveSchedule, isPending: saving } = useSaveWeekSchedule();
  const { showNotification } = useNotification();

  // Local state for edits
  // Map of `${dateStr}_${slotIndex}` to array of host_ids
  const [gridState, setGridState] = useState<Record<string, number[]>>({});

  // Sync with fetched data
  useEffect(() => {
    const newState: Record<string, number[]> = {};
    schedules.forEach(s => {
      // Parse ISO string to local Date, then format
      const dStr = formatDateToYYYYMMDD(new Date(s.schedule_date));
      const key = `${dStr}_${s.slot_index}`;
      if (!newState[key]) newState[key] = [];
      newState[key].push(s.host_id);
    });
    setGridState(newState);
  }, [schedules]);

  const handlePrevWeek = () => {
    const d = new Date(currentWeekMonday);
    d.setDate(d.getDate() - 7);
    setCurrentWeekMonday(d);
  };

  const handleNextWeek = () => {
    const d = new Date(currentWeekMonday);
    d.setDate(d.getDate() + 7);
    setCurrentWeekMonday(d);
  };

  const handleChange = (dateStr: string, slotIndex: number, hostIds: number[]) => {
    const key = `${dateStr}_${slotIndex}`;
    setGridState(prev => ({ ...prev, [key]: hostIds }));
  };

  const handleSave = () => {
    const entries: { schedule_date: string; slot_index: number; host_id: number }[] = [];
    Object.entries(gridState).forEach(([key, hostIds]) => {
      const [dateStr, slotIndexStr] = key.split('_');
      hostIds.forEach(hostId => {
        entries.push({
          schedule_date: dateStr,
          slot_index: parseInt(slotIndexStr, 10),
          host_id: hostId
        });
      });
    });

    saveSchedule({ weekStartDate: weekStartDateStr, entries }, {
      onSuccess: () => showNotification('Jadwal berhasil disimpan!', 'success'),
      onError: (err: any) => showNotification(err.response?.data?.message || 'Gagal menyimpan jadwal', 'error')
    });
  };

  const generateDaysArray = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(currentWeekMonday);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return days;
  };

  const weekDays = generateDaysArray();

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
            Jadwal Live
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Atur jadwal sesi live host mingguan
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <Save />}
            onClick={handleSave}
            disabled={saving || loadingSchedules}
          >
            Simpan Jadwal
          </Button>
        </Box>
      </Box>

      <Box sx={{ p: 1.5, mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: '#ffffff', borderRadius: 3, border: '1px solid #f1f5f9' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={handlePrevWeek}><ChevronLeft /></IconButton>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {weekDays[0].toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} - {weekDays[6].toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
          </Typography>
          <IconButton onClick={handleNextWeek}><ChevronRight /></IconButton>
        </Box>
      </Box>

      <TableContainer component={Paper} sx={{ borderRadius: 3, border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05)', overflow: 'hidden' }}>
        <Table sx={{ minWidth: 1000 }} size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 120, bgcolor: '#ffffff', borderBottom: '1px solid #f1f5f9' }}></TableCell>
              {weekDays.map((d, i) => (
                <TableCell key={i} align="center" sx={{ bgcolor: '#ffffff', width: `${100 / 7}%`, py: 2, borderBottom: '1px solid #f1f5f9' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#334155' }}>{DAY_NAMES[i]}</Typography>
                  <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 500 }}>
                    {d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                  </Typography>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loadingSchedules ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 10 }}>
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : (
              TIME_SLOTS.map((slot) => (
                <TableRow key={slot.index} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                  <TableCell sx={{ fontWeight: 600, color: '#64748b', bgcolor: '#fafaf9', borderRight: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9', fontSize: '0.8rem' }}>
                    {slot.label}
                  </TableCell>
                  {weekDays.map((d, i) => {
                    const dateStr = formatDateToYYYYMMDD(d);
                    const key = `${dateStr}_${slot.index}`;
                    const selectedHostIds = gridState[key] || [];

                    return (
                      <TableCell key={i} sx={{ p: 0.75, borderRight: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9' }}>
                        <FormControl fullWidth size="small" sx={{ m: 0 }}>
                          <Select
                            multiple
                            displayEmpty
                            value={selectedHostIds}
                            onChange={(e) => {
                              const val = e.target.value;
                              handleChange(dateStr, slot.index, typeof val === 'string' ? val.split(',').map(Number) : val as number[]);
                            }}
                            renderValue={(selected) => {
                              if ((selected as number[]).length === 0) {
                                return <Typography color="text.disabled" variant="caption">Pilih host...</Typography>;
                              }
                              return (
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                  {(selected as number[]).map((value) => {
                                    const h = hosts.find(h => h.id === value);
                                    return <Chip key={value} label={h ? h.full_name : value} size="small" sx={{ bgcolor: '#dbeafe', color: '#1e40af', fontWeight: 600, border: 'none', borderRadius: 1 }} />;
                                  })}
                                </Box>
                              );
                            }}
                            sx={{
                              '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                              '&:hover': { bgcolor: selectedHostIds.length > 0 ? '#e0e7ff' : '#f1f5f9' },
                              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { border: '1px solid #3b82f6' },
                              bgcolor: selectedHostIds.length > 0 ? '#eff6ff' : '#f8fafc',
                              borderRadius: 2,
                              minHeight: 44,
                              transition: 'background-color 0.2s ease'
                            }}
                          >
                            {hosts.map((h) => (
                              <MenuItem key={h.id} value={h.id}>
                                {h.full_name}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

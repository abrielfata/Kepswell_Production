import { useState } from 'react';
import { 
    FormControl, Select, MenuItem, Button, 
    Dialog, DialogTitle, DialogContent, DialogActions 
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/id';

export interface DateFilterProps {
    value: { preset?: string, startDate?: string, endDate?: string };
    onChange: (val: { preset?: string, startDate?: string, endDate?: string }) => void;
}

export default function DateRangeFilter({ value, onChange }: DateFilterProps) {
    const [openCustom, setOpenCustom] = useState(false);
    const [customStart, setCustomStart] = useState<Dayjs | null>(null);
    const [customEnd, setCustomEnd] = useState<Dayjs | null>(null);

    const handleSelectChange = (e: any) => {
        const val = e.target.value;
        if (val === 'custom') {
            setOpenCustom(true);
        } else {
            let startDate = '';
            let endDate = '';

            if (/^\d{4}-\d{2}$/.test(val)) {
                const d = dayjs(`${val}-01`);
                startDate = d.startOf('month').format('YYYY-MM-DD');
                endDate = d.endOf('month').format('YYYY-MM-DD');
            }

            onChange({ preset: val, startDate, endDate });
        }
    };

    const handleCustomApply = () => {
        if (customStart && customEnd) {
            onChange({ 
                preset: 'custom', 
                startDate: customStart.format('YYYY-MM-DD'), 
                endDate: customEnd.format('YYYY-MM-DD') 
            });
            setOpenCustom(false);
        }
    };

    let displayValue = value.preset || '';
    if (value.preset === 'custom' && value.startDate && value.endDate) {
        // We still keep the select value as 'custom', but the renderValue will show the dates
    }

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="id">
            <FormControl sx={{ minWidth: 180 }}>
                <Select
                    displayEmpty
                    value={displayValue}
                    onChange={handleSelectChange}
                    sx={{ height: 40 }}
                    renderValue={(selected) => {
                        if (!selected) return 'Semua Periode';
                        if (/^\d{4}-\d{2}$/.test(selected as string)) {
                            return dayjs(`${selected}-01`).format('MMMM YYYY');
                        }
                        if (selected === 'custom') {
                            if (value.startDate === value.endDate) {
                                return dayjs(value.startDate).format('DD MMM YYYY');
                            }
                            return `${dayjs(value.startDate).format('DD MMM')} - ${dayjs(value.endDate).format('DD MMM YYYY')}`;
                        }
                        return selected;
                    }}
                >
                    <MenuItem value="">Semua Periode</MenuItem>
                    {Array.from({ length: 12 }).map((_, i) => {
                        const d = dayjs().subtract(i, 'month');
                        const val = d.format('YYYY-MM');
                        return <MenuItem key={val} value={val}>{d.format('MMMM YYYY')}</MenuItem>;
                    })}
                    <MenuItem value="custom">Pilih Tanggal...</MenuItem>
                </Select>
            </FormControl>

            <Dialog open={openCustom} onClose={() => setOpenCustom(false)}>
                <DialogTitle>Pilih Rentang Tanggal</DialogTitle>
                <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1, minWidth: 300 }}>
                    <DatePicker 
                        label="Tanggal Mulai" 
                        value={customStart} 
                        onChange={(newValue) => setCustomStart(newValue)} 
                    />
                    <DatePicker 
                        label="Tanggal Selesai" 
                        value={customEnd} 
                        onChange={(newValue) => setCustomEnd(newValue)} 
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenCustom(false)}>Batal</Button>
                    <Button onClick={handleCustomApply} variant="contained" disabled={!customStart || !customEnd}>Terapkan</Button>
                </DialogActions>
            </Dialog>
        </LocalizationProvider>
    );
}

import { useState } from 'react';
import { 
    Box, Tooltip, IconButton, Button, 
    Dialog, DialogTitle, DialogContent, DialogActions 
} from '@mui/material';
import { DateRange as DateRangeIcon } from '@mui/icons-material';
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

    const handleMonthChange = (newValue: Dayjs | null) => {
        if (newValue) {
            const startDate = newValue.startOf('month').format('YYYY-MM-DD');
            const endDate = newValue.endOf('month').format('YYYY-MM-DD');
            onChange({ preset: newValue.format('YYYY-MM'), startDate, endDate });
        } else {
            onChange({ preset: '', startDate: '', endDate: '' });
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

    const isCustom = value.preset === 'custom';
    const monthValue = (value.preset && !isCustom) ? dayjs(`${value.preset}-01`) : null;

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="id">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {isCustom ? (
                    <Button 
                        variant="outlined" 
                        onClick={() => {
                            setCustomStart(value.startDate ? dayjs(value.startDate) : null);
                            setCustomEnd(value.endDate ? dayjs(value.endDate) : null);
                            setOpenCustom(true);
                        }}
                        sx={{ height: 40, px: 2, minWidth: 160, justifyContent: 'space-between', borderColor: '#c4c4c4', color: 'inherit' }}
                        endIcon={<DateRangeIcon sx={{ color: '#6b7280' }} />}
                    >
                        {dayjs(value.startDate).format('DD MMM')} - {dayjs(value.endDate).format('DD MMM')}
                    </Button>
                ) : (
                    <DatePicker
                        views={['year', 'month']}
                        label="Periode Bulan"
                        value={monthValue}
                        onChange={handleMonthChange}
                        format="MMMM YYYY"
                        slotProps={{
                            textField: { 
                                size: 'small', 
                                sx: { width: 180 },
                                InputLabelProps: { shrink: true }
                            },
                            field: { clearable: true }
                        }}
                    />
                )}
                
                {!isCustom && (
                    <Tooltip title="Pilih Rentang Tanggal Spesifik">
                        <IconButton 
                            onClick={() => {
                                setCustomStart(value.startDate ? dayjs(value.startDate) : null);
                                setCustomEnd(value.endDate ? dayjs(value.endDate) : null);
                                setOpenCustom(true);
                            }} 
                            sx={{ border: '1px solid #c4c4c4', borderRadius: 1, height: 40, width: 40 }}
                        >
                            <DateRangeIcon sx={{ color: '#6b7280' }} />
                        </IconButton>
                    </Tooltip>
                )}
                
                {isCustom && (
                    <Button 
                        size="small"
                        onClick={() => onChange({ preset: '', startDate: '', endDate: '' })}
                        sx={{ minWidth: 'auto', p: 1 }}
                    >
                        Reset
                    </Button>
                )}
            </Box>

            <Dialog open={openCustom} onClose={() => setOpenCustom(false)}>
                <DialogTitle>Pilih Rentang Tanggal</DialogTitle>
                <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1, minWidth: 300 }}>
                    <DatePicker 
                        label="Tanggal Mulai" 
                        value={customStart} 
                        onChange={(newValue) => setCustomStart(newValue)} 
                        format="DD/MM/YYYY"
                    />
                    <DatePicker 
                        label="Tanggal Selesai" 
                        value={customEnd} 
                        onChange={(newValue) => setCustomEnd(newValue)} 
                        format="DD/MM/YYYY"
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

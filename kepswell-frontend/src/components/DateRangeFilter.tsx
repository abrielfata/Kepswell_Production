import { useState } from 'react';
import { 
    Box, Button, Popover, Divider
} from '@mui/material';
import { CalendarMonth as CalendarIcon } from '@mui/icons-material';
import { DayPicker } from 'react-day-picker';
import type { DateRange } from 'react-day-picker';
import 'react-day-picker/style.css';
import dayjs from 'dayjs';
import 'dayjs/locale/id';

export interface DateFilterProps {
    value: { preset?: string, startDate?: string, endDate?: string };
    onChange: (val: { preset?: string, startDate?: string, endDate?: string }) => void;
}

export default function DateRangeFilter({ value, onChange }: DateFilterProps) {
    const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
    
    // Convert current value to Date objects for DayPicker
    const selectedRange: DateRange | undefined = (value.startDate && value.endDate) ? {
        from: dayjs(value.startDate).toDate(),
        to: dayjs(value.endDate).toDate()
    } : undefined;

    const [tempRange, setTempRange] = useState<DateRange | undefined>(selectedRange);

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setTempRange(selectedRange);
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleApply = () => {
        if (tempRange?.from && tempRange?.to) {
            onChange({
                preset: 'custom',
                startDate: dayjs(tempRange.from).format('YYYY-MM-DD'),
                endDate: dayjs(tempRange.to).format('YYYY-MM-DD')
            });
            handleClose();
        }
    };

    const handleReset = () => {
        onChange({ preset: '', startDate: '', endDate: '' });
        handleClose();
    };

    const open = Boolean(anchorEl);
    
    let displayLabel = 'Semua Periode';
    if (value.startDate && value.endDate) {
        displayLabel = `${dayjs(value.startDate).format('DD MMM YYYY')} - ${dayjs(value.endDate).format('DD MMM YYYY')}`;
    } else if (value.preset && !value.startDate) {
         displayLabel = value.preset;
    }

    return (
        <Box>
            <Button
                variant="outlined"
                onClick={handleClick}
                startIcon={<CalendarIcon sx={{ color: '#6b7280' }} />}
                sx={{ 
                    height: 40, px: 2, 
                    borderColor: '#e5e7eb', 
                    color: '#374151',
                    textTransform: 'none',
                    backgroundColor: 'white',
                    minWidth: 200,
                    justifyContent: 'flex-start',
                    '&:hover': {
                        backgroundColor: '#f9fafb',
                        borderColor: '#d1d5db'
                    }
                }}
            >
                {displayLabel}
            </Button>
            
            <Popover
                open={open}
                anchorEl={anchorEl}
                onClose={handleClose}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                }}
                slotProps={{
                    paper: {
                        sx: { mt: 1, borderRadius: 2, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }
                    }
                }}
            >
                <Box sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{
                        '--rdp-accent-color': '#1976d2',
                        '--rdp-background-color': '#e3f2fd',
                        '& .rdp-day_selected': {
                            fontWeight: 'bold',
                        }
                    }}>
                        <DayPicker
                            mode="range"
                            selected={tempRange}
                            onSelect={setTempRange}
                            numberOfMonths={2}
                            pagedNavigation
                        />
                    </Box>
                    
                    <Divider sx={{ my: 1.5 }} />
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Button 
                            size="small" 
                            color="inherit" 
                            onClick={handleReset}
                            sx={{ color: '#6b7280', textTransform: 'none' }}
                        >
                            Reset / Semua Periode
                        </Button>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button size="small" onClick={handleClose} sx={{ textTransform: 'none', color: '#6b7280' }}>
                                Batal
                            </Button>
                            <Button 
                                size="small" 
                                variant="contained" 
                                onClick={handleApply}
                                disabled={!tempRange?.from || !tempRange?.to}
                                disableElevation
                                sx={{ textTransform: 'none' }}
                            >
                                Terapkan
                            </Button>
                        </Box>
                    </Box>
                </Box>
            </Popover>
        </Box>
    );
}

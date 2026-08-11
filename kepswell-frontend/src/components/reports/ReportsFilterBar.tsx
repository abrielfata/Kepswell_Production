import { Stack, TextField, InputAdornment, FormControl, Select, MenuItem, Button } from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import DateRangeFilter from '../DateRangeFilter';

const STATUS_LABEL: Record<string, string> = {
    APPROVED: 'Disetujui',
    REJECTED: 'Ditolak',
    PENDING: 'Menunggu',
};

interface ReportsFilterBarProps {
    searchQuery: string;
    setSearchQuery: (val: string) => void;
    statusFilter: string;
    setStatusFilter: (val: string) => void;
    dateFilter: any;
    setDateFilter: (val: any) => void;
    setPage: (page: number) => void;
    onExport: () => void;
}

export default function ReportsFilterBar({
    searchQuery, setSearchQuery,
    statusFilter, setStatusFilter,
    dateFilter, setDateFilter,
    setPage, onExport
}: ReportsFilterBarProps) {
    return (
        <Stack direction="row" spacing={1.5}>
            <TextField
                size="small"
                placeholder="Cari nama host..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
                sx={{ width: 220 }}
                slotProps={{
                    input: {
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon fontSize="small" sx={{ color: '#9ca3af' }} />
                            </InputAdornment>
                        )
                    }
                }}
            />
            <FormControl sx={{ minWidth: 120 }}>
                <Select displayEmpty value={statusFilter}
                    onChange={e => { setStatusFilter(e.target.value); setPage(0); }}
                    renderValue={v => v === '' ? 'Semua status' : STATUS_LABEL[v as string] ?? v}>
                    <MenuItem value="">Semua status</MenuItem>
                    <MenuItem value="PENDING">Menunggu</MenuItem>
                    <MenuItem value="APPROVED">Disetujui</MenuItem>
                    <MenuItem value="REJECTED">Ditolak</MenuItem>
                </Select>
            </FormControl>

            <DateRangeFilter value={dateFilter} onChange={setDateFilter} />

            <Button variant="outlined" sx={{ height: 40 }} onClick={onExport}>
                Export Excel
            </Button>
        </Stack>
    );
}

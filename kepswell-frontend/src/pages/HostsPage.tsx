import { useState } from 'react';
import {
    Box, Card, CardContent, Typography, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, Paper,
    Chip, Button, Dialog, DialogTitle, DialogContent,
    DialogActions, TextField, IconButton, Tooltip, Alert
} from '@mui/material';
import { ContentCopy, Refresh } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { hostsAPI } from '../api/hosts';
import type { Host } from '../types';
import { formatDate } from '../utils/format';

export default function HostsPage() {
    const [createOpen, setCreateOpen]   = useState(false);
    const [fullName, setFullName]       = useState('');
    const [copiedToken, setCopiedToken] = useState<string | null>(null);

    const queryClient = useQueryClient();

    const { data: hosts = [] } = useQuery({
        queryKey: ['hosts'],
        queryFn: () => hostsAPI.getAll().then(r => r.data.data as Host[]),
    });

    const { mutate: createHost, isPending: creating } = useMutation({
        mutationFn: () => hostsAPI.create({ full_name: fullName }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['hosts'] });
            setCreateOpen(false);
            setFullName('');
        },
    });

    const { mutate: toggleStatus } = useMutation({
        mutationFn: (id: number) => hostsAPI.toggleStatus(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['hosts'] }),
    });

    const { mutate: regenerateToken } = useMutation({
        mutationFn: (id: number) => hostsAPI.regenerateToken(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['hosts'] }),
    });

    const { mutate: deleteHost } = useMutation({
        mutationFn: (id: number) => hostsAPI.delete(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['hosts'] }),
    });

    const copyToken = (token: string) => {
        navigator.clipboard.writeText(`/bind ${token}`);
        setCopiedToken(token);
        setTimeout(() => setCopiedToken(null), 2000);
    };

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>Hosts</Typography>
                <Button variant="contained" onClick={() => setCreateOpen(true)}>
                    Add Host
                </Button>
            </Box>

            <Alert severity="info" sx={{ mb: 2 }}>
                Setelah host dibuat, copy binding token dan kirimkan ke host.
                Host ketik <b>/bind TOKEN</b> di Telegram Bot untuk menghubungkan akun.
            </Alert>

            <Card>
                <CardContent sx={{ p: 0 }}>
                    <TableContainer component={Paper} elevation={0}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>ID</TableCell>
                                    <TableCell>Name</TableCell>
                                    <TableCell>Telegram</TableCell>
                                    <TableCell>Binding Token</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell>Created</TableCell>
                                    <TableCell>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {hosts.map(host => (
                                    <TableRow key={host.id}>
                                        <TableCell>#{host.id}</TableCell>
                                        <TableCell>{host.full_name}</TableCell>
                                        <TableCell>
                                            {host.telegram_user_id
                                                ? <Chip label="Bound"   size="small" color="success" />
                                                : <Chip label="Unbound" size="small" />
                                            }
                                        </TableCell>
                                        <TableCell>
                                            {host.binding_token ? (
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                                                        {host.binding_token.slice(0, 8)}...
                                                    </Typography>
                                                    <Tooltip title={copiedToken === host.binding_token ? 'Copied!' : 'Copy /bind command'}>
                                                        <IconButton size="small" onClick={() => copyToken(host.binding_token!)}>
                                                            <ContentCopy fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                </Box>
                                            ) : (
                                                <Tooltip title="Regenerate token">
                                                    <IconButton size="small" onClick={() => regenerateToken(host.id)}>
                                                        <Refresh fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={host.is_active ? 'Active' : 'Inactive'}
                                                size="small"
                                                color={host.is_active ? 'success' : 'default'}
                                            />
                                        </TableCell>
                                        <TableCell>{formatDate(host.created_at)}</TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', gap: 1 }}>
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    color={host.is_active ? 'warning' : 'success'}
                                                    onClick={() => toggleStatus(host.id)}
                                                >
                                                    {host.is_active ? 'Deactivate' : 'Activate'}
                                                </Button>
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    color="error"
                                                    onClick={() => {
                                                        if (confirm(`Delete ${host.full_name}?`)) deleteHost(host.id);
                                                    }}
                                                >
                                                    Delete
                                                </Button>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {hosts.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={7} align="center">No hosts yet</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </CardContent>
            </Card>

            {/* Create Dialog */}
            <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Add New Host</DialogTitle>
                <DialogContent>
                    <TextField
                        label="Full Name"
                        value={fullName}
                        onChange={e => setFullName(e.target.value)}
                        fullWidth
                        sx={{ mt: 1 }}
                        autoFocus
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
                    <Button
                        variant="contained"
                        disabled={!fullName.trim() || creating}
                        onClick={() => createHost()}
                    >
                        Create
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

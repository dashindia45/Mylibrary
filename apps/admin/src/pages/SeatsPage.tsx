import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { formatPaise } from '@/lib/utils';
import {
  Plus,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  Building,
  Armchair,
  Layers,
  Sparkles,
  Edit2,
  Trash2,
  Tag,
  IndianRupee,
  AlertCircle,
  X,
  Check,
  Power,
  ChevronRight,
  Info,
} from 'lucide-react';

export default function SeatsPage() {
  const queryClient = useQueryClient();

  // Active top-level subtab: 'desks' | 'floors' | 'seat-types'
  const [activeTab, setActiveTab] = useState<'desks' | 'floors' | 'seat-types'>('desks');

  // Selected floor for desks view
  const [selectedFloorId, setSelectedFloorId] = useState<string>('');

  // Modals state - Desks
  const [showAddSeatModal, setShowAddSeatModal] = useState(false);
  const [editSeat, setEditSeat] = useState<any>(null);
  const [blockSeat, setBlockSeat] = useState<any>(null);
  const [deleteSeatTarget, setDeleteSeatTarget] = useState<any>(null);
  const [blockReason, setBlockReason] = useState('Maintenance & Cleaning');

  // New Seat form
  const [newSeatNumber, setNewSeatNumber] = useState('');
  const [newSeatType, setNewSeatType] = useState('STANDARD');
  const [newSectionId, setNewSectionId] = useState('');
  const [newAmenities, setNewAmenities] = useState<string[]>(['AC', 'WIFI', 'CHARGING_POINT']);

  // Modals state - Floors
  const [showAddFloorModal, setShowAddFloorModal] = useState(false);
  const [editFloorTarget, setEditFloorTarget] = useState<any>(null);
  const [deleteFloorTarget, setDeleteFloorTarget] = useState<any>(null);
  const [floorForm, setFloorForm] = useState({
    name: '',
    floorNumber: 1,
    description: '',
    status: 'ACTIVE',
  });

  // Modals state - Sections
  const [showAddSectionModal, setShowAddSectionModal] = useState(false);
  const [sectionFloorId, setSectionFloorId] = useState('');
  const [editSectionTarget, setEditSectionTarget] = useState<any>(null);
  const [deleteSectionTarget, setDeleteSectionTarget] = useState<any>(null);
  const [sectionForm, setSectionForm] = useState({
    name: '',
    sectionType: 'GENERAL',
    description: '',
  });

  // Modals state - Seat Types
  const [showAddTypeModal, setShowAddTypeModal] = useState(false);
  const [editTypeTarget, setEditTypeTarget] = useState<any>(null);
  const [deleteTypeTarget, setDeleteTypeTarget] = useState<any>(null);
  const [typeForm, setTypeForm] = useState({
    code: '',
    name: '',
    description: '',
    color: 'blue',
    defaultPriceRupees: '500',
    isActive: true,
  });

  // 1. Fetch Floors & Desks with 3s live sync
  const { data: floorsData, isLoading: loadingFloors } = useQuery({
    queryKey: ['admin-floors'],
    queryFn: () => api.get<any[]>('/floors'),
    refetchInterval: 3000,
  });
  const floors = floorsData?.data || [];

  if (floors.length > 0 && !selectedFloorId) {
    setSelectedFloorId(floors[0].id);
  }
  const currentFloor = floors.find((f: any) => f.id === selectedFloorId) || floors[0];

  // 2. Fetch Seat Types with 3s live sync
  const { data: seatTypesData, isLoading: loadingTypes } = useQuery({
    queryKey: ['admin-seat-types'],
    queryFn: () => api.get<any[]>('/admin/seat-types'),
    refetchInterval: 3000,
  });
  const seatTypes = seatTypesData?.data || [];

  // Helper to invalidate all related queries
  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-floors'] });
    queryClient.invalidateQueries({ queryKey: ['admin-seat-types'] });
    queryClient.invalidateQueries({ queryKey: ['floors'] });
    queryClient.invalidateQueries({ queryKey: ['seat-types'] });
    queryClient.invalidateQueries({ queryKey: ['availability'] });
  };

  // ─── Mutations: Desks ───
  const addSeatMutation = useMutation({
    mutationFn: (body: any) => api.post('/admin/seats', body),
    onSuccess: () => {
      alert('Desk added successfully');
      refreshAll();
      setShowAddSeatModal(false);
      setNewSeatNumber('');
    },
    onError: (err: any) => alert(err.message || 'Failed to add desk'),
  });

  const updateSeatMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) => api.patch(`/admin/seats/${id}`, body),
    onSuccess: () => {
      alert('Desk updated successfully');
      refreshAll();
      setEditSeat(null);
    },
    onError: (err: any) => alert(err.message || 'Failed to update desk'),
  });

  const deleteSeatMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/seats/${id}`),
    onSuccess: () => {
      alert('Desk removed successfully');
      refreshAll();
      setDeleteSeatTarget(null);
    },
    onError: (err: any) => alert(err.message || 'Failed to delete desk'),
  });

  const blockSeatMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.post(`/admin/seats/${id}/block`, { reason }),
    onSuccess: () => {
      alert('Desk marked for maintenance');
      refreshAll();
      setBlockSeat(null);
    },
    onError: (err: any) => alert(err.message || 'Failed to block desk'),
  });

  const unblockSeatMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/seats/${id}/unblock`),
    onSuccess: () => {
      alert('Desk marked active');
      refreshAll();
    },
    onError: (err: any) => alert(err.message || 'Failed to unblock desk'),
  });

  // ─── Mutations: Floors ───
  const addFloorMutation = useMutation({
    mutationFn: (body: any) => api.post('/admin/floors', body),
    onSuccess: (res: any) => {
      alert('Floor created successfully');
      refreshAll();
      setShowAddFloorModal(false);
      if (res?.data?.id) setSelectedFloorId(res.data.id);
    },
    onError: (err: any) => alert(err.message || 'Failed to add floor'),
  });

  const updateFloorMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) => api.patch(`/admin/floors/${id}`, body),
    onSuccess: () => {
      alert('Floor updated successfully');
      refreshAll();
      setEditFloorTarget(null);
    },
    onError: (err: any) => alert(err.message || 'Failed to update floor'),
  });

  const deleteFloorMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/floors/${id}`),
    onSuccess: () => {
      alert('Floor removed successfully');
      refreshAll();
      setDeleteFloorTarget(null);
      setSelectedFloorId('');
    },
    onError: (err: any) => alert(err.message || 'Failed to delete floor'),
  });

  // ─── Mutations: Sections ───
  const addSectionMutation = useMutation({
    mutationFn: (body: any) => api.post('/admin/sections', body),
    onSuccess: () => {
      alert('Section created successfully');
      refreshAll();
      setShowAddSectionModal(false);
    },
    onError: (err: any) => alert(err.message || 'Failed to create section'),
  });

  const updateSectionMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) => api.patch(`/admin/sections/${id}`, body),
    onSuccess: () => {
      alert('Section updated successfully');
      refreshAll();
      setEditSectionTarget(null);
    },
    onError: (err: any) => alert(err.message || 'Failed to update section'),
  });

  const deleteSectionMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/sections/${id}`),
    onSuccess: () => {
      alert('Section removed successfully');
      refreshAll();
      setDeleteSectionTarget(null);
    },
    onError: (err: any) => alert(err.message || 'Failed to delete section'),
  });

  // ─── Mutations: Seat Types ───
  const addTypeMutation = useMutation({
    mutationFn: (body: any) => api.post('/admin/seat-types', body),
    onSuccess: () => {
      alert('Seat type added successfully');
      refreshAll();
      setShowAddTypeModal(false);
    },
    onError: (err: any) => alert(err.message || 'Failed to add seat type'),
  });

  const updateTypeMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) => api.patch(`/admin/seat-types/${id}`, body),
    onSuccess: () => {
      alert('Seat type updated successfully');
      refreshAll();
      setEditTypeTarget(null);
    },
    onError: (err: any) => alert(err.message || 'Failed to update seat type'),
  });

  const deleteTypeMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/seat-types/${id}`),
    onSuccess: (res: any) => {
      alert(res?.message || 'Seat type removed successfully');
      refreshAll();
      setDeleteTypeTarget(null);
    },
    onError: (err: any) => alert(err.message || 'Failed to delete seat type'),
  });

  const colorBadgeClass = (color?: string) => {
    switch (color) {
      case 'emerald':
        return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      case 'purple':
        return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
      case 'amber':
        return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
      case 'rose':
        return 'bg-rose-500/10 text-rose-600 border-rose-500/20';
      case 'indigo':
        return 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20';
      default:
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <span>Library Spaces & Desk Layout</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage floors, spatial sections, custom seat types, and live desk grids.
          </p>
        </div>

        {/* Action button changes depending on active tab */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {activeTab === 'desks' && (
            <button
              onClick={() => {
                if (currentFloor?.sections?.[0]) {
                  setNewSectionId(currentFloor.sections[0].id);
                }
                if (seatTypes.length > 0) {
                  setNewSeatType(seatTypes[0].code);
                }
                setShowAddSeatModal(true);
              }}
              className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 shadow-md shadow-blue-600/20 flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-4 h-4" />
              Add New Desk
            </button>
          )}

          {activeTab === 'floors' && (
            <button
              onClick={() => {
                setFloorForm({
                  name: '',
                  floorNumber: (floors.length || 0) + 1,
                  description: '',
                  status: 'ACTIVE',
                });
                setShowAddFloorModal(true);
              }}
              className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 shadow-md shadow-blue-600/20 flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-4 h-4" />
              Add New Floor
            </button>
          )}

          {activeTab === 'seat-types' && (
            <button
              onClick={() => {
                setTypeForm({
                  code: '',
                  name: '',
                  description: '',
                  color: 'blue',
                  defaultPriceRupees: '500',
                  isActive: true,
                });
                setShowAddTypeModal(true);
              }}
              className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 shadow-md shadow-blue-600/20 flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-4 h-4" />
              Add Seat Type
            </button>
          )}
        </div>
      </div>

      {/* Main Mode Navigation Tabs */}
      <div className="flex border-b border-border gap-2">
        <button
          onClick={() => setActiveTab('desks')}
          className={`pb-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'desks'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Armchair className="w-4 h-4" />
          Desks & Layout Map
        </button>

        <button
          onClick={() => setActiveTab('floors')}
          className={`pb-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'floors'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Building className="w-4 h-4" />
          Floors & Zones ({floors.length})
        </button>

        <button
          onClick={() => setActiveTab('seat-types')}
          className={`pb-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'seat-types'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Tag className="w-4 h-4" />
          Seat Types & Pricing ({seatTypes.length})
        </button>
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* TAB 1: DESKS & SPATIAL MAP */}
      {/* ──────────────────────────────────────────────────────────── */}
      {activeTab === 'desks' && (
        <div className="space-y-6">
          {/* Floor selection tabs */}
          <div className="flex items-center justify-between gap-2 border-b border-border pb-3 overflow-x-auto">
            <div className="flex items-center gap-2">
              {floors.map((floor: any) => (
                <button
                  key={floor.id}
                  onClick={() => setSelectedFloorId(floor.id)}
                  className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                    selectedFloorId === floor.id
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                      : 'bg-card text-muted-foreground hover:bg-muted border border-border'
                  }`}
                >
                  <Building className="w-3.5 h-3.5" />
                  <span>{floor.name}</span>
                  <span className="text-[10px] opacity-75 font-mono">
                    ({floor.sections?.reduce((sum: number, s: any) => sum + (s.seats?.length || 0), 0) || 0})
                  </span>
                </button>
              ))}

              {floors.length === 0 && (
                <p className="text-xs text-muted-foreground italic">No floors found. Click 'Floors & Zones' to add one.</p>
              )}
            </div>
          </div>

          {/* Desks Grid */}
          {loadingFloors ? (
            <div className="h-64 flex items-center justify-center bg-card rounded-2xl border border-border">
              <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !currentFloor ? (
            <div className="p-12 text-center bg-card rounded-2xl border border-dashed border-border space-y-3">
              <Building className="w-10 h-10 text-muted-foreground mx-auto" />
              <p className="text-sm font-bold text-foreground">No floors configured yet</p>
              <button
                onClick={() => setActiveTab('floors')}
                className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl"
              >
                Create Your First Floor
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {currentFloor?.sections?.map((section: any) => (
                <div key={section.id} className="bg-card rounded-2xl border border-border p-5 shadow-sm space-y-4">
                  <div className="flex justify-between items-center border-b border-border/50 pb-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-foreground">{section.name}</h3>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground font-semibold">
                        {section.sectionType}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground font-mono">
                      {section.seats?.length || 0} desks
                    </span>
                  </div>

                  {/* Desk tiles */}
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2.5">
                    {section.seats?.map((seat: any) => {
                      const isMaintenance = seat.status === 'MAINTENANCE';
                      const isBlocked = seat.status === 'BLOCKED';
                      const isInactive = seat.status === 'INACTIVE';
                      const typeConfig = seatTypes.find((t: any) => t.code === seat.seatType);

                      return (
                        <div
                          key={seat.id}
                          className={`group relative aspect-square rounded-xl border p-1.5 flex flex-col items-center justify-center text-center transition-all ${
                            isMaintenance || isBlocked
                              ? 'bg-rose-500/10 border-rose-500/30 text-rose-500'
                              : isInactive
                              ? 'bg-muted/40 border-border text-muted-foreground opacity-60'
                              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600'
                          }`}
                        >
                          <span className="font-extrabold text-xs">{seat.seatNumber}</span>
                          <span className="text-[8px] uppercase tracking-wider font-bold opacity-80 truncate max-w-full px-1">
                            {typeConfig?.name ? typeConfig.name.split(' ')[0] : seat.seatType}
                          </span>

                          {/* Hover action overlay */}
                          <div className="absolute inset-0 bg-background/95 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1 transition-opacity p-1">
                            <button
                              title="Edit Desk"
                              onClick={() =>
                                setEditSeat({
                                  ...seat,
                                  sectionId: seat.sectionId || section.id,
                                  amenities: Array.isArray(seat.amenities) ? seat.amenities : [],
                                })
                              }
                              className="p-1 rounded bg-muted text-muted-foreground hover:text-foreground"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            {isMaintenance || isBlocked ? (
                              <button
                                title="Mark Active"
                                onClick={() => unblockSeatMutation.mutate(seat.id)}
                                className="p-1 rounded bg-emerald-500/20 text-emerald-600 hover:bg-emerald-500/30"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                              </button>
                            ) : (
                              <button
                                title="Block for Maintenance"
                                onClick={() => setBlockSeat(seat)}
                                className="p-1 rounded bg-rose-500/20 text-rose-500 hover:bg-rose-500/30"
                              >
                                <Wrench className="w-3 h-3" />
                              </button>
                            )}
                            <button
                              title="Delete Desk"
                              onClick={() => setDeleteSeatTarget(seat)}
                              className="p-1 rounded bg-rose-500/10 text-rose-500 hover:bg-rose-500/20"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {(!section.seats || section.seats.length === 0) && (
                    <p className="text-xs text-muted-foreground italic py-3 text-center">
                      No desks in this section yet. Click 'Add New Desk' above.
                    </p>
                  )}
                </div>
              ))}

              {(!currentFloor.sections || currentFloor.sections.length === 0) && (
                <div className="p-8 text-center bg-card rounded-2xl border border-dashed border-border space-y-2">
                  <p className="text-xs text-muted-foreground">This floor has no sections yet.</p>
                  <button
                    onClick={() => {
                      setSectionFloorId(currentFloor.id);
                      setSectionForm({ name: 'Reading Hall', sectionType: 'GENERAL', description: '' });
                      setShowAddSectionModal(true);
                    }}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold"
                  >
                    Add a Section to {currentFloor.name}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* TAB 2: FLOORS & ZONES MANAGEMENT */}
      {/* ──────────────────────────────────────────────────────────── */}
      {activeTab === 'floors' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {floors.map((floor: any) => {
              const totalDesks = floor.sections?.reduce(
                (sum: number, s: any) => sum + (s.seats?.length || 0),
                0
              ) || 0;

              return (
                <div
                  key={floor.id}
                  className="bg-card rounded-2xl border border-border p-5 shadow-sm space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 flex items-center justify-center font-bold text-sm">
                          {floor.floorNumber}
                        </div>
                        <div>
                          <h3 className="font-extrabold text-sm text-foreground">{floor.name}</h3>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                              floor.status === 'ACTIVE'
                                ? 'bg-emerald-500/10 text-emerald-600'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {floor.status}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          title="Edit Floor"
                          onClick={() => {
                            setEditFloorTarget(floor);
                            setFloorForm({
                              name: floor.name,
                              floorNumber: floor.floorNumber,
                              description: floor.description || '',
                              status: floor.status,
                            });
                          }}
                          className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          title="Delete Floor"
                          onClick={() => setDeleteFloorTarget(floor)}
                          className="p-1.5 rounded-lg border border-border text-rose-500 hover:bg-rose-500/10"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {floor.description && (
                      <p className="text-xs text-muted-foreground">{floor.description}</p>
                    )}

                    <div className="flex items-center gap-4 text-xs font-semibold pt-1 border-t border-border/50">
                      <span className="text-muted-foreground">
                        Sections: <strong className="text-foreground">{floor.sections?.length || 0}</strong>
                      </span>
                      <span className="text-muted-foreground">
                        Total Desks: <strong className="text-foreground">{totalDesks}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Sections list inside this floor */}
                  <div className="space-y-2 pt-2 border-t border-border/60">
                    <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
                      <span>Sections in {floor.name}</span>
                      <button
                        onClick={() => {
                          setSectionFloorId(floor.id);
                          setSectionForm({ name: '', sectionType: 'GENERAL', description: '' });
                          setShowAddSectionModal(true);
                        }}
                        className="text-[11px] text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Add Section
                      </button>
                    </div>

                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {floor.sections?.map((sec: any) => (
                        <div
                          key={sec.id}
                          className="flex items-center justify-between p-2 rounded-xl bg-muted/30 border border-border/50 text-xs"
                        >
                          <div className="min-w-0 flex-1 pr-2">
                            <p className="font-bold text-foreground truncate">{sec.name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {sec.sectionType} • {sec.seats?.length || 0} desks
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                setEditSectionTarget(sec);
                                setSectionForm({
                                  name: sec.name,
                                  sectionType: sec.sectionType,
                                  description: sec.description || '',
                                });
                              }}
                              className="p-1 rounded text-muted-foreground hover:text-foreground"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => setDeleteSectionTarget(sec)}
                              className="p-1 rounded text-rose-500 hover:bg-rose-500/10"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}

                      {(!floor.sections || floor.sections.length === 0) && (
                        <p className="text-[11px] text-muted-foreground italic">No sections configured.</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* TAB 3: SEAT TYPES & PRICING CONFIGURATION */}
      {/* ──────────────────────────────────────────────────────────── */}
      {activeTab === 'seat-types' && (
        <div className="space-y-6">
          <div className="bg-card rounded-2xl border border-border p-4 text-xs text-muted-foreground space-y-1 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <p>
              Seat types determine the desk categories, filter badges on the Member Portal, and pricing
              rules. When you add or remove seat types here, the changes immediately update the live website!
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {seatTypes.map((st: any) => (
              <div
                key={st.id}
                className="bg-card rounded-2xl border border-border p-5 shadow-sm space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-lg border font-extrabold uppercase tracking-wider ${colorBadgeClass(
                            st.color
                          )}`}
                        >
                          {st.code}
                        </span>
                        {!st.isActive && (
                          <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded font-bold">
                            Inactive
                          </span>
                        )}
                      </div>
                      <h3 className="font-extrabold text-base text-foreground mt-1.5">{st.name}</h3>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        title="Edit Seat Type"
                        onClick={() => {
                          setEditTypeTarget(st);
                          setTypeForm({
                            code: st.code,
                            name: st.name,
                            description: st.description || '',
                            color: st.color || 'blue',
                            defaultPriceRupees: String(Math.round((st.defaultPricePaise || 50000) / 100)),
                            isActive: st.isActive,
                          });
                        }}
                        className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        title="Delete Seat Type"
                        onClick={() => setDeleteTypeTarget(st)}
                        className="p-1.5 rounded-lg border border-border text-rose-500 hover:bg-rose-500/10"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {st.description && <p className="text-xs text-muted-foreground">{st.description}</p>}

                  <div className="pt-2 border-t border-border/50 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground font-medium">Default Full-Day Price:</span>
                      <strong className="text-foreground text-sm font-bold">
                        {formatPaise(st.defaultPricePaise || 50000)}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground font-medium">Assigned Desks:</span>
                      <strong className="text-foreground">{st.deskCount || 0} desks</strong>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Theme Color: <strong className="capitalize">{st.color || 'blue'}</strong></span>
                  <button
                    onClick={() =>
                      updateTypeMutation.mutate({
                        id: st.id,
                        body: { isActive: !st.isActive },
                      })
                    }
                    className={`font-bold hover:underline flex items-center gap-1 ${
                      st.isActive ? 'text-rose-500' : 'text-emerald-600'
                    }`}
                  >
                    <Power className="w-3 h-3" />
                    {st.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* MODALS: DESK CRUD */}
      {/* ──────────────────────────────────────────────────────────── */}

      {/* Add Desk Modal */}
      {showAddSeatModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newSeatNumber || !newSectionId) return;
              addSeatMutation.mutate({
                sectionId: newSectionId,
                seatNumber: newSeatNumber,
                seatType: newSeatType,
                amenities: newAmenities,
              });
            }}
            className="bg-card border border-border rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-foreground">Add New Desk</h3>
              <button
                type="button"
                onClick={() => setShowAddSeatModal(false)}
                className="p-1 rounded text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-muted-foreground">Floor & Section</label>
              <select
                value={newSectionId}
                onChange={(e) => setNewSectionId(e.target.value)}
                className="w-full mt-1 bg-muted/40 border border-border rounded-xl p-2.5 text-xs focus:outline-none"
                required
              >
                {floors.map((f: any) => (
                  <optgroup key={f.id} label={f.name}>
                    {f.sections?.map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {f.name} - {s.name} ({s.sectionType})
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-muted-foreground">Desk Number / Code</label>
              <input
                required
                type="text"
                placeholder="e.g. G-31 or C-05"
                value={newSeatNumber}
                onChange={(e) => setNewSeatNumber(e.target.value)}
                className="w-full mt-1 bg-muted/40 border border-border rounded-xl p-2.5 text-xs focus:outline-none font-bold"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-muted-foreground">Seat Type</label>
              <select
                value={newSeatType}
                onChange={(e) => setNewSeatType(e.target.value)}
                className="w-full mt-1 bg-muted/40 border border-border rounded-xl p-2.5 text-xs focus:outline-none font-medium"
              >
                {seatTypes.map((t: any) => (
                  <option key={t.id} value={t.code}>
                    {t.name} ({t.code}) - {t.defaultPriceRupees ? `₹${t.defaultPriceRupees}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-muted-foreground block mb-1.5">Desk Amenities</label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { code: 'AC', label: 'AC' },
                  { code: 'WIFI', label: 'Wi-Fi' },
                  { code: 'CHARGING_POINT', label: 'Power Socket' },
                  { code: 'WINDOW', label: 'Window View' },
                  { code: 'LOCKER', label: 'Locker' },
                  { code: 'DESK_LAMP', label: 'Desk Lamp' },
                ].map((a) => {
                  const selected = newAmenities.includes(a.code);
                  return (
                    <button
                      key={a.code}
                      type="button"
                      onClick={() => {
                        setNewAmenities(
                          selected
                            ? newAmenities.filter((c) => c !== a.code)
                            : [...newAmenities, a.code]
                        );
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                        selected
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-muted/40 text-muted-foreground border-border hover:border-foreground/30'
                      }`}
                    >
                      {selected ? '✓ ' : '+ '}
                      {a.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddSeatModal(false)}
                className="flex-1 py-2.5 border border-border rounded-xl text-xs font-bold hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={addSeatMutation.isPending}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 shadow-md shadow-blue-600/20"
              >
                {addSeatMutation.isPending ? 'Creating...' : 'Create Desk'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Desk Modal */}
      {editSeat && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div>
                <h3 className="font-bold text-base text-foreground">Edit Desk Configuration</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Update desk code, seating category, section placement, and features.
                </p>
              </div>
              <button
                onClick={() => setEditSeat(null)}
                className="p-1 rounded text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-muted-foreground">Desk Number / Code</label>
                <input
                  type="text"
                  value={editSeat.seatNumber || ''}
                  onChange={(e) => setEditSeat({ ...editSeat, seatNumber: e.target.value })}
                  placeholder="e.g. G-01"
                  className="w-full mt-1 bg-muted/40 border border-border rounded-xl p-2.5 text-xs font-bold focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground">Operational Status</label>
                <select
                  value={editSeat.status || 'ACTIVE'}
                  onChange={(e) => setEditSeat({ ...editSeat, status: e.target.value })}
                  className="w-full mt-1 bg-muted/40 border border-border rounded-xl p-2.5 text-xs focus:outline-none font-semibold"
                >
                  <option value="ACTIVE">ACTIVE (Ready for Booking)</option>
                  <option value="MAINTENANCE">MAINTENANCE (Temporarily Held)</option>
                  <option value="BLOCKED">BLOCKED (Admin Hold)</option>
                  <option value="INACTIVE">INACTIVE (Hidden)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-muted-foreground">Desk Type / Tier</label>
              <select
                value={editSeat.seatType || 'STANDARD'}
                onChange={(e) => setEditSeat({ ...editSeat, seatType: e.target.value })}
                className="w-full mt-1 bg-muted/40 border border-border rounded-xl p-2.5 text-xs focus:outline-none font-medium"
              >
                {seatTypes.map((t: any) => (
                  <option key={t.id} value={t.code}>
                    {t.name} ({t.code}) - {t.defaultPriceRupees ? `₹${t.defaultPriceRupees}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-muted-foreground">Floor & Section Placement</label>
              <select
                value={editSeat.sectionId || ''}
                onChange={(e) => setEditSeat({ ...editSeat, sectionId: e.target.value })}
                className="w-full mt-1 bg-muted/40 border border-border rounded-xl p-2.5 text-xs focus:outline-none"
              >
                {floors.map((f: any) => (
                  <optgroup key={f.id} label={f.name}>
                    {f.sections?.map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {f.name} - {s.name} ({s.sectionType})
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-muted-foreground block mb-1.5">Amenities & Inclusions</label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { code: 'AC', label: 'AC' },
                  { code: 'WIFI', label: 'Wi-Fi' },
                  { code: 'CHARGING_POINT', label: 'Power Socket' },
                  { code: 'WINDOW', label: 'Window View' },
                  { code: 'LOCKER', label: 'Locker' },
                  { code: 'DESK_LAMP', label: 'Desk Lamp' },
                ].map((a) => {
                  const currentAmenities = Array.isArray(editSeat.amenities) ? editSeat.amenities : [];
                  const selected = currentAmenities.includes(a.code);
                  return (
                    <button
                      key={a.code}
                      type="button"
                      onClick={() => {
                        const updated = selected
                          ? currentAmenities.filter((c: string) => c !== a.code)
                          : [...currentAmenities, a.code];
                        setEditSeat({ ...editSeat, amenities: updated });
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                        selected
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-muted/40 text-muted-foreground border-border hover:border-foreground/30'
                      }`}
                    >
                      {selected ? '✓ ' : '+ '}
                      {a.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-3 border-t border-border/60">
              <button
                type="button"
                onClick={() => {
                  setDeleteSeatTarget(editSeat);
                  setEditSeat(null);
                }}
                className="px-3 py-2 text-rose-500 hover:bg-rose-500/10 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Desk
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditSeat(null)}
                  className="px-4 py-2 border border-border rounded-xl text-xs font-bold hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={updateSeatMutation.isPending}
                  onClick={() =>
                    updateSeatMutation.mutate({
                      id: editSeat.id,
                      body: {
                        seatNumber: editSeat.seatNumber,
                        seatType: editSeat.seatType,
                        sectionId: editSeat.sectionId,
                        status: editSeat.status,
                        amenities: editSeat.amenities || [],
                      },
                    })
                  }
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 shadow-md shadow-blue-600/20"
                >
                  {updateSeatMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Desk Confirmation */}
      {deleteSeatTarget && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="text-center">
              <h3 className="font-bold text-base text-foreground">
                Delete Desk {deleteSeatTarget.seatNumber}?
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Are you sure you want to permanently remove this desk? It cannot be deleted if there are
                active bookings.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setDeleteSeatTarget(null)}
                className="flex-1 py-2.5 border border-border rounded-xl text-xs font-bold hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteSeatMutation.mutate(deleteSeatTarget.id)}
                className="flex-1 py-2.5 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700"
              >
                Delete Desk
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Block Desk Modal */}
      {blockSeat && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <h3 className="font-bold text-base text-foreground">Block Desk {blockSeat.seatNumber}</h3>
            <div>
              <label className="text-xs font-bold text-muted-foreground">Reason</label>
              <input
                type="text"
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                className="w-full mt-1 bg-muted/40 border border-border rounded-xl p-2.5 text-xs focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setBlockSeat(null)}
                className="flex-1 py-2.5 border border-border rounded-xl text-xs font-bold hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  blockSeatMutation.mutate({
                    id: blockSeat.id,
                    reason: blockReason,
                  })
                }
                className="flex-1 py-2.5 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700"
              >
                Confirm Block
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* MODALS: FLOOR CRUD */}
      {/* ──────────────────────────────────────────────────────────── */}

      {/* Add / Edit Floor Modal */}
      {(showAddFloorModal || editFloorTarget) && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (editFloorTarget) {
                updateFloorMutation.mutate({
                  id: editFloorTarget.id,
                  body: floorForm,
                });
              } else {
                addFloorMutation.mutate(floorForm);
              }
            }}
            className="bg-card border border-border rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-foreground">
                {editFloorTarget ? 'Edit Floor' : 'Add New Library Floor'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowAddFloorModal(false);
                  setEditFloorTarget(null);
                }}
                className="p-1 rounded text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-muted-foreground">Floor Name</label>
              <input
                required
                type="text"
                placeholder="e.g. Ground Floor, 2nd Floor Silent Hall"
                value={floorForm.name}
                onChange={(e) => setFloorForm({ ...floorForm, name: e.target.value })}
                className="w-full mt-1 bg-muted/40 border border-border rounded-xl p-2.5 text-xs focus:outline-none font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-bold text-muted-foreground">Floor Number</label>
                <input
                  required
                  type="number"
                  value={floorForm.floorNumber}
                  onChange={(e) =>
                    setFloorForm({ ...floorForm, floorNumber: parseInt(e.target.value || '0', 10) })
                  }
                  className="w-full mt-1 bg-muted/40 border border-border rounded-xl p-2.5 text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground">Status</label>
                <select
                  value={floorForm.status}
                  onChange={(e) => setFloorForm({ ...floorForm, status: e.target.value })}
                  className="w-full mt-1 bg-muted/40 border border-border rounded-xl p-2.5 text-xs focus:outline-none"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-muted-foreground">Description (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Dedicated silent reading deck with garden view"
                value={floorForm.description}
                onChange={(e) => setFloorForm({ ...floorForm, description: e.target.value })}
                className="w-full mt-1 bg-muted/40 border border-border rounded-xl p-2.5 text-xs focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowAddFloorModal(false);
                  setEditFloorTarget(null);
                }}
                className="flex-1 py-2.5 border border-border rounded-xl text-xs font-bold hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 shadow-md shadow-blue-600/20"
              >
                {editFloorTarget ? 'Save Changes' : 'Create Floor'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Floor Confirmation */}
      {deleteFloorTarget && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="text-center">
              <h3 className="font-bold text-base text-foreground">
                Remove Floor "{deleteFloorTarget.name}"?
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                This will delete the floor and its associated unbooked desks from the entire system and
                website. Floors with active ongoing bookings cannot be removed.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setDeleteFloorTarget(null)}
                className="flex-1 py-2.5 border border-border rounded-xl text-xs font-bold hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteFloorMutation.mutate(deleteFloorTarget.id)}
                className="flex-1 py-2.5 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700"
              >
                Confirm Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* MODALS: SECTION CRUD */}
      {/* ──────────────────────────────────────────────────────────── */}

      {/* Add / Edit Section Modal */}
      {(showAddSectionModal || editSectionTarget) && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (editSectionTarget) {
                updateSectionMutation.mutate({
                  id: editSectionTarget.id,
                  body: sectionForm,
                });
              } else {
                addSectionMutation.mutate({
                  floorId: sectionFloorId,
                  ...sectionForm,
                });
              }
            }}
            className="bg-card border border-border rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-foreground">
                {editSectionTarget ? 'Edit Section' : 'Add Section / Zone'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowAddSectionModal(false);
                  setEditSectionTarget(null);
                }}
                className="p-1 rounded text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-muted-foreground">Section Name</label>
              <input
                required
                type="text"
                placeholder="e.g. Quiet Zone A, Executive Cabins"
                value={sectionForm.name}
                onChange={(e) => setSectionForm({ ...sectionForm, name: e.target.value })}
                className="w-full mt-1 bg-muted/40 border border-border rounded-xl p-2.5 text-xs focus:outline-none font-bold"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-muted-foreground">Zone Type</label>
              <select
                value={sectionForm.sectionType}
                onChange={(e) => setSectionForm({ ...sectionForm, sectionType: e.target.value })}
                className="w-full mt-1 bg-muted/40 border border-border rounded-xl p-2.5 text-xs focus:outline-none"
              >
                <option value="GENERAL">GENERAL</option>
                <option value="QUIET_ZONE">QUIET_ZONE</option>
                <option value="PREMIUM">PREMIUM</option>
                <option value="AC">AC</option>
                <option value="NON_AC">NON_AC</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-muted-foreground">Description (Optional)</label>
              <input
                type="text"
                value={sectionForm.description}
                onChange={(e) => setSectionForm({ ...sectionForm, description: e.target.value })}
                className="w-full mt-1 bg-muted/40 border border-border rounded-xl p-2.5 text-xs focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowAddSectionModal(false);
                  setEditSectionTarget(null);
                }}
                className="flex-1 py-2.5 border border-border rounded-xl text-xs font-bold hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 shadow-md shadow-blue-600/20"
              >
                {editSectionTarget ? 'Save Changes' : 'Create Section'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Section Confirmation */}
      {deleteSectionTarget && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="text-center">
              <h3 className="font-bold text-base text-foreground">
                Remove Section "{deleteSectionTarget.name}"?
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Are you sure? This will remove the section and its desks.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setDeleteSectionTarget(null)}
                className="flex-1 py-2.5 border border-border rounded-xl text-xs font-bold hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteSectionMutation.mutate(deleteSectionTarget.id)}
                className="flex-1 py-2.5 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700"
              >
                Confirm Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* MODALS: SEAT TYPE CRUD */}
      {/* ──────────────────────────────────────────────────────────── */}

      {/* Add / Edit Seat Type Modal */}
      {(showAddTypeModal || editTypeTarget) && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const pricePaise = Math.round(parseFloat(typeForm.defaultPriceRupees || '500') * 100);
              if (editTypeTarget) {
                updateTypeMutation.mutate({
                  id: editTypeTarget.id,
                  body: {
                    name: typeForm.name,
                    description: typeForm.description,
                    color: typeForm.color,
                    defaultPricePaise: pricePaise,
                    isActive: typeForm.isActive,
                  },
                });
              } else {
                addTypeMutation.mutate({
                  code: typeForm.code,
                  name: typeForm.name,
                  description: typeForm.description,
                  color: typeForm.color,
                  defaultPricePaise: pricePaise,
                });
              }
            }}
            className="bg-card border border-border rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-foreground">
                {editTypeTarget ? `Edit "${editTypeTarget.name}"` : 'Add New Seat Type'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowAddTypeModal(false);
                  setEditTypeTarget(null);
                }}
                className="p-1 rounded text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-muted-foreground">Type Code / Identifier</label>
              <input
                required
                disabled={!!editTypeTarget}
                type="text"
                placeholder="e.g. RECLINER, CABIN, POD"
                value={typeForm.code}
                onChange={(e) => setTypeForm({ ...typeForm, code: e.target.value.toUpperCase() })}
                className="w-full mt-1 bg-muted/40 border border-border rounded-xl p-2.5 text-xs focus:outline-none font-mono font-bold disabled:opacity-50"
              />
              {!editTypeTarget && (
                <span className="text-[10px] text-muted-foreground mt-0.5 block">
                  Short uppercase code used across system filters & database
                </span>
              )}
            </div>

            <div>
              <label className="text-xs font-bold text-muted-foreground">Display Name</label>
              <input
                required
                type="text"
                placeholder="e.g. Ergonomic Recliner Desk"
                value={typeForm.name}
                onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })}
                className="w-full mt-1 bg-muted/40 border border-border rounded-xl p-2.5 text-xs focus:outline-none font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-bold text-muted-foreground">Daily Price (₹)</label>
                <input
                  required
                  type="number"
                  min="0"
                  step="1"
                  value={typeForm.defaultPriceRupees}
                  onChange={(e) => setTypeForm({ ...typeForm, defaultPriceRupees: e.target.value })}
                  className="w-full mt-1 bg-muted/40 border border-border rounded-xl p-2.5 text-xs focus:outline-none font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground">Theme Color</label>
                <select
                  value={typeForm.color}
                  onChange={(e) => setTypeForm({ ...typeForm, color: e.target.value })}
                  className="w-full mt-1 bg-muted/40 border border-border rounded-xl p-2.5 text-xs focus:outline-none"
                >
                  <option value="blue">Blue</option>
                  <option value="amber">Amber</option>
                  <option value="purple">Purple</option>
                  <option value="emerald">Emerald</option>
                  <option value="rose">Rose</option>
                  <option value="indigo">Indigo</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-muted-foreground">Description</label>
              <input
                type="text"
                placeholder="e.g. Cushioned chair, footrest, warm lighting"
                value={typeForm.description}
                onChange={(e) => setTypeForm({ ...typeForm, description: e.target.value })}
                className="w-full mt-1 bg-muted/40 border border-border rounded-xl p-2.5 text-xs focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowAddTypeModal(false);
                  setEditTypeTarget(null);
                }}
                className="flex-1 py-2.5 border border-border rounded-xl text-xs font-bold hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 shadow-md shadow-blue-600/20"
              >
                {editTypeTarget ? 'Save Changes' : 'Create Seat Type'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Seat Type Confirmation */}
      {deleteTypeTarget && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="text-center">
              <h3 className="font-bold text-base text-foreground">
                Remove "{deleteTypeTarget.name}"?
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {deleteTypeTarget.deskCount > 0
                  ? `This seat type is assigned to ${deleteTypeTarget.deskCount} desk(s). Deleting it will deactivate it so it no longer appears in filters or new desk creation.`
                  : 'This seat type will be permanently removed from all filters and shift pricing rules.'}
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setDeleteTypeTarget(null)}
                className="flex-1 py-2.5 border border-border rounded-xl text-xs font-bold hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteTypeMutation.mutate(deleteTypeTarget.id)}
                className="flex-1 py-2.5 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700"
              >
                Confirm Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

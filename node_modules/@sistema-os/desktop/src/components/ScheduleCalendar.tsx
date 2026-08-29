import React, { useState } from 'react';
import { Calendar as CalendarIcon, Clock, MapPin, User, Phone, CheckCircle, ChevronLeft, ChevronRight, X, Edit3, Trash2, ExternalLink } from 'lucide-react';
import { StatusBadge } from './Dashboard';
import { ConfirmModal } from './ConfirmModal';

interface ScheduleCalendarProps {
  isOpen?: boolean;
  onClose?: () => void;
  visits: any[];
  orders?: any[];
  selectedDate: string;
  onDateChange: (date: string) => void;
  onEditVisit?: (visit: any) => void;
  onDeleteVisit?: (visitId: string) => void;
  onOpenOS?: (order: any) => void;
}

export const ScheduleCalendar: React.FC<ScheduleCalendarProps> = ({
  isOpen = true,
  onClose,
  visits,
  orders = [],
  selectedDate,
  onDateChange,
  onEditVisit,
  onDeleteVisit,
  onOpenOS,
}) => {
  if (onClose && !isOpen) return null;
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [editingVisit, setEditingVisit] = useState<any | null>(null);
  const [deletingVisitId, setDeletingVisitId] = useState<string | null>(null);

  const [editForm, setEditForm] = useState({
    date: '',
    period: 'MANHA',
    technicianName: '',
    notes: '',
  });

  React.useEffect(() => {
    if (!isOpen || !onClose) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (editingVisit) {
          setEditingVisit(null);
        } else if (deletingVisitId) {
          setDeletingVisitId(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, editingVisit, deletingVisitId]);

  // Enriquece cada visita com os dados da OS correspondente caso não venha embutido
  const enrichedVisits = React.useMemo(() => {
    return visits.map((v) => {
      const order = v.order || orders.find((o) => o.id === v.orderId || o.code === v.orderId || o.code === v.orderCode);
      return {
        ...v,
        order: order || v.order || null,
        technicianName: v.technicianName || order?.technician || order?.technicianName || '',
      };
    });
  }, [visits, orders]);

  const filteredVisits = enrichedVisits.filter((v) => {
    if (!v.date) return false;
    const vDateClean = v.date.includes('T') ? v.date.split('T')[0] : v.date;
    if (startDate && endDate) {
      return vDateClean >= startDate && vDateClean <= endDate;
    }
    if (startDate) return vDateClean >= startDate;
    if (endDate) return vDateClean <= endDate;
    // Se não houver filtro por período, filtra estritamente pelo dia selecionado
    return vDateClean === selectedDate;
  });

  // Helper para gerar os 7 dias da semana atual sem deslocamento de fuso horário
  const getLocalDateStr = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const parseLocalDate = (dateStr: string) => {
    if (!dateStr) return new Date();
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d, 12, 0, 0);
  };

  // Helper para gerar o intervalo de dias dinamicamente
  const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  const shortNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  let daysToRender: Date[] = [];

  if (startDate && endDate) {
    const start = parseLocalDate(startDate);
    const end = parseLocalDate(endDate);
    let curr = new Date(start);
    while (curr <= end) {
      daysToRender.push(new Date(curr));
      curr.setDate(curr.getDate() + 1);
    }
  } else if (endDate) {
    const end = parseLocalDate(endDate);
    const start = new Date(end);
    start.setDate(end.getDate() - 6); // Exibe os 7 dias até a data 'Até'
    let curr = new Date(start);
    while (curr <= end) {
      daysToRender.push(new Date(curr));
      curr.setDate(curr.getDate() + 1);
    }
  } else if (startDate) {
    const start = parseLocalDate(startDate);
    let curr = new Date(start);
    for (let i = 0; i < 7; i++) {
      daysToRender.push(new Date(curr));
      curr.setDate(curr.getDate() + 1);
    }
  } else {
    const currentRefDate = parseLocalDate(selectedDate);
    const dayOfWeek = currentRefDate.getDay(); // 0 (Dom) a 6 (Sáb)
    const sunday = new Date(currentRefDate);
    sunday.setDate(currentRefDate.getDate() - dayOfWeek);
    for (let i = 0; i < 7; i++) {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      daysToRender.push(d);
    }
  }

  const weekDays = daysToRender.map((d) => {
    const dateStr = getLocalDateStr(d);
    const dayIdx = d.getDay();

    // Normaliza v.date e compara estritamente em formato YYYY-MM-DD
    const visitsCount = visits.filter((v) => {
      if (!v.date) return false;
      const vDateClean = v.date.includes('T') ? v.date.split('T')[0] : v.date;
      return vDateClean === dateStr;
    }).length;

    const isSelected = dateStr === selectedDate;
    return {
      dateStr,
      dayName: dayNames[dayIdx],
      shortName: shortNames[dayIdx],
      dayNum: d.getDate(),
      monthNum: d.getMonth() + 1,
      visitsCount,
      isSelected,
    };
  });

  // Ordena visitas do dia pelo horário exato
  const sortedVisits = [...filteredVisits].sort((a, b) => {
    const timeA = a.period || '00:00';
    const timeB = b.period || '00:00';
    return timeA.localeCompare(timeB);
  });

  const content = (
    <div className="space-y-4 font-sans text-xs">
      {/* Grade Semanal / Filtros */}
      <div className="bg-slate-100 border border-slate-300 rounded-xl p-3 space-y-3 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-300 pb-2.5">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-sky-100 text-sky-700 rounded-lg">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">Agenda Semanal & Diária de Agendamentos</h2>
              <p className="text-[11px] text-slate-600">Selecione o dia da semana para visualizar os horários agendados</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <label className="text-[11px] font-bold text-slate-700">Data Selecionada:</label>
              <input
                type="date"
                value={selectedDate}
                onClick={(e) => e.currentTarget.showPicker?.()}
                onChange={(e) => {
                  onDateChange(e.target.value);
                  setStartDate('');
                  setEndDate('');
                }}
                className="bg-white border border-slate-300 text-slate-900 rounded-lg px-2.5 py-1 text-xs font-bold focus:outline-none focus:border-sky-600 cursor-pointer shadow-2xs"
              />
            </div>

            <div className="h-4 w-px bg-slate-300 hidden sm:block" />

            <div className="flex items-center gap-1.5">
              <label className="text-[11px] font-bold text-slate-700">De:</label>
              <input
                type="date"
                value={startDate}
                onClick={(e) => e.currentTarget.showPicker?.()}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-white border border-slate-300 text-slate-900 rounded-lg px-2 py-1 text-xs font-bold focus:outline-none focus:border-sky-600 cursor-pointer shadow-2xs"
              />
              <label className="text-[11px] font-bold text-slate-700">Até:</label>
              <input
                type="date"
                value={endDate}
                onClick={(e) => e.currentTarget.showPicker?.()}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-white border border-slate-300 text-slate-900 rounded-lg px-2 py-1 text-xs font-bold focus:outline-none focus:border-sky-600 cursor-pointer shadow-2xs"
              />
            </div>

            {(startDate || endDate) && (
              <button
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                }}
                className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-2 py-1 rounded text-[10px] font-bold transition-all cursor-pointer border border-slate-300"
              >
                Limpar Filtro
              </button>
            )}
          </div>
        </div>

        {/* TABELA DE DIAS DA SEMANA */}
        <div>
          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            📅 Dias da Semana (Clique em um dia para ver os agendamentos)
          </span>
          <div className="grid grid-cols-7 gap-1.5">
            {weekDays.map((day) => (
              <button
                key={day.dateStr}
                onClick={() => {
                  onDateChange(day.dateStr);
                  setStartDate('');
                  setEndDate('');
                }}
                className={`p-2 rounded-xl border flex flex-col items-center justify-between transition-all cursor-pointer text-center relative ${day.isSelected
                  ? 'bg-sky-600 text-white border-sky-700 shadow-md ring-2 ring-sky-500/30 scale-[1.02]'
                  : day.visitsCount > 0
                    ? 'bg-amber-50 text-slate-900 border-amber-300 hover:bg-amber-100/80 font-bold'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
              >
                <span className="text-[10px] font-bold uppercase">{day.shortName}</span>
                <span className="text-sm font-black my-0.5">{day.dayNum}</span>

                {day.isSelected && day.visitsCount > 0 ? (
                  <span className="mt-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-400 text-slate-900 shadow-xs flex items-center gap-1">
                    📅 {day.visitsCount} {day.visitsCount === 1 ? 'Agendamento' : 'Agendamentos'}
                  </span>
                ) : day.isSelected ? (
                  <span className="mt-1 text-[9px] font-bold text-sky-100">Dia Selecionado</span>
                ) : day.visitsCount > 0 ? (
                  <span className="mt-1 text-[9px] font-bold text-amber-700 flex items-center gap-0.5">
                    ● {day.visitsCount} {day.visitsCount === 1 ? 'agendamento' : 'agendamentos'}
                  </span>
                ) : (
                  <span className="mt-1 text-[9px] opacity-40">Sem visitas</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grade Diária de Visitas por Horário */}
      <div className="bg-white border border-slate-300 rounded-xl p-4 shadow-xs">
        <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-slate-200">
          <Clock className="w-4 h-4 text-sky-700" />
          <h3 className="font-bold text-slate-800 text-sm">Visitas Programadas ({sortedVisits.length})</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {sortedVisits.map((visit) => (
            <VisitCard
              key={visit.id}
              visit={visit}
              onEdit={() => {
                setEditingVisit(visit);
                setEditForm({
                  date: visit.date || '',
                  period: visit.period || '08:00',
                  technicianName: visit.technicianName || 'Técnico Roberto',
                  notes: visit.notes || '',
                });
              }}
              onDelete={() => {
                if (confirm('Deseja realmente excluir este agendamento?')) {
                  if (onDeleteVisit) onDeleteVisit(visit.id);
                }
              }}
              onOpenOS={() => {
                if (visit.order && onOpenOS) {
                  onOpenOS(visit.order);
                }
              }}
            />
          ))}
        </div>

        {sortedVisits.length === 0 && (
          <div className="text-center py-10 border border-dashed border-slate-300 rounded-lg text-slate-400 text-xs">
            Nenhum agendamento cadastrado para este dia.
          </div>
        )}
      </div>

      {/* Modal de Edição Rápida do Agendamento */}
      {editingVisit && (
        <div className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-md shadow-2xl p-4 text-xs font-sans space-y-3 text-slate-800">
            <div className="flex justify-between items-center border-b border-slate-200 pb-2">
              <h3 className="font-bold text-sky-800 text-xs flex items-center gap-1.5">
                <Edit3 className="w-4 h-4 text-sky-600" /> Editar Agendamento - OS #{editingVisit.order?.code || 'OS'}
              </h3>
              <button onClick={() => setEditingVisit(null)} className="text-slate-400 hover:text-slate-700 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Data da Visita *</label>
              <input
                type="date"
                value={editForm.date}
                onClick={(e) => e.currentTarget.showPicker?.()}
                onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 font-bold focus:outline-none focus:border-sky-600"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Horário da Visita *</label>
              <input
                type="time"
                value={editForm.period}
                onClick={(e) => e.currentTarget.showPicker?.()}
                onChange={(e) => setEditForm({ ...editForm, period: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 font-bold focus:outline-none focus:border-sky-600 cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Técnico Responsável *</label>
              <select
                value={editForm.technicianName}
                onChange={(e) => setEditForm({ ...editForm, technicianName: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 font-bold focus:outline-none focus:border-sky-600 cursor-pointer"
              >
                <option value="Técnico Roberto">Técnico Roberto</option>
                <option value="Técnico Carlos">Técnico Carlos</option>
                <option value="Técnica Ana">Técnica Ana</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Observações do Agendamento</label>
              <textarea
                rows={3}
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 font-medium focus:outline-none focus:border-sky-600"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setEditingVisit(null)}
                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onEditVisit) {
                    onEditVisit({ id: editingVisit.id, ...editForm });
                  }
                  setEditingVisit(null);
                }}
                className="px-4 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold flex items-center gap-1 cursor-pointer shadow-xs"
              >
                <CheckCircle className="w-3.5 h-3.5" /> Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (onClose) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3">
        <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-7xl h-[94vh] flex flex-col shadow-2xl overflow-hidden font-sans">
          <div className="px-4 py-3 bg-slate-200 border-b border-slate-300 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-sky-700" />
              Agenda Diária & Semanal de Visitas Técnicas
            </h3>
            <button
              onClick={onClose}
              className="text-slate-600 hover:text-slate-900 p-1.5 rounded-lg transition-colors cursor-pointer hover:bg-slate-300/60"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-5 overflow-y-auto flex-1 bg-slate-50 text-slate-900 space-y-4">
            {content}
          </div>
        </div>
      </div>
    );
  }

  return content;
};

const VisitCard: React.FC<{
  visit: any;
  onEdit: () => void;
  onDelete: () => void;
  onOpenOS: () => void;
}> = ({ visit, onEdit, onDelete, onOpenOS }) => {
  const isExactTime = visit.period && visit.period.includes(':');

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3.5 hover:border-slate-400 transition-all shadow-2xs font-sans relative group">
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-sky-800 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded">
            {visit.order?.code || visit.orderCode || 'OS-----'}
          </span>
          <span className="text-xs font-bold text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-700" />
            {isExactTime ? `${visit.period}h` : visit.period || 'Horário a definir'}
          </span>
          {visit.order && (
            <button
              onClick={onOpenOS}
              className="bg-sky-50 hover:bg-sky-600 text-sky-700 hover:text-white px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer border border-sky-200"
              title="Abrir Ordem de Serviço"
            >
              <ExternalLink className="w-3 h-3" /> Abrir OS
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <StatusBadge status={visit.status || visit.order?.status} />
          <button
            onClick={onEdit}
            className="text-slate-400 hover:text-sky-600 p-1 rounded hover:bg-slate-100 transition-colors cursor-pointer"
            title="Editar Agendamento"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-slate-100 transition-colors cursor-pointer"
            title="Excluir Agendamento"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
        <User className="w-4 h-4 text-slate-500" />
        {visit.order?.client?.name || visit.clientName || 'Cliente'}
      </h4>

      {(visit.order?.client?.phone || visit.order?.client?.whatsapp || visit.clientPhone) && (
        <p className="text-xs text-slate-600 flex items-center gap-1 mt-1">
          <Phone className="w-3.5 h-3.5 text-slate-400" />
          {visit.order?.client?.phone || visit.order?.client?.whatsapp || visit.clientPhone}
        </p>
      )}

      <p className="text-xs text-slate-600 flex items-center gap-1 mt-1">
        <MapPin className="w-3.5 h-3.5 text-slate-400" />
        {[
          visit.order?.client?.address || visit.clientAddress,
          visit.order?.client?.number ? `nº ${visit.order.client.number}` : null,
          visit.order?.client?.neighborhood || null
        ].filter(Boolean).join(', ') || 'Endereço não informado'}
      </p>

      <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex justify-between items-center text-xs">
        <span className="text-slate-500">
          Equipamento:{' '}
          <strong className="text-slate-800">
            {typeof visit.order?.equipment === 'object' && visit.order?.equipment !== null
              ? [visit.order.equipment.type, visit.order.equipment.brand, visit.order.equipment.model].filter(Boolean).join(' - ')
              : String(visit.order?.equipment || visit.deviceType || 'Equipamento Geral')}
          </strong>
        </span>
        <span className="text-slate-500">
          Técnico:{' '}
          <strong className={visit.technicianName ? 'text-sky-700 font-bold' : 'text-slate-400'}>
            {visit.technicianName || 'Nenhum'}
          </strong>
        </span>
      </div>
    </div>
  );
};

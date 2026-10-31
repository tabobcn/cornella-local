// Generado al dividir App.jsx: pantallas "admin" (se cargan bajo demanda con React.lazy)
import { AlertCircle, ArrowLeft, ArrowRight, BarChart3, Calendar, Check, ChevronRight, Clock, Eye, FileText, Flag, Heart, Lightbulb, MessageCircle, MessageSquare, MousePointerClick, RefreshCw, Search, ShieldAlert, Star, Store, Trash2, TrendingUp, UserCheck, UserX, Users, X, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useEffect, useState } from 'react';
import {
  Navbar,
  VerificationDocumentCard,
  createPrivateSignedUrl,
  formatNeighborhood,
} from '../App.jsx';

const SignedVerificationImage = ({ documentRef, className, alt = '' }) => {
  const [signedUrl, setSignedUrl] = useState('');

  useEffect(() => {
    let active = true;
    createPrivateSignedUrl('verification-documents', documentRef)
      .then(url => { if (active) setSignedUrl(url || ''); })
      .catch(() => { if (active) setSignedUrl(''); });
    return () => { active = false; };
  }, [documentRef]);

  if (!signedUrl) {
    return <div className={`${className} bg-gray-100`} />;
  }

  return (
    <a href={signedUrl} target="_blank" rel="noopener noreferrer">
      <img src={signedUrl} alt={alt} className={className} />
    </a>
  );
};

// =====================================================
// PANEL DE ADMINISTRACIÓN
// =====================================================

// AdminUsersScreen - Lista de usuarios registrados con ban y delete
export const AdminUsersScreen = ({ onNavigate, showToast }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [confirmAction, setConfirmAction] = useState(null); // { type: 'delete'|'ban'|'unban', user }
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, email, created_at, is_admin, is_banned')
        .order('created_at', { ascending: false })
        .limit(500);
      setUsers(data || []);
      setLoading(false);
    };
    load();
  }, []);

  const handleBanToggle = async (user) => {
    setActionLoading(true);
    const newVal = !user.is_banned;
    const { error } = await supabase.from('profiles').update({ is_banned: newVal }).eq('id', user.id);
    if (error) {
      showToast('Error al actualizar', 'error');
    } else {
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_banned: newVal } : u));
      showToast(newVal ? `${user.full_name || 'Usuario'} baneado` : `${user.full_name || 'Usuario'} desbaneado`, 'success');
    }
    setActionLoading(false);
    setConfirmAction(null);
  };

  const handleDelete = async (user) => {
    setActionLoading(true);
    // Banear primero para bloquear login aunque el delete no elimine el auth user
    await supabase.from('profiles').update({ is_banned: true }).eq('id', user.id);
    const { error } = await supabase.from('profiles').delete().eq('id', user.id);
    if (error) {
      // Si el delete falla por FK, al menos queda baneado
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_banned: true } : u));
      showToast(`Cuenta desactivada (no se pudo eliminar completamente)`, 'warning');
    } else {
      setUsers(prev => prev.filter(u => u.id !== user.id));
      showToast(`Cuenta de ${user.full_name || user.email} eliminada`, 'success');
    }
    setActionLoading(false);
    setConfirmAction(null);
  };

  const filtered = users.filter(u => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (u.full_name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q);
  });

  return (
    <>
      <div className="mx-auto min-h-screen w-full max-w-md relative overflow-x-hidden shadow-2xl bg-gray-50">
        <header className="sticky top-0 z-30 bg-white border-b border-gray-100">
          <div className="flex items-center px-4 py-4">
            <button aria-label="Volver" onClick={() => onNavigate('admin-dashboard')} className="text-slate-800 flex size-10 shrink-0 items-center justify-center hover:bg-gray-100 rounded-full transition-colors">
              <ArrowLeft size={24} />
            </button>
            <div className="flex-1 text-center pr-10">
              <h2 className="text-slate-900 text-lg font-bold">Usuarios</h2>
              {!loading && <p className="text-xs text-gray-500">{filtered.length} de {users.length} registrados</p>}
            </div>
          </div>
          <div className="px-4 pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por nombre o email..."
                className="w-full h-10 pl-9 pr-4 rounded-xl border border-gray-200 bg-gray-50 text-sm text-slate-900 placeholder:text-gray-500 focus:border-primary focus:outline-none"
              />
            </div>
          </div>
        </header>

        <div className="p-4 pb-24 space-y-2">
          {loading ? (
            <div className="text-center text-gray-500 py-10">Cargando...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center text-gray-500 py-10">Sin resultados</div>
          ) : filtered.map(u => (
            <div key={u.id} className={`bg-white rounded-xl p-4 shadow-sm flex items-center gap-3 ${u.is_banned ? 'opacity-60 border border-red-200' : ''}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${u.is_banned ? 'bg-red-100 text-red-500' : 'bg-primary/10 text-primary'}`}>
                {u.is_banned ? <UserX size={18} /> : (u.full_name || u.email || '?')[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="font-semibold text-slate-800 text-sm truncate">{u.full_name || 'Sin nombre'}</p>
                  {u.is_admin && <span className="text-[10px] bg-primary/10 text-primary font-semibold px-1.5 py-0.5 rounded-full">Admin</span>}
                  {u.is_banned && <span className="text-[10px] bg-red-100 text-red-600 font-semibold px-1.5 py-0.5 rounded-full">Baneado</span>}
                </div>
                <p className="text-xs text-gray-500 truncate">{u.email}</p>
                <p className="text-[10px] text-gray-300">{new Date(u.created_at).toLocaleDateString('es-ES')}</p>
              </div>
              {!u.is_admin && (
                <div className="flex gap-1.5 shrink-0">
                  <button
                    onClick={() => setConfirmAction({ type: u.is_banned ? 'unban' : 'ban', user: u })}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${u.is_banned ? 'bg-green-50 text-green-600 hover:bg-green-100' : 'bg-amber-50 text-amber-600 hover:bg-amber-100'}`}
                    title={u.is_banned ? 'Desbanear' : 'Banear'}
                  >
                    {u.is_banned ? <UserCheck size={15} /> : <UserX size={15} />}
                  </button>
                  <button
                    onClick={() => setConfirmAction({ type: 'delete', user: u })}
                    className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 transition-colors"
                    title="Eliminar cuenta"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Modal confirmación */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto ${
              confirmAction.type === 'delete' ? 'bg-red-100' :
              confirmAction.type === 'ban' ? 'bg-amber-100' : 'bg-green-100'
            }`}>
              {confirmAction.type === 'delete' ? <Trash2 className="text-red-500" size={24} /> :
               confirmAction.type === 'ban' ? <UserX className="text-amber-600" size={24} /> :
               <UserCheck className="text-green-600" size={24} />}
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-slate-900 mb-1">
                {confirmAction.type === 'delete' ? '¿Eliminar cuenta?' :
                 confirmAction.type === 'ban' ? '¿Banear usuario?' : '¿Desbanear usuario?'}
              </h3>
              <p className="text-sm text-gray-600">
                {confirmAction.type === 'delete'
                  ? <>Se eliminará el perfil de <strong>{confirmAction.user.full_name || confirmAction.user.email}</strong> y todos sus datos. No se puede deshacer.</>
                  : confirmAction.type === 'ban'
                  ? <><strong>{confirmAction.user.full_name || confirmAction.user.email}</strong> no podrá acceder a la app.</>
                  : <>Se restaurará el acceso de <strong>{confirmAction.user.full_name || confirmAction.user.email}</strong>.</>}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmAction(null)}
                className="flex-1 h-12 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => confirmAction.type === 'delete' ? handleDelete(confirmAction.user) : handleBanToggle(confirmAction.user)}
                disabled={actionLoading}
                className={`flex-1 h-12 rounded-xl text-white font-semibold flex items-center justify-center gap-2 ${
                  confirmAction.type === 'delete' ? 'bg-red-600 hover:bg-red-700' :
                  confirmAction.type === 'ban' ? 'bg-amber-700 hover:bg-amber-800' : 'bg-green-700 hover:bg-green-800'
                }`}
              >
                {actionLoading ? <RefreshCw size={16} className="animate-spin" /> :
                 confirmAction.type === 'delete' ? 'Eliminar' :
                 confirmAction.type === 'ban' ? 'Banear' : 'Desbanear'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// AdminSupportScreen - Mensajes de soporte recibidos
export const AdminSupportScreen = ({ onNavigate }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('support_requests')
        .select('*')
        .order('created_at', { ascending: false });
      setMessages(data || []);
      setLoading(false);
    };
    load();
  }, []);

  const markResolved = async (id) => {
    await supabase.from('support_requests').update({ status: 'resolved' }).eq('id', id);
    setMessages(prev => prev.map(m => m.id === id ? { ...m, status: 'resolved' } : m));
  };

  const isNoBusinessMsg = (m) => m.subject?.startsWith('[SIN EMPRESAS]');

  const filtered = messages.filter(m => {
    if (filter === 'pending') return m.status !== 'resolved' && !isNoBusinessMsg(m);
    if (filter === 'no-business') return isNoBusinessMsg(m) && m.status !== 'resolved';
    if (filter === 'resolved') return m.status === 'resolved';
    return true;
  });

  const pendingCount = messages.filter(m => m.status !== 'resolved' && !isNoBusinessMsg(m)).length;
  const noBusinessCount = messages.filter(m => isNoBusinessMsg(m) && m.status !== 'resolved').length;

  const tabs = [
    { id: 'pending', label: 'Soporte', count: pendingCount },
    { id: 'no-business', label: 'Sin empresas', count: noBusinessCount },
    { id: 'resolved', label: 'Resueltos', count: messages.filter(m => m.status === 'resolved').length },
    { id: 'all', label: 'Todos', count: messages.length },
  ];

  return (
    <div className="mx-auto min-h-screen w-full max-w-md relative overflow-x-hidden shadow-2xl bg-gray-50">
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100">
        <div className="flex items-center px-4 py-4">
          <button aria-label="Volver" onClick={() => onNavigate('admin')} className="text-slate-800 flex size-10 shrink-0 items-center justify-center hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft size={24} />
          </button>
          <div className="flex-1 text-center pr-10">
            <h2 className="text-slate-900 text-lg font-bold">Soporte</h2>
            {!loading && (pendingCount + noBusinessCount) > 0 && (
              <p className="text-xs text-amber-600 font-medium">{pendingCount + noBusinessCount} sin resolver</p>
            )}
          </div>
        </div>
        <div className="flex gap-1.5 px-4 pb-3 overflow-x-auto no-scrollbar">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                filter === tab.id ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`text-[10px] font-bold px-1.5 rounded-full ${
                  filter === tab.id ? 'bg-white/25 text-white' :
                  tab.id === 'no-business' ? 'bg-orange-100 text-orange-600' : 'bg-gray-200 text-gray-600'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </header>
      <div className="p-4 space-y-3">
        {loading ? (
          <div className="text-center text-gray-500 py-10">Cargando...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-gray-500 py-10">No hay mensajes en este filtro</div>
        ) : filtered.map(m => {
          const isNoBiz = isNoBusinessMsg(m);
          return (
            <div key={m.id} className={`bg-white rounded-xl p-4 shadow-sm border-l-4 ${
              m.status === 'resolved' ? 'border-green-400 opacity-60' : isNoBiz ? 'border-orange-400' : 'border-blue-400'
            }`}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-slate-800 text-sm">{m.name}</p>
                    {isNoBiz && <span className="text-[10px] bg-orange-100 text-orange-600 font-bold px-1.5 py-0.5 rounded-full">SIN EMPRESAS</span>}
                  </div>
                  <p className="text-xs text-gray-500 truncate">{m.email}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                  m.status === 'resolved' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'
                }`}>
                  {m.status === 'resolved' ? 'Resuelto' : 'Pendiente'}
                </span>
              </div>
              {isNoBiz
                ? <p className="text-xs font-semibold text-orange-600 mb-1">{m.subject?.replace('[SIN EMPRESAS] ', '')}</p>
                : m.subject && <p className="text-xs font-semibold text-primary mb-1">{m.subject}</p>
              }
              <p className="text-sm text-gray-600 leading-relaxed mb-3">{m.message}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-300">{new Date(m.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                {m.status !== 'resolved' && (
                  <button onClick={() => markResolved(m.id)} className="text-xs bg-green-700 text-white px-3 py-1 rounded-lg hover:bg-green-800 transition-colors">
                    Marcar resuelto
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// AdminDashboard - Panel principal de administración
export const AdminDashboard = ({ onNavigate, user }) => {
  const [stats, setStats] = useState({
    pendingBusinesses: 0,
    pendingReports: 0,
    pendingSupport: 0,
    totalUsers: 0,
    totalBusinesses: 0,
    activeOffers: 0,
    activeJobs: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        // Los 7 contadores son independientes entre sí: se lanzan en paralelo
        // (antes iban en serie, 7 viajes encadenados a Supabase)
        const [
          { count: pendingBiz },   // Negocios pendientes
          { count: pendingRep },   // Reportes pendientes
          { count: totalUsr },     // Total usuarios
          { count: totalBiz },     // Total negocios
          { count: activeOff },    // Ofertas activas
          { count: activeJb },     // Empleos activos
          { count: pendingSupp },  // Soporte pendiente
        ] = await Promise.all([
          supabase
            .from('businesses')
            .select('*', { count: 'exact', head: true })
            .eq('verification_status', 'pending'),
          supabase
            .from('reports')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending'),
          supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true }),
          supabase
            .from('businesses')
            .select('*', { count: 'exact', head: true }),
          supabase
            .from('offers')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'active'),
          supabase
            .from('jobs')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'active'),
          supabase
            .from('support_requests')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending'),
        ]);

        setStats({
          pendingBusinesses: pendingBiz || 0,
          pendingReports: pendingRep || 0,
          pendingSupport: pendingSupp || 0,
          totalUsers: totalUsr || 0,
          totalBusinesses: totalBiz || 0,
          activeOffers: activeOff || 0,
          activeJobs: activeJb || 0,
        });
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  const quickActions = [
    {
      id: 'approve-businesses',
      title: 'Aprobar Negocios',
      description: `${stats.pendingBusinesses} pendientes`,
      icon: Store,
      color: 'blue',
      badge: stats.pendingBusinesses,
      route: 'admin-approve-businesses'
    },
    {
      id: 'reports',
      title: 'Ver Reportes',
      description: `${stats.pendingReports} sin revisar`,
      icon: Flag,
      color: 'red',
      badge: stats.pendingReports,
      route: 'admin-reports'
    },
    {
      id: 'users',
      title: 'Usuarios',
      description: `${stats.totalUsers} registrados`,
      icon: Users,
      color: 'green',
      route: 'admin-users'
    },
    {
      id: 'support',
      title: 'Soporte',
      description: stats.pendingSupport > 0 ? `${stats.pendingSupport} sin resolver` : 'Sin mensajes nuevos',
      icon: MessageCircle,
      color: 'purple',
      badge: stats.pendingSupport,
      route: 'admin-support'
    },
  ];

  return (
    <div className="mx-auto min-h-screen w-full max-w-md relative overflow-x-hidden shadow-2xl bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-gradient-to-r from-primary to-blue-700 px-4 py-6 pb-8">
        <button
          onClick={() => onNavigate('profile')}
          className="mb-4 flex items-center gap-2 text-white/80 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
          <span className="text-sm">Volver al perfil</span>
        </button>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
            <ShieldAlert className="text-white" size={28} />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">Panel de Admin</h1>
            <p className="text-white/80 text-sm">{user?.email}</p>
          </div>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="px-4 -mt-4 mb-6">
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => onNavigate('admin-all-businesses')}
            className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md active:scale-[0.98] transition-all text-left"
          >
            <div className="text-2xl font-bold text-primary">{stats.totalBusinesses}</div>
            <div className="text-xs text-gray-500 mt-1">Negocios</div>
            <div className="text-[10px] text-primary mt-1 font-medium">Ver todos →</div>
          </button>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="text-2xl font-bold text-slate-900">{stats.totalUsers}</div>
            <div className="text-xs text-gray-500 mt-1">Usuarios</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="text-2xl font-bold text-slate-900">{stats.activeOffers}</div>
            <div className="text-xs text-gray-500 mt-1">Ofertas activas</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="text-2xl font-bold text-slate-900">{stats.activeJobs}</div>
            <div className="text-xs text-gray-500 mt-1">Empleos activos</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-4 pb-24">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Acciones Rápidas</h2>
        <div className="space-y-3">
          {quickActions.map(action => {
            const colorClasses = {
              blue: 'bg-blue-100 text-blue-600',
              red: 'bg-red-100 text-red-600',
              green: 'bg-green-100 text-green-600',
              purple: 'bg-purple-100 text-purple-600'
            };

            return (
              <button
                key={action.id}
                onClick={() => onNavigate(action.route)}
                className="w-full bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all active:scale-[0.98] flex items-center gap-4"
              >
                <div className={`w-12 h-12 rounded-xl ${colorClasses[action.color]} flex items-center justify-center shrink-0 relative`}>
                  <action.icon size={24} />
                  {action.badge > 0 && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                      {action.badge > 99 ? '99+' : action.badge}
                    </div>
                  )}
                </div>
                <div className="flex-1 text-left">
                  <div className="font-semibold text-slate-900">{action.title}</div>
                  <div className="text-sm text-gray-500">{action.description}</div>
                </div>
                <ChevronRight className="text-gray-500" size={20} />
              </button>
            );
          })}
        </div>
      </div>

      {/* Navbar */}
      <Navbar currentPage="profile" onNavigate={onNavigate} />
    </div>
  );
};

// AdminAllBusinessesScreen - Lista completa de negocios con opción de eliminar
export const AdminAllBusinessesScreen = ({ onNavigate, showToast }) => {
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null); // business a eliminar

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from('businesses')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(500);

        if (filter !== 'all') query = query.eq('verification_status', filter);

        const { data, error } = await query;
        if (error) throw error;
        setBusinesses(data || []);
      } catch (error) {
        console.error('Error cargando negocios (admin):', error);
        showToast('Error al cargar negocios', 'error');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [filter]);

  const handleDelete = async (business) => {
    setDeletingId(business.id);
    try {
      // Borrado por fases: dentro de cada fase no hay dependencias de FK,
      // así que van en paralelo. Antes eran ~10 viajes encadenados; ahora 4.

      // Fase 1 — obtener IDs de ofertas y empleos (independientes entre sí)
      const [{ data: offerIds }, { data: jobIds }] = await Promise.all([
        supabase.from('offers').select('id').eq('business_id', business.id),
        supabase.from('jobs').select('id').eq('business_id', business.id),
      ]);
      const oIds = (offerIds || []).map(o => o.id);
      const jIds = (jobIds || []).map(j => j.id);

      // Fase 2 — hijos de offers/jobs + tablas que solo cuelgan de businesses
      await Promise.all([
        ...(oIds.length > 0 ? [
          supabase.from('offer_redemptions').delete().in('offer_id', oIds),
          supabase.from('offer_fires').delete().in('offer_id', oIds),
        ] : []),
        ...(jIds.length > 0 ? [
          supabase.from('job_applications').delete().in('job_id', jIds),
        ] : []),
        supabase.from('reviews').delete().eq('business_id', business.id),
        supabase.from('favorites').delete().eq('business_id', business.id),
        supabase.from('notifications').delete().eq('data->>business_id', String(business.id)),
      ]);

      // Fase 3 — ya sin hijos que los referencien
      await Promise.all([
        supabase.from('offers').delete().eq('business_id', business.id),
        supabase.from('jobs').delete().eq('business_id', business.id),
      ]);

      // Fase 4 — el negocio, cuando nada le apunta
      const { error } = await supabase.from('businesses').delete().eq('id', business.id);
      if (error) throw error;
      setBusinesses(prev => prev.filter(b => b.id !== business.id));
      showToast(`"${business.name}" eliminado`, 'success');
    } catch (err) {
      console.error('Error eliminando negocio:', err);
      showToast('Error al eliminar el negocio', 'error');
    } finally {
      setDeletingId(null);
      setConfirmDelete(null);
    }
  };

  const statusBadge = (status, isPublished) => {
    if (status === 'approved' && isPublished) return <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full">Publicado</span>;
    if (status === 'approved') return <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">Aprobado</span>;
    if (status === 'pending') return <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">Pendiente</span>;
    if (status === 'rejected') return <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-full">Rechazado</span>;
    if (status === 'draft') return <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-bold rounded-full">Borrador (sin enviar)</span>;
    return null;
  };

  const filtered = businesses.filter(b =>
    b.name?.toLowerCase().includes(search.toLowerCase()) ||
    b.category?.toLowerCase().includes(search.toLowerCase()) ||
    b.neighborhood?.toLowerCase().includes(search.toLowerCase())
  );

  const filters = [
    { key: 'all', label: 'Todos' },
    { key: 'approved', label: 'Aprobados' },
    { key: 'pending', label: 'Pendientes' },
    { key: 'rejected', label: 'Rechazados' },
  ];

  return (
    <>
      <div className="mx-auto min-h-screen w-full max-w-md bg-gray-50">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-100 px-4 py-4">
          <div className="flex items-center gap-3 mb-3">
            <button aria-label="Volver" onClick={() => onNavigate('admin-dashboard')} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
              <ArrowLeft size={20} className="text-gray-700" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Todos los Negocios</h1>
              <p className="text-xs text-gray-500">{filtered.length} de {businesses.length}</p>
            </div>
          </div>
          {/* Buscador */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre, categoría, barrio..."
              className="w-full h-10 pl-9 pr-4 rounded-xl border border-gray-200 bg-gray-50 text-sm text-slate-900 placeholder:text-gray-500 focus:outline-none focus:border-primary"
            />
          </div>
          {/* Filtros */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {filters.map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  filter === f.key ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </header>

        {/* Lista */}
        <div className="p-4 pb-24 space-y-3">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-2/3 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-1/3" />
              </div>
            ))
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <Store size={40} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">No hay negocios</p>
            </div>
          ) : (
            filtered.map(business => (
              <div key={business.id} className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-bold text-slate-900 truncate">{business.name}</h3>
                      {statusBadge(business.verification_status, business.is_published)}
                    </div>
                    <p className="text-xs text-gray-500 truncate">
                      {business.category}{business.neighborhood ? ` · ${formatNeighborhood(business.neighborhood)}` : ''}
                    </p>
                    <p className="text-[10px] text-gray-500 mt-1">
                      ID: {business.id} · Creado: {new Date(business.created_at).toLocaleDateString('es-ES')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => onNavigate('business', { id: business.id })}
                      className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-colors"
                      title="Ver negocio"
                    >
                      <Eye size={15} />
                    </button>
                    <button
                      onClick={() => setConfirmDelete(business)}
                      disabled={deletingId === business.id}
                      className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 transition-colors disabled:opacity-50"
                      title="Eliminar negocio"
                    >
                      {deletingId === business.id
                        ? <RefreshCw size={14} className="animate-spin" />
                        : <Trash2 size={15} />}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal confirmación eliminar */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <Trash2 className="text-red-500" size={24} />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-slate-900 mb-1">¿Eliminar negocio?</h3>
              <p className="text-sm text-gray-600">
                Se eliminará <strong>"{confirmDelete.name}"</strong> y todos sus datos (ofertas, empleos, reseñas, candidaturas). Esta acción no se puede deshacer.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 h-12 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="flex-1 h-12 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// BusinessApprovalScreen - Aprobar/rechazar negocios
export const BusinessApprovalScreen = ({ onNavigate, user, showToast }) => {
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [showDocumentsModal, setShowDocumentsModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadBusinesses();
  }, [filter]);

  const loadBusinesses = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('businesses')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (filter === 'pending') {
        query = query.eq('verification_status', 'pending').is('appeal_message', null);
      } else if (filter === 'appeals') {
        query = query.eq('verification_status', 'pending').not('appeal_message', 'is', null);
      }

      const { data, error } = await query;
      if (error) throw error;

      setBusinesses(data || []);
    } catch (error) {
      console.error('Error cargando negocios (admin):', error);
      showToast('Error al cargar negocios', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openApproveModal = (business) => {
    setSelectedBusiness(business);
    setShowApproveModal(true);
  };

  const handleApprove = async () => {
    if (!selectedBusiness) return;
    setActionLoading(true);
    try {
      const { data, error } = await supabase
        .from('businesses')
        .update({
          verification_status: 'approved',
          is_verified: true,
          is_published: true,
          verified_at: new Date().toISOString(),
          verified_by: user.id
        })
        .eq('id', selectedBusiness.id)
        .select('id');

      if (error) throw error;
      if (!data || data.length === 0) throw new Error('Sin permisos. Ejecuta el script SQL de políticas RLS para admin.');

      showToast(`✅ ${selectedBusiness.name} aprobado`, 'success');
      setShowApproveModal(false);
      setSelectedBusiness(null);
      loadBusinesses();
    } catch (error) {
      console.error('Error aprobando negocio:', error);
      showToast('Error al aprobar el negocio. Inténtalo de nuevo.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedBusiness) return;

    setActionLoading(true);
    try {
      const newRejectionCount = (selectedBusiness.rejection_count || 0) + 1;

      // Update core fields
      const { data, error } = await supabase
        .from('businesses')
        .update({
          verification_status: 'rejected',
          verification_notes: rejectReason || 'Rechazado por el administrador',
        })
        .eq('id', selectedBusiness.id)
        .select('id');

      if (error) throw error;
      if (!data || data.length === 0) throw new Error('Sin permisos. Ejecuta el script SQL de políticas RLS para admin.');

      // Update new fields (may fail if schema cache not updated yet)
      await supabase.from('businesses').update({
        rejection_reason: rejectReason || 'No cumple los requisitos.',
        rejection_count: newRejectionCount,
      }).eq('id', selectedBusiness.id).then(() => {}).catch(() => {});

      showToast(`${selectedBusiness.name} rechazado. El propietario ha sido notificado`, 'info');
      setShowRejectModal(false);
      setRejectReason('');
      setSelectedBusiness(null);
      loadBusinesses();
    } catch (error) {
      showToast('Error al rechazar el negocio', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const openDocumentsModal = (business) => {
    setSelectedBusiness(business);
    setShowDocumentsModal(true);
  };

  const openRejectModal = (business) => {
    setSelectedBusiness(business);
    setShowRejectModal(true);
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-md relative overflow-x-hidden shadow-2xl bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100 px-4 py-4">
        <button
          onClick={() => onNavigate('admin-dashboard')}
          className="mb-3 flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={20} />
          <span className="text-sm">Panel Admin</span>
        </button>
        <h1 className="text-xl font-bold text-slate-900">Aprobar Negocios</h1>
      </header>

      {/* Filters */}
      <div className="px-4 py-3 bg-white border-b border-gray-100 flex gap-2">
        <button
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'pending'
              ? 'bg-primary text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Pendientes
        </button>
        <button
          onClick={() => setFilter('appeals')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
            filter === 'appeals'
              ? 'bg-amber-700 text-white'
              : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
          }`}
        >
          <RefreshCw size={13} />
          Apelaciones
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'all'
              ? 'bg-primary text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Todos
        </button>
      </div>

      {/* Content */}
      <div className="px-4 py-6 pb-24">
        {loading ? (
          <div className="text-center py-12">
            <RefreshCw className="animate-spin mx-auto mb-3 text-primary" size={32} />
            <p className="text-gray-500">Cargando negocios...</p>
          </div>
        ) : businesses.length === 0 ? (
          <div className="text-center py-12">
            <Store className="mx-auto mb-3 text-gray-300" size={48} />
            <p className="text-gray-500">No hay negocios {filter === 'pending' ? 'pendientes' : ''}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {businesses.map(business => {
              const hasDocuments = business.verification_documents && business.verification_documents.length > 0;
              const isAppeal = business.rejection_count > 0 && business.appeal_message;
              const wasRejected = business.rejection_count > 0;

              return (
                <div key={business.id} className={`bg-white rounded-xl p-4 shadow-sm border-2 transition-all ${
                  isAppeal ? 'border-amber-300 bg-amber-50/30' :
                  wasRejected && business.verification_status === 'rejected' ? 'border-red-200 bg-red-50/20' :
                  'border-transparent hover:border-primary/20'
                }`}>
                  <div className="flex gap-3 mb-3">
                    <div className="w-16 h-16 rounded-lg bg-gray-200 shrink-0 overflow-hidden">
                      {business.cover_photo && (
                        <img src={business.cover_photo} alt={business.name} loading="lazy" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-slate-900 truncate">{business.name}</h3>
                        {hasDocuments && (
                          <div className="flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                            <FileText size={12} />
                            <span className="text-[10px] font-bold">{business.verification_documents.length}</span>
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 truncate">{business.address}</p>
                      <p className="text-xs text-gray-500">{business.subcategory}</p>
                    </div>
                  </div>

                  {business.tags && business.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {business.tags.slice(0, 3).map((tag, idx) => (
                        <span key={idx} className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded">
                          {tag}
                        </span>
                      ))}
                      {business.tags.length > 3 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                          +{business.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Status Badge */}
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <div className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                      isAppeal ? 'bg-amber-100 text-amber-800' :
                      business.verification_status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      business.verification_status === 'approved' ? 'bg-green-100 text-green-700' :
                      business.verification_status === 'draft' ? 'bg-gray-100 text-gray-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {isAppeal ? '🔄 Apelación enviada' :
                       business.verification_status === 'pending' ? '⏳ Pendiente' :
                       business.verification_status === 'approved' ? '✅ Aprobado' :
                       business.verification_status === 'draft' ? '📝 Borrador (sin enviar)' :
                       '❌ Rechazado'}
                    </div>

                    {wasRejected && (
                      <div className="inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
                        ↩ Rechazado {business.rejection_count}x
                      </div>
                    )}

                    {hasDocuments && (
                      <div className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
                        🏅 Verificación Oficial
                      </div>
                    )}
                  </div>

                  {/* Documents Button */}
                  {hasDocuments && (
                    <button
                      onClick={() => openDocumentsModal(business)}
                      className="w-full mb-3 py-2 px-3 bg-blue-50 text-blue-700 rounded-lg font-medium text-sm hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
                    >
                      <FileText size={16} />
                      Ver {business.verification_documents.length} documento(s) de verificación
                    </button>
                  )}

                  {/* Action Buttons */}
                  {business.verification_status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => openApproveModal(business)}
                        disabled={actionLoading}
                        className="flex-1 h-10 bg-green-700 text-white rounded-lg font-medium hover:bg-green-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {actionLoading ? (
                          <RefreshCw size={16} className="animate-spin" />
                        ) : (
                          <>
                            <Check size={16} />
                            Aprobar
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => openRejectModal(business)}
                        disabled={actionLoading}
                        className="flex-1 h-10 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        <X size={16} />
                        Rechazar
                      </button>
                    </div>
                  )}

                  {/* Historial de rechazos y apelación */}
                  {(business.rejection_count > 0 || business.appeal_message) && (
                    <div className="mt-3 space-y-2">
                      {business.rejection_reason && (
                        <div className="p-3 bg-red-50 rounded-lg border border-red-100">
                          <div className="flex items-center gap-1.5 mb-1">
                            <XCircle size={13} className="text-red-600" />
                            <p className="text-xs font-semibold text-red-900">
                              Último rechazo {business.rejection_count > 1 ? `(${business.rejection_count}ª vez)` : ''}:
                            </p>
                          </div>
                          <p className="text-xs text-red-700">{business.rejection_reason}</p>
                        </div>
                      )}
                      {business.appeal_message && (
                        <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                          <div className="flex items-center gap-1.5 mb-1">
                            <MessageSquare size={13} className="text-amber-700" />
                            <p className="text-xs font-semibold text-amber-900">Apelación del propietario:</p>
                          </div>
                          <p className="text-xs text-amber-800">{business.appeal_message}</p>
                          {business.appeal_images?.length > 0 && (
                            <div className="flex gap-2 mt-2">
                              {business.appeal_images.map((url, i) => (
                                <SignedVerificationImage
                                  key={i}
                                  documentRef={url}
                                  alt={`Apelación ${i + 1}`}
                                  className="w-16 h-16 object-cover rounded-lg border border-amber-200"
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Confirmar Aprobación */}
      {showApproveModal && selectedBusiness && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 bg-black/60">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-green-100 p-2.5 rounded-full">
                <Check size={22} className="text-green-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Aprobar negocio</h3>
                <p className="text-xs text-slate-500">{selectedBusiness.name}</p>
              </div>
            </div>
            <div className={`rounded-xl p-3 mb-5 ${selectedBusiness.verification_documents?.length > 0 ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
              <p className={`text-sm ${selectedBusiness.verification_documents?.length > 0 ? 'text-green-700' : 'text-amber-700'}`}>
                {selectedBusiness.verification_documents?.length > 0
                  ? '✅ Este negocio recibirá el badge de Verificación Oficial'
                  : '⚠️ Se aprobará sin verificación oficial (sin documentos)'}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowApproveModal(false); setSelectedBusiness(null); }}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleApprove}
                disabled={actionLoading}
                className="flex-1 py-3 rounded-xl bg-green-700 text-white font-semibold text-sm hover:bg-green-800 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {actionLoading ? <RefreshCw size={16} className="animate-spin" /> : <Check size={16} />}
                {actionLoading ? 'Aprobando...' : 'Aprobar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Ver Documentos */}
      {showDocumentsModal && selectedBusiness && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden shadow-2xl animate-slide-up">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <FileText className="text-white" size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{selectedBusiness.name}</h3>
                  <p className="text-xs text-white/80">Documentos de verificación</p>
                </div>
              </div>
              <button aria-label="Cerrar"
                onClick={() => {
                  setShowDocumentsModal(false);
                  setSelectedBusiness(null);
                }}
                className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
              >
                <X className="text-white" size={18} />
              </button>
            </div>

            {/* Documents List */}
            <div className="p-6 overflow-y-auto max-h-[calc(85vh-80px)]">
              {selectedBusiness.verification_documents && selectedBusiness.verification_documents.length > 0 ? (
                <div className="space-y-4">
                  {selectedBusiness.verification_documents.map((docUrl, index) => (
                    <VerificationDocumentCard
                      key={`${docUrl}-${index}`}
                      documentRef={docUrl}
                      index={index}
                      layout="large"
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="mx-auto mb-3 text-gray-300" size={48} />
                  <p className="text-gray-500">No hay documentos subidos</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Rechazar Negocio */}
      {showRejectModal && selectedBusiness && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-slide-up">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-4 rounded-t-2xl">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <AlertCircle size={22} />
                Rechazar Negocio
              </h3>
              <p className="text-sm text-white/80 mt-1">{selectedBusiness.name}</p>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">
                ¿Por qué motivo rechazas este negocio? El propietario recibirá esta nota.
              </p>

              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Ejemplo: Los documentos no son legibles, falta CIF, información incompleta..."
                className="w-full h-32 px-4 py-3 rounded-xl border border-gray-200 resize-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all text-sm"
              />

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectReason('');
                    setSelectedBusiness(null);
                  }}
                  disabled={actionLoading}
                  className="flex-1 h-11 px-4 rounded-xl border-2 border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-all disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleReject}
                  disabled={actionLoading || !rejectReason.trim()}
                  className="flex-1 h-11 px-4 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {actionLoading ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      Rechazando...
                    </>
                  ) : (
                    <>
                      <X size={16} />
                      Rechazar
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navbar */}
      <Navbar currentPage="profile" onNavigate={onNavigate} />
    </div>
  );
};

// BusinessAnalyticsScreen - Estadísticas avanzadas para propietarios
export const BusinessAnalyticsScreen = ({ onNavigate, user, businessData }) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [dailyStats, setDailyStats] = useState([]);
  const [hourlyStats, setHourlyStats] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState(7); // 7, 30 días

  useEffect(() => {
    if (businessData?.id) {
      loadAnalytics();
    }
  }, [businessData?.id, selectedPeriod]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      // 1. Stats generales
      const { data: statsData, error: statsError } = await supabase
        .rpc('get_business_stats', {
          p_business_id: businessData.id,
          p_days: selectedPeriod
        });

      if (statsError) throw statsError;
      setStats(statsData?.[0] || {});

      // 2. Stats diarias
      const { data: dailyData, error: dailyError } = await supabase
        .rpc('get_daily_stats', {
          p_business_id: businessData.id,
          p_days: selectedPeriod
        });

      if (dailyError) throw dailyError;
      setDailyStats(dailyData || []);

      // 3. Distribución por hora
      const { data: hourlyData, error: hourlyError } = await supabase
        .rpc('get_hourly_distribution', {
          p_business_id: businessData.id,
          p_days: selectedPeriod
        });

      if (hourlyError) throw hourlyError;
      setHourlyStats(hourlyData || []);

    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calcular max para normalizar gráficos
  const maxDailyViews = Math.max(...dailyStats.map(d => parseInt(d.views || 0)), 1);
  const maxHourlyViews = Math.max(...hourlyStats.map(h => parseInt(h.view_count || 0)), 1);

  return (
    <div className="mx-auto min-h-screen w-full max-w-md relative overflow-x-hidden shadow-2xl bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-6 shadow-lg">
        <button
          onClick={() => onNavigate('owner-dashboard')}
          className="mb-3 flex items-center gap-2 text-white/80 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
          <span className="text-sm font-medium">Panel</span>
        </button>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
            <BarChart3 className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Estadísticas</h1>
            <p className="text-sm text-white/80">{businessData?.name}</p>
          </div>
        </div>

        {/* Period Selector */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setSelectedPeriod(7)}
            className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-all ${
              selectedPeriod === 7
                ? 'bg-white text-indigo-600 shadow-lg'
                : 'bg-white/20 text-white hover:bg-white/30'
            }`}
          >
            7 días
          </button>
          <button
            onClick={() => setSelectedPeriod(30)}
            className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-all ${
              selectedPeriod === 30
                ? 'bg-white text-indigo-600 shadow-lg'
                : 'bg-white/20 text-white hover:bg-white/30'
            }`}
          >
            30 días
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="px-4 py-6 pb-24 space-y-6">
        {loading ? (
          <div className="text-center py-12">
            <RefreshCw className="animate-spin mx-auto mb-3 text-indigo-600" size={32} />
            <p className="text-gray-500">Cargando estadísticas...</p>
          </div>
        ) : (
          <>
            {/* Métricas Principales */}
            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <TrendingUp className="text-indigo-600" size={20} />
                Resumen General
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {/* Vistas */}
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4 shadow-lg">
                  <div className="flex items-center justify-between mb-2">
                    <Eye className="text-white/80" size={20} />
                    <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                      <TrendingUp className="text-white" size={14} />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-white mb-1">
                    {parseInt(stats?.total_views || 0).toLocaleString('es-ES')}
                  </p>
                  <p className="text-xs text-white/80">Vistas totales</p>
                  <p className="text-[10px] text-white/60 mt-1">
                    ~{parseFloat(stats?.avg_daily_views || 0).toFixed(1)}/día
                  </p>
                </div>

                {/* Clics */}
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-4 shadow-lg">
                  <div className="flex items-center justify-between mb-2">
                    <MousePointerClick className="text-white/80" size={20} />
                    <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                      <ArrowRight className="text-white" size={14} />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-white mb-1">
                    {parseInt(stats?.total_clicks || 0).toLocaleString('es-ES')}
                  </p>
                  <p className="text-xs text-white/80">Clics en contacto</p>
                  <p className="text-[10px] text-white/60 mt-1">
                    {stats?.total_views > 0
                      ? `${((stats.total_clicks / stats.total_views) * 100).toFixed(1)}% tasa de clic`
                      : 'Sin datos'}
                  </p>
                </div>

                {/* Favoritos */}
                <div className="bg-gradient-to-br from-red-500 to-pink-600 rounded-2xl p-4 shadow-lg">
                  <div className="flex items-center justify-between mb-2">
                    <Heart className="text-white/80 fill-white/80" size={20} />
                    <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                      <Star className="text-white fill-white" size={14} />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-white mb-1">
                    {parseInt(stats?.total_favorites || 0).toLocaleString('es-ES')}
                  </p>
                  <p className="text-xs text-white/80">Nuevos favoritos</p>
                  <p className="text-[10px] text-white/60 mt-1">
                    {stats?.total_views > 0
                      ? `${((stats.total_favorites / stats.total_views) * 100).toFixed(1)}% conversión`
                      : 'Sin datos'}
                  </p>
                </div>

                {/* Visitantes únicos */}
                <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl p-4 shadow-lg">
                  <div className="flex items-center justify-between mb-2">
                    <Users className="text-white/80" size={20} />
                    <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                      <UserCheck className="text-white" size={14} />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-white mb-1">
                    {parseInt(stats?.unique_visitors || 0).toLocaleString('es-ES')}
                  </p>
                  <p className="text-xs text-white/80">Visitantes únicos</p>
                  <p className="text-[10px] text-white/60 mt-1">
                    {stats?.unique_visitors > 0 && stats?.total_views > 0
                      ? `${(stats.total_views / stats.unique_visitors).toFixed(1)} vistas/usuario`
                      : 'Sin datos'}
                  </p>
                </div>
              </div>
            </section>

            {/* Gráfico de Vistas Diarias */}
            {dailyStats.length > 0 && (
              <section>
                <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Calendar className="text-indigo-600" size={20} />
                  Tendencia Diaria
                </h2>
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                  <div className="space-y-3">
                    {dailyStats.slice(0, 7).reverse().map((day, index) => {
                      const views = parseInt(day.views || 0);
                      const percentage = (views / maxDailyViews) * 100;
                      const date = new Date(day.date);
                      const dayName = date.toLocaleDateString('es-ES', { weekday: 'short' });
                      const dayNum = date.getDate();

                      return (
                        <div key={index} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-gray-700 w-12">
                              {dayName.charAt(0).toUpperCase() + dayName.slice(1)} {dayNum}
                            </span>
                            <span className="font-bold text-indigo-600">{views}</span>
                          </div>
                          <div className="w-full h-6 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                              style={{ width: `${Math.max(percentage, 2)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            )}

            {/* Horarios Pico */}
            {hourlyStats.length > 0 && (
              <section>
                <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Clock className="text-indigo-600" size={20} />
                  Horarios Más Visitados
                </h2>
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                  <div className="flex items-end justify-between gap-1 h-40">
                    {Array.from({ length: 24 }, (_, i) => {
                      const hourData = hourlyStats.find(h => h.hour === i);
                      const count = parseInt(hourData?.view_count || 0);
                      const percentage = maxHourlyViews > 0 ? (count / maxHourlyViews) * 100 : 0;
                      const isPeak = count > 0 && percentage > 60;

                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                          <div className="relative w-full h-full flex items-end">
                            <div
                              className={`w-full rounded-t transition-all duration-300 ${
                                isPeak
                                  ? 'bg-gradient-to-t from-amber-500 to-orange-500'
                                  : 'bg-gradient-to-t from-indigo-400 to-indigo-500'
                              }`}
                              style={{ height: `${Math.max(percentage, count > 0 ? 10 : 0)}%` }}
                            >
                              {count > 0 && (
                                <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-bold text-gray-700">
                                  {count}
                                </div>
                              )}
                            </div>
                          </div>
                          <span className={`text-[9px] font-medium ${
                            isPeak ? 'text-amber-600' : 'text-gray-500'
                          }`}>
                            {i}h
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-4 flex items-center justify-center gap-4 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-gradient-to-t from-amber-500 to-orange-500" />
                      <span className="text-gray-600">Horarios pico</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-gradient-to-t from-indigo-400 to-indigo-500" />
                      <span className="text-gray-600">Normal</span>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Tips */}
            <section className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-5 border border-blue-100">
              <h3 className="text-sm font-bold text-indigo-900 mb-3 flex items-center gap-2">
                <Lightbulb className="text-amber-500" size={18} />
                Consejos para mejorar
              </h3>
              <ul className="space-y-2 text-xs text-indigo-800">
                <li className="flex items-start gap-2">
                  <Check className="text-green-500 mt-0.5 flex-shrink-0" size={14} />
                  <span>Publica ofertas en horarios pico para mayor visibilidad</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="text-green-500 mt-0.5 flex-shrink-0" size={14} />
                  <span>Actualiza tus fotos regularmente para atraer más clientes</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="text-green-500 mt-0.5 flex-shrink-0" size={14} />
                  <span>Responde rápido a presupuestos para aumentar conversión</span>
                </li>
              </ul>
            </section>

            {/* Empty State */}
            {!stats?.total_views && (
              <div className="text-center py-12">
                <BarChart3 className="mx-auto mb-3 text-gray-300" size={64} />
                <p className="text-gray-500 mb-2 font-medium">Aún no hay datos suficientes</p>
                <p className="text-sm text-gray-500">
                  Las estadísticas aparecerán cuando los usuarios visiten tu negocio
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Navbar */}
      <Navbar currentPage="profile" onNavigate={onNavigate} />
    </div>
  );
};

// ReportsScreen - Gestionar reportes/quejas
export const ReportsScreen = ({ onNavigate, user, showToast }) => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');

  useEffect(() => {
    loadReports();
  }, [filter]);

  const loadReports = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('reports')
        .select(`
          *,
          profiles!reports_user_id_fkey(full_name, email),
          businesses(name, address)
        `)
        .order('created_at', { ascending: false })
        .limit(200);

      if (filter === 'pending') {
        query = query.eq('status', 'pending');
      }

      const { data, error } = await query;
      if (error) throw error;

      setReports(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (reportId) => {
    try {
      const { error } = await supabase
        .from('reports')
        .update({
          status: 'resolved',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', reportId);

      if (error) throw error;

      showToast('Reporte marcado como resuelto', 'success');
      loadReports();
    } catch (error) {
      showToast('Error al resolver el reporte', 'error');
    }
  };

  const handleDismiss = async (reportId) => {
    try {
      const { error } = await supabase
        .from('reports')
        .update({
          status: 'dismissed',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', reportId);

      if (error) throw error;

      showToast('Reporte desestimado', 'success');
      loadReports();
    } catch (error) {
      showToast('Error al desestimar el reporte', 'error');
    }
  };

  const reportTypeLabels = {
    false_tags: 'Tags falsos',
    wrong_price: 'Precio incorrecto',
    bad_hours: 'Horarios incorrectos',
    fake_info: 'Información falsa',
    inappropriate: 'Contenido inapropiado',
    other: 'Otro'
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-md relative overflow-x-hidden shadow-2xl bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100 px-4 py-4">
        <button
          onClick={() => onNavigate('admin-dashboard')}
          className="mb-3 flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={20} />
          <span className="text-sm">Panel Admin</span>
        </button>
        <h1 className="text-xl font-bold text-slate-900">Reportes de Usuarios</h1>
      </header>

      {/* Filters */}
      <div className="px-4 py-3 bg-white border-b border-gray-100 flex gap-2">
        <button
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            filter === 'pending' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'
          }`}
        >
          Pendientes
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            filter === 'all' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'
          }`}
        >
          Todos
        </button>
      </div>

      {/* Content */}
      <div className="px-4 py-6 pb-24">
        {loading ? (
          <div className="text-center py-12">
            <RefreshCw className="animate-spin mx-auto mb-3 text-primary" size={32} />
            <p className="text-gray-500">Cargando reportes...</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-12">
            <Flag className="mx-auto mb-3 text-gray-300" size={48} />
            <p className="text-gray-500">No hay reportes {filter === 'pending' ? 'pendientes' : ''}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map(report => (
              <div key={report.id} className="bg-white rounded-xl p-4 shadow-sm">
                {/* Header */}
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                    <Flag className="text-red-600" size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <button
                      onClick={() => onNavigate('business', { id: report.business_id })}
                      className="font-bold text-primary text-sm hover:underline text-left"
                    >
                      {report.businesses?.name} →
                    </button>
                    <p className="text-xs text-gray-500">{report.businesses?.address}</p>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-medium ${
                    report.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    report.status === 'resolved' ? 'bg-green-100 text-green-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {report.status === 'pending' ? 'Pendiente' :
                     report.status === 'resolved' ? 'Resuelto' :
                     'Desestimado'}
                  </div>
                </div>

                {/* Type */}
                <div className="mb-2">
                  <span className="inline-block px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded">
                    {reportTypeLabels[report.report_type] || report.report_type}
                  </span>
                </div>

                {/* Message */}
                <p className="text-sm text-gray-700 mb-3 bg-gray-50 p-3 rounded-lg">
                  "{report.message}"
                </p>

                {/* Reporter */}
                <p className="text-xs text-gray-500 mb-3">
                  Reportado por: {report.profiles?.full_name || report.profiles?.email || 'Usuario'}
                </p>

                {/* Actions */}
                {report.status === 'pending' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleResolve(report.id)}
                      className="flex-1 h-9 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-800"
                    >
                      ✅ Resolver
                    </button>
                    <button
                      onClick={() => handleDismiss(report.id)}
                      className="flex-1 h-9 bg-gray-500 text-white rounded-lg text-sm font-medium hover:bg-gray-600"
                    >
                      Desestimar
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Navbar */}
      <Navbar currentPage="profile" onNavigate={onNavigate} />
    </div>
  );
};


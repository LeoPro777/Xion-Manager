import React, { useState, useEffect, useMemo } from 'react';
import {
  ShoppingBag, Search, Filter, RefreshCw, Eye, Printer, RotateCcw,
  DollarSign, Receipt, CreditCard, AlertCircle, CheckCircle2, X,
  Clock, Calendar, User, FileText, Check, ArrowRight
} from 'lucide-react';
import { api, Sale, SaleItem, SalePayment } from '../services/api';

export const SalesPage: React.FC = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'COMPLETED' | 'REFUNDED'>('ALL');
  const [bannerMsg, setBannerMsg] = useState<{ text: string; type: 'success' | 'warning' | 'error' } | null>(null);

  // Modal Detalle
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);

  // Modal Ticket Térmico
  const [ticketData, setTicketData] = useState<any | null>(null);
  const [loadingTicket, setLoadingTicket] = useState<boolean>(false);

  // Modal Reembolso
  const [saleToRefund, setSaleToRefund] = useState<Sale | null>(null);
  const [refundReason, setRefundReason] = useState<string>('');
  const [restockItems, setRestockItems] = useState<boolean>(true);
  const [isRefunding, setIsRefunding] = useState<boolean>(false);

  const showToast = (text: string, type: 'success' | 'warning' | 'error') => {
    setBannerMsg({ text, type });
    setTimeout(() => setBannerMsg(null), 5000);
  };

  const loadSales = async () => {
    setLoading(true);
    try {
      const data = await api.getSales(search, statusFilter === 'ALL' ? undefined : statusFilter);
      setSales(data);
    } catch (err: any) {
      showToast(err.message || 'Error al cargar las ventas', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSales();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadSales();
  };

  const handleViewDetail = async (sale: Sale) => {
    setSelectedSale(sale);
    setLoadingDetail(true);
    try {
      const detail = await api.getSaleDetail(sale.id);
      setSelectedSale(detail);
    } catch (err: any) {
      showToast(err.message || 'Error al obtener detalle', 'error');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleViewTicket = async (saleId: string) => {
    setLoadingTicket(true);
    try {
      const ticket = await api.getSaleTicket(saleId);
      setTicketData(ticket);
    } catch (err: any) {
      showToast(err.message || 'Error al generar ticket', 'error');
    } finally {
      setLoadingTicket(false);
    }
  };

  const handleConfirmRefund = async () => {
    if (!saleToRefund) return;
    if (!refundReason.trim()) {
      showToast('Por favor escribe el motivo del reembolso', 'warning');
      return;
    }
    setIsRefunding(true);
    try {
      await api.refundSale(saleToRefund.id, {
        reason: refundReason,
        restock_items: restockItems
      });
      showToast(`Venta #${saleToRefund.invoice_number || saleToRefund.id.slice(0, 8)} reembolsada exitosamente`, 'success');
      setSaleToRefund(null);
      setRefundReason('');
      loadSales();
    } catch (err: any) {
      showToast(err.message || 'Error al procesar el reembolso', 'error');
    } finally {
      setIsRefunding(false);
    }
  };

  // KPIs
  const stats = useMemo(() => {
    let totalUsd = 0;
    let totalBs = 0;
    let creditUsd = 0;
    let validCount = 0;

    sales.forEach(s => {
      if (s.status !== 'refunded') {
        totalUsd += Number(s.total_amount_usd || 0);
        totalBs += Number(s.total_amount_bs || 0);
        validCount++;
        if (s.payments) {
          s.payments.forEach(p => {
            if (p.payment_method_id.toUpperCase().includes('CREDIT')) {
              creditUsd += Number(p.amount_usd || 0);
            }
          });
        }
      }
    });

    const avgTicket = validCount > 0 ? totalUsd / validCount : 0;
    return { totalUsd, totalBs, creditUsd, avgTicket, count: sales.length };
  }, [sales]);

  const filteredSales = useMemo(() => {
    if (!search.trim()) return sales;
    const term = search.toLowerCase();
    return sales.filter(s =>
      (s.invoice_number && s.invoice_number.toLowerCase().includes(term)) ||
      (s.client_name && s.client_name.toLowerCase().includes(term)) ||
      (s.id && s.id.toLowerCase().includes(term))
    );
  }, [sales, search]);

  return (
    <div className="space-y-6">
      {/* Banner de Notificación */}
      {bannerMsg && (
        <div className={`p-4 rounded-xl flex items-center justify-between border ${
          bannerMsg.type === 'success' ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300' :
          bannerMsg.type === 'warning' ? 'bg-amber-950/40 border-amber-500/30 text-amber-300' :
          'bg-rose-950/40 border-rose-500/30 text-rose-300'
        }`}>
          <div className="flex items-center gap-3">
            {bannerMsg.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <AlertCircle className="w-5 h-5" />}
            <span className="text-sm font-medium">{bannerMsg.text}</span>
          </div>
          <button onClick={() => setBannerMsg(null)} className="opacity-70 hover:opacity-100 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShoppingBag className="w-7 h-7 text-cyan-400" />
            Ventas y Facturación
          </h1>
          <p className="text-sm text-slate-400">
            Monitoreo en tiempo real, desglose split-tender multimoneda, tickets térmicos y notas de entrega
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadSales}
            disabled={loading}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl flex items-center gap-2 text-sm font-medium border border-slate-700 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>
      </div>

      {/* KPIs Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Ventas Totales USD</span>
            <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-white">${stats.totalUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <p className="text-xs text-slate-500 mt-1">{stats.count} transacciones registradas</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total en Bolívares</span>
            <div className="p-2 bg-cyan-500/10 rounded-xl text-cyan-400">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-white">Bs. {stats.totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <p className="text-xs text-slate-500 mt-1">Conversión automática por tasa oficial</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Ventas a Crédito (CxC)</span>
            <div className="p-2 bg-amber-500/10 rounded-xl text-amber-400">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-white">${stats.creditUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <p className="text-xs text-slate-500 mt-1">Cargos asentados al libro de clientes</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Ticket Promedio</span>
            <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-white">${stats.avgTicket.toFixed(2)}</span>
            <p className="text-xs text-slate-500 mt-1">Promedio por venta completada</p>
          </div>
        </div>
      </div>

      {/* Controles y Filtros */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por N° factura o cliente..."
            className="w-full bg-slate-950 border border-slate-800 pl-10 pr-4 py-2 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
          />
        </form>

        <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800 self-stretch sm:self-auto overflow-x-auto">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              statusFilter === 'ALL' ? 'bg-cyan-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Todas
          </button>
          <button
            onClick={() => setStatusFilter('COMPLETED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              statusFilter === 'COMPLETED' ? 'bg-cyan-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Completadas
          </button>
          <button
            onClick={() => setStatusFilter('REFUNDED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              statusFilter === 'REFUNDED' ? 'bg-cyan-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Reembolsadas
          </button>
        </div>
      </div>

      {/* Tabla de Ventas */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/50 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <th className="py-3.5 px-4">Factura #</th>
                <th className="py-3.5 px-4">Fecha / Hora</th>
                <th className="py-3.5 px-4">Cliente</th>
                <th className="py-3.5 px-4">Formas de Pago</th>
                <th className="py-3.5 px-4 text-right">Total USD</th>
                <th className="py-3.5 px-4 text-right">Total Bs.</th>
                <th className="py-3.5 px-4 text-center">Estado</th>
                <th className="py-3.5 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-cyan-400" />
                    Cargando ventas registradas...
                  </td>
                </tr>
              ) : filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    No se encontraron ventas para los criterios seleccionados.
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3.5 px-4 font-mono font-medium text-cyan-400">
                      {sale.invoice_number || sale.id.slice(0, 8)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 text-xs">
                      {sale.created_at ? new Date(sale.created_at).toLocaleString('es-VE', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-white">
                      {sale.client_name || 'Cliente Final'}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1.5 max-w-xs">
                        {sale.payments && sale.payments.length > 0 ? (
                          sale.payments.map((p, idx) => (
                            <span
                              key={idx}
                              className={`text-[11px] px-2 py-0.5 rounded-md font-medium border ${
                                p.payment_method_id.toUpperCase().includes('CREDIT')
                                  ? 'bg-amber-950/40 border-amber-600/30 text-amber-300'
                                  : 'bg-slate-800 border-slate-700 text-slate-300'
                              }`}
                            >
                              {p.payment_method_label || p.payment_method_id}: ${Number(p.amount_usd).toFixed(2)}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-500">Efectivo USD</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-emerald-400">
                      ${Number(sale.total_amount_usd).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-300 font-mono text-xs">
                      Bs. {Number(sale.total_amount_bs).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                        sale.status === 'completed'
                          ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                          : sale.status === 'refunded'
                          ? 'bg-rose-950/40 border-rose-500/30 text-rose-300'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}>
                        {sale.status === 'completed' ? 'Completada' : sale.status === 'refunded' ? 'Reembolsada' : sale.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleViewDetail(sale)}
                          title="Ver Detalle"
                          className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-lg transition"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleViewTicket(sale.id)}
                          title="Ver Ticket Térmico"
                          className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        {sale.status !== 'refunded' && (
                          <button
                            onClick={() => {
                              setSaleToRefund(sale);
                              setRefundReason('');
                            }}
                            title="Reembolsar / Anular"
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Detalle de Venta */}
      {selectedSale && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-cyan-400" />
                  Detalle de Venta #{selectedSale.invoice_number || selectedSale.id.slice(0, 8)}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  ID Transacción: <span className="font-mono">{selectedSale.id}</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedSale(null)}
                className="text-slate-400 hover:text-white p-1.5 hover:bg-slate-800 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              {/* Información General */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800/80">
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Cliente</span>
                  <p className="text-sm font-medium text-white truncate">{selectedSale.client_name || 'Cliente Final'}</p>
                </div>
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Fecha</span>
                  <p className="text-sm font-medium text-white">
                    {selectedSale.created_at ? new Date(selectedSale.created_at).toLocaleDateString('es-VE') : '—'}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Tasa de Cambio</span>
                  <p className="text-sm font-medium text-cyan-400 font-mono">
                    {Number(selectedSale.exchange_rate).toFixed(2)} Bs/$
                  </p>
                </div>
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Estado</span>
                  <p className="text-sm font-medium text-emerald-400 capitalize">{selectedSale.status}</p>
                </div>
              </div>

              {/* Ítems Vendidos */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Ítems de la Venta</h4>
                <div className="border border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 border-b border-slate-800 text-slate-400">
                      <tr>
                        <th className="py-2.5 px-3">Producto</th>
                        <th className="py-2.5 px-3 text-center">Cant.</th>
                        <th className="py-2.5 px-3 text-right">Precio USD</th>
                        <th className="py-2.5 px-3 text-right">Total USD</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {selectedSale.items && selectedSale.items.length > 0 ? (
                        selectedSale.items.map((it, idx) => (
                          <tr key={idx} className="hover:bg-slate-800/20">
                            <td className="py-2.5 px-3 text-white font-medium">{it.product_name}</td>
                            <td className="py-2.5 px-3 text-center text-slate-300 font-mono">{Number(it.quantity)}</td>
                            <td className="py-2.5 px-3 text-right text-slate-300 font-mono">${Number(it.unit_price_usd).toFixed(2)}</td>
                            <td className="py-2.5 px-3 text-right text-emerald-400 font-bold font-mono">${Number(it.total_price_usd).toFixed(2)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="py-4 text-center text-slate-500">
                            {selectedSale.items_count || 1} producto(s) vendido(s)
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Desglose Split-Tender */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Desglose de Pagos (Multi-Método)</h4>
                <div className="border border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 border-b border-slate-800 text-slate-400">
                      <tr>
                        <th className="py-2.5 px-3">Método de Pago</th>
                        <th className="py-2.5 px-3">Moneda</th>
                        <th className="py-2.5 px-3 text-right">Monto Nominal</th>
                        <th className="py-2.5 px-3 text-right">Contravalor USD</th>
                        <th className="py-2.5 px-3">Referencia</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {selectedSale.payments && selectedSale.payments.length > 0 ? (
                        selectedSale.payments.map((p, idx) => (
                          <tr key={idx} className="hover:bg-slate-800/20">
                            <td className="py-2.5 px-3 text-white font-medium">{p.payment_method_label || p.payment_method_id}</td>
                            <td className="py-2.5 px-3 text-slate-300">{p.currency}</td>
                            <td className="py-2.5 px-3 text-right text-slate-300 font-mono">{Number(p.amount_tendered).toFixed(2)}</td>
                            <td className="py-2.5 px-3 text-right text-emerald-400 font-bold font-mono">${Number(p.amount_usd).toFixed(2)}</td>
                            <td className="py-2.5 px-3 text-slate-400 font-mono">{p.reference_code || '—'}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-4 text-center text-slate-500">
                            Pago completo registrado
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totales */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex justify-between items-center">
                <span className="text-sm font-semibold text-white">Total Pagado:</span>
                <div className="text-right">
                  <div className="text-lg font-bold text-emerald-400 font-mono">
                    ${Number(selectedSale.total_amount_usd).toFixed(2)} USD
                  </div>
                  <div className="text-xs text-slate-400 font-mono">
                    Bs. {Number(selectedSale.total_amount_bs).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => handleViewTicket(selectedSale.id)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <Printer className="w-4 h-4 text-cyan-400" />
                Imprimir Ticket
              </button>
              <button
                onClick={() => setSelectedSale(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Ticket Térmico / Factura Digital */}
      {ticketData && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Printer className="w-4 h-4 text-emerald-400" />
                Ticket Térmico de Venta
              </h3>
              <button
                onClick={() => setTicketData(null)}
                className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 bg-white text-black font-mono text-xs overflow-y-auto max-h-[70vh]">
              {/* Encabezado */}
              <div className="text-center space-y-1 mb-4">
                <p className="font-bold text-sm uppercase">{ticketData.header?.business_name}</p>
                <p className="text-[11px]">RIF: {ticketData.header?.tax_id}</p>
                <p className="text-[10px] text-gray-600">{ticketData.header?.address}</p>
                <p className="text-[10px] text-gray-600">Tel: {ticketData.header?.phone}</p>
                <div className="border-b border-dashed border-gray-400 my-2" />
                <p className="font-bold">FACTURA #{ticketData.header?.invoice_number}</p>
                <p className="text-[10px]">Fecha: {ticketData.header?.date ? new Date(ticketData.header.date).toLocaleString('es-VE') : ''}</p>
                <p className="text-[10px]">Cliente: {ticketData.header?.client_name}</p>
                <div className="border-b border-dashed border-gray-400 my-2" />
              </div>

              {/* Ítems */}
              <div className="space-y-1 mb-3">
                {ticketData.items && ticketData.items.map((it: any, i: number) => (
                  <div key={i} className="flex justify-between text-[11px]">
                    <span className="truncate max-w-[180px]">{Number(it.quantity)}x {it.product_name}</span>
                    <span className="font-bold">${Number(it.total_price_usd).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="border-b border-dashed border-gray-400 my-2" />

              {/* Totales */}
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>${Number(ticketData.financials?.subtotal_usd || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>IVA (16%):</span>
                  <span>${Number(ticketData.financials?.tax_amount_usd || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm pt-1 border-t border-gray-300">
                  <span>TOTAL USD:</span>
                  <span>${Number(ticketData.financials?.total_usd || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-[11px] text-gray-700">
                  <span>TOTAL BS:</span>
                  <span>Bs. {Number(ticketData.financials?.total_bs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span>
                </div>
                <p className="text-[10px] text-gray-500 text-right">Tasa: {Number(ticketData.financials?.exchange_rate || 1).toFixed(2)} Bs/$</p>
              </div>

              <div className="border-b border-dashed border-gray-400 my-2" />

              {/* Pagos */}
              <div className="space-y-0.5 text-[10px]">
                <p className="font-bold uppercase">Formas de Pago:</p>
                {ticketData.payments && ticketData.payments.map((p: any, i: number) => (
                  <div key={i} className="flex justify-between text-gray-700">
                    <span>{p.payment_method_label || p.payment_method_id}:</span>
                    <span>${Number(p.amount_usd).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="border-b border-dashed border-gray-400 my-3" />

              <div className="text-center text-[10px] text-gray-600 space-y-1">
                <p>{ticketData.footer?.message}</p>
                {ticketData.footer?.delivery_note && (
                  <p className="font-bold">Nota de Entrega: {ticketData.footer.delivery_note}</p>
                )}
                <p className="text-[9px] text-gray-400">{ticketData.footer?.disclaimer}</p>
              </div>
            </div>

            <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow"
              >
                <Printer className="w-4 h-4" />
                Imprimir
              </button>
              <button
                onClick={() => setTicketData(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Reembolsar Venta */}
      {saleToRefund && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-rose-400" />
                Reembolsar Venta
              </h3>
              <button
                onClick={() => setSaleToRefund(null)}
                className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-4 bg-rose-950/20 border border-rose-500/20 rounded-xl text-xs text-rose-300">
                Estás a punto de anular la venta <span className="font-bold text-white">#{saleToRefund.invoice_number || saleToRefund.id.slice(0, 8)}</span> por un total de <span className="font-bold text-white">${Number(saleToRefund.total_amount_usd).toFixed(2)} USD</span>.
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Motivo de anulación / reembolso *
                </label>
                <textarea
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="Ej: Devolución de producto por defecto de fábrica, error en facturación..."
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-500 transition"
                />
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={restockItems}
                  onChange={(e) => setRestockItems(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 text-rose-600 focus:ring-rose-500 bg-slate-950"
                />
                Restituir productos al inventario físico (Kardex IN tipo RETURN)
              </label>
            </div>

            <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => setSaleToRefund(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmRefund}
                disabled={isRefunding}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow"
              >
                {isRefunding ? 'Procesando...' : 'Confirmar Reembolso'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

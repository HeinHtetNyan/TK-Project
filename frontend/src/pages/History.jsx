import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, CreditCard, ChevronDown, ChevronUp, Filter, Trash2, ArrowUpDown } from 'lucide-react';
import Layout from '../components/Layout';
import DropdownDatePicker from '../components/DropdownDatePicker';
import { voucherService, paymentService } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../context/LanguageContext';
import db from '../lib/db';
import { syncAll, cacheVouchers, cachePayments, loadCachedVouchers, loadCachedPayments } from '../services/syncService';

const History = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { t } = useLanguage();
  const customer = location.state?.customer || null;
  const [vouchers, setVouchers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedVoucher, setExpandedVoucher] = useState(null);
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' = newest first

  const now = new Date();
  const currentMonthStr = `${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [selectedDate, setSelectedDate] = useState(''); 

  const loadFromCache = useCallback(async () => {
    if (!customer) return;
    const [vData, pData] = await Promise.all([
      loadCachedVouchers(customer.client_id),
      loadCachedPayments(customer.client_id),
    ]);
    setVouchers(vData);
    setPayments(pData);
  }, [customer]);

  const fetchHistory = useCallback(async () => {
    if (!customer) return;
    const serverId = customer.server_id ?? (typeof customer.id === 'number' ? customer.id : null);

    if (!serverId || !navigator.onLine) {
      await loadFromCache();
      return;
    }

    setLoading(true);
    try {
      const [vRes, pRes] = await Promise.all([
        voucherService.getCustomerVouchers(serverId),
        paymentService.getCustomerPayments(serverId),
      ]);
      const serverVouchers = (vRes.data || []).map(v => ({ ...v, client_id: v.client_id ?? `server_${v.id}` }));
      const serverPayments = (pRes.data || []).map(p => ({ ...p, client_id: p.client_id ?? `server_${p.id}` }));
      setVouchers(serverVouchers);
      setPayments(serverPayments);
      // Cache in background so history is viewable offline next time
      cacheVouchers(customer.client_id, vRes.data || []).catch(() => {});
      cachePayments(customer.client_id, pRes.data || []).catch(() => {});
    } catch (error) {
      console.error('Fetch history error:', error);
      await loadFromCache();
    } finally {
      setLoading(false);
    }
  }, [customer, loadFromCache]);

  useEffect(() => {
    if (!customer) {
      navigate('/');
    } else {
      fetchHistory();
    }
  }, [customer, navigate, fetchHistory]);

  const handleDeleteVoucher = async (e, item) => {
    e.stopPropagation();
    if (!window.confirm(t('are_you_sure_delete_voucher'))) return;

    const clientId = item.client_id;
    const serverId = item.server_id ?? (typeof item.id === 'number' ? item.id : null);

    // Pending item never reached the server — delete locally only
    if (!serverId) {
      await db.vouchers.delete(clientId).catch(() => {});
      await db.sync_queue.where('client_id').equals(clientId).delete().catch(() => {});
      setVouchers(prev => prev.filter(v => v.client_id !== clientId));
      return;
    }

    if (!navigator.onLine) {
      try {
        await db.transaction('rw', db.vouchers, db.sync_queue, async () => {
          await db.vouchers.delete(clientId);
          await db.sync_queue.add({
            client_id: clientId,
            type: 'voucher',
            action: 'delete',
            payload: { server_id: serverId },
            status: 'pending',
            retries: 0,
            created_at: new Date().toISOString(),
          });
        });
        syncAll();
      } catch {}
      setVouchers(prev => prev.filter(v => v.client_id !== clientId));
      return;
    }

    try {
      await voucherService.delete(serverId);
      db.vouchers.delete(clientId).catch(() => {});
      fetchHistory();
    } catch {
      alert(t('error_deleting_voucher'));
    }
  };

  const handleDeletePayment = async (item) => {
    if (!window.confirm(t('are_you_sure_delete_payment'))) return;

    const clientId = item.client_id;
    const serverId = item.server_id ?? (typeof item.id === 'number' ? item.id : null);

    if (!serverId) {
      await db.payments.delete(clientId).catch(() => {});
      await db.sync_queue.where('client_id').equals(clientId).delete().catch(() => {});
      setPayments(prev => prev.filter(p => p.client_id !== clientId));
      return;
    }

    if (!navigator.onLine) {
      try {
        await db.transaction('rw', db.payments, db.sync_queue, async () => {
          await db.payments.delete(clientId);
          await db.sync_queue.add({
            client_id: clientId,
            type: 'payment',
            action: 'delete',
            payload: { server_id: serverId },
            status: 'pending',
            retries: 0,
            created_at: new Date().toISOString(),
          });
        });
        syncAll();
      } catch {}
      setPayments(prev => prev.filter(p => p.client_id !== clientId));
      return;
    }

    try {
      await paymentService.delete(serverId);
      db.payments.delete(clientId).catch(() => {});
      fetchHistory();
    } catch {
      alert(t('error_deleting_payment'));
    }
  };

  const getMonthFromDate = (dateStr) => {
    if (!dateStr) return "";
    const parts = dateStr.split('-');
    return parts.length === 3 ? `${parts[1]}-${parts[2]}` : "";
  };

  const filteredData = [
    ...vouchers.map(v => ({ ...v, type: 'voucher' })),
    ...payments.map(p => ({ ...p, type: 'payment' }))
  ].filter(item => {
    const itemDate = item.type === 'voucher' ? item.voucher_date : item.payment_date;
    if (selectedDate) return itemDate === selectedDate;
    return getMonthFromDate(itemDate) === selectedMonth;
  }).sort((a, b) => {
    const aTime = new Date(a.created_at).getTime();
    const bTime = new Date(b.created_at).getTime();
    return sortOrder === 'desc' ? bTime - aTime : aTime - bTime;
  });

  const months = Array.from(new Set([
    ...vouchers.map(v => getMonthFromDate(v.voucher_date)),
    ...payments.map(p => getMonthFromDate(p.payment_date))
  ].filter(m => m !== ""))).sort().reverse();

  return (
    <Layout>
      <div className="space-y-4 pb-12 animate-in slide-in-from-right-4 duration-500">
        <header className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/', { state: { customer: customer } })} className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-100 transition-all">
              <ArrowLeft size={20} className="text-gray-600" />
            </button>
            <h2 className="text-xl font-black text-gray-800">{t('history')}</h2>
          </div>
          {customer && (
            <div className="bg-blue-50 px-3 py-1 rounded-xl border border-blue-100 text-right">
              <span className="text-[9px] font-black text-blue-400 uppercase block tracking-tighter leading-none mb-1">{t('customer')}</span>
              <p className="text-sm font-black text-blue-700 truncate max-w-[120px] leading-none">{customer.name}</p>
            </div>
          )}
        </header>

        <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase flex items-center gap-1">
              <Filter size={10} /> {t('monthly_group')}
            </label>
            <select 
              className="w-full p-2 bg-gray-50 border-2 border-gray-100 rounded-xl font-bold text-sm outline-none focus:border-blue-500"
              value={selectedMonth}
              onChange={(e) => { setSelectedMonth(e.target.value); setSelectedDate(''); }}
            >
              <option value={currentMonthStr}>{t('current')} ({currentMonthStr})</option>
              {months.filter(m => m !== currentMonthStr).map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <DropdownDatePicker 
            label={t('specific_date_search')} 
            value={selectedDate} 
            onChange={(val) => { setSelectedDate(val); if(val) setExpandedVoucher(null); }} 
          />
        </div>

        <div className="flex justify-end">
          <button
            onClick={() => setSortOrder(s => s === 'desc' ? 'asc' : 'desc')}
            className="flex items-center gap-1.5 text-[10px] font-black text-gray-500 bg-white px-3 py-1.5 rounded-xl shadow-sm border border-gray-100 hover:border-blue-200 hover:text-blue-600 transition-all"
          >
            <ArrowUpDown size={10} />
            {sortOrder === 'desc' ? t('newest_first') : t('oldest_first')}
          </button>
        </div>

        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-12 text-gray-400 font-bold text-sm uppercase tracking-widest animate-pulse">{t('refreshing_records')}</div>
          ) : filteredData.length > 0 ? (
            filteredData.map((item) => (
              <div key={`${item.type}-${item.id}`} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-in fade-in transition-all">
                {item.type === 'voucher' ? (
                  <>
                    <div 
                      onClick={() => setExpandedVoucher(expandedVoucher === item.id ? null : item.id)}
                      className="p-3 flex justify-between items-center cursor-pointer hover:bg-gray-50"
                    >
                      <div className="flex gap-3 items-center min-w-0">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                          <FileText size={18} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-gray-800 text-sm truncate">{item.voucher_number}</span>
                            <span className="text-[9px] bg-gray-100 px-1.5 py-0.5 rounded font-black text-gray-500 whitespace-nowrap">{item.voucher_date}</span>
                            {item.sync_status === 'pending' && (
                              <span className="text-[8px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded font-black uppercase">Pending</span>
                            )}
                            {item.paid_amount > 0 && item.payment_method && (
                              <span className={`text-[8px] px-1.5 py-0.5 rounded font-black uppercase ${
                                item.payment_method === 'KBZPAY' ? 'bg-blue-100 text-blue-600' : 
                                item.payment_method === 'BANK_TRANSFER' ? 'bg-purple-100 text-purple-600' : 
                                'bg-green-100 text-green-600'
                              }`}>
                                {item.payment_method === 'BANK_TRANSFER' ? 'BANK' : item.payment_method}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{item.items?.length || 0} {t('products')}</p>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-2">
                        <div className="hidden sm:block">
                          <span className="text-[9px] text-gray-400 font-black uppercase block tracking-tighter">{t('remaining')}</span>
                          <span className={`text-sm font-black ${item.remaining_balance > 0 ? 'text-red-500' : 'text-green-500'}`}>
                            {item.remaining_balance.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1 items-end sm:flex-row sm:items-center sm:gap-3 ml-2">
                           {isAdmin() && (
                             <button
                               onClick={(e) => handleDeleteVoucher(e, item)}
                               className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all order-2 sm:order-1"
                             >
                               <Trash2 size={16} />
                             </button>
                           )}
                           <div className="order-1 sm:order-2">
                             {expandedVoucher === item.id ? <ChevronUp size={16} className="text-gray-300" /> : <ChevronDown size={16} className="text-gray-300" />}
                           </div>
                        </div>
                      </div>
                    </div>
                    {expandedVoucher === item.id && (
                      <div className="bg-gray-50 p-3 border-t border-gray-100 space-y-3 animate-in slide-in-from-top-2">
                        {item.note && (
                          <div className="bg-blue-50/50 p-2 rounded-xl border border-blue-100/50">
                             <span className="text-[8px] font-black text-blue-400 uppercase block leading-none mb-1">{t('note')}</span>
                             <p className="text-xs font-bold text-blue-700 leading-tight italic">"{item.note}"</p>
                          </div>
                        )}
                        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                          <table className="w-full text-[10px] text-left">
                            <thead className="bg-gray-100 font-black text-gray-500 uppercase">
                              <tr><th className="p-2">{t('details')}</th><th className="p-2 text-right">{t('price')}</th><th className="p-2 text-right">{t('total')}</th></tr>
                            </thead>
                            <tbody className="font-bold text-gray-700">
                              {item.items?.map((it, idx) => (
                                <React.Fragment key={idx}>
                                  <tr className="border-t border-gray-100">
                                    <td className="p-2 align-top">
                                      <div className="text-blue-600">{it.lb} {t('weight_lb').split(' ')[1] || 'LB'} - {it.plastic_size} ({it.color})</div>
                                      <div className="mt-1 space-y-0.5">
                                        <div className="text-[9px] text-gray-500 uppercase flex justify-between">
                                          <span>{t('plastic')}: {it.lb} {t('weight_lb').split(' ')[1] || 'LB'} × {it.plastic_price} {t('price')}</span>
                                          <span className="font-black">{(it.lb * it.plastic_price).toLocaleString()}</span>
                                        </div>
                                        <div className="text-[9px] text-gray-500 uppercase flex justify-between border-b border-gray-50 pb-0.5">
                                          <span>{t('color')}: {it.lb} {t('weight_lb').split(' ')[1] || 'LB'} × {it.color_price} {t('price')}</span>
                                          <span className="font-black">{(it.lb * it.color_price).toLocaleString()}</span>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="p-2 text-right align-top text-gray-400 font-medium">
                                      {it.plastic_price + it.color_price}
                                    </td>
                                    <td className="p-2 text-right align-top text-blue-700 font-black">
                                      {(it.total_price || 0).toLocaleString()}
                                    </td>
                                  </tr>
                                </React.Fragment>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-[9px] font-black uppercase text-center">
                           <div className="bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
                              <span className="text-gray-400 block mb-1">{t('voucher_total')}</span>
                              <span className="text-gray-700 text-xs">{item.items_total.toLocaleString()}</span>
                           </div>
                           <div className="bg-white p-2 rounded-lg border border-orange-100 shadow-sm">
                              <span className="text-gray-400 block mb-1 tracking-tighter">{t('previous_balance')}</span>
                              <span className={`text-xs ${item.previous_balance > 0 ? 'text-orange-500' : 'text-gray-500'}`}>
                                {item.previous_balance.toLocaleString()}
                              </span>
                           </div>
                           <div className="bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
                              <span className="text-gray-400 block mb-1 tracking-tighter">{t('paid_at_site')}</span>
                              <span className="text-green-600 text-xs">{item.paid_amount.toLocaleString()}</span>
                           </div>
                        </div>
                        <div className={`flex items-center justify-between px-3 py-2 rounded-lg border text-[9px] font-black uppercase ${item.remaining_balance > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                           <span className="text-gray-500 tracking-widest">{t('overall_total')}</span>
                           <span className="text-[10px] flex items-center gap-1 text-gray-400 font-bold normal-case tracking-normal">
                             {item.items_total.toLocaleString()} + {item.previous_balance.toLocaleString()} − {item.paid_amount.toLocaleString()} =
                             <span className={`font-black text-sm ${item.remaining_balance > 0 ? 'text-red-500' : 'text-green-600'}`}>
                               {item.remaining_balance.toLocaleString()}
                             </span>
                           </span>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="p-3 flex justify-between items-center bg-white hover:bg-gray-50 group">
                    <div className="flex gap-3 items-center min-w-0">
                      <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                        <CreditCard size={18} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-green-700 text-sm">{t('direct_payment')}</span>
                          <span className="text-[9px] bg-gray-100 px-1.5 py-0.5 rounded font-black text-gray-500 whitespace-nowrap">{item.payment_date}</span>
                          {item.sync_status === 'pending' && (
                            <span className="text-[8px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded font-black uppercase">Pending</span>
                          )}
                          {item.payment_method && (
                            <span className={`text-[8px] px-1.5 py-0.5 rounded font-black uppercase ${
                              item.payment_method === 'KBZPAY' ? 'bg-blue-100 text-blue-600' : 
                              item.payment_method === 'BANK_TRANSFER' ? 'bg-purple-100 text-purple-600' : 
                              'bg-green-100 text-green-600'
                            }`}>
                              {item.payment_method === 'BANK_TRANSFER' ? 'BANK' : item.payment_method}
                            </span>
                          )}
                        </div>
                        {item.note && <p className="text-[10px] text-gray-500 italic truncate max-w-[150px]">"{item.note}"</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-[9px] text-gray-400 font-black uppercase block tracking-tighter leading-none mb-1">{t('amount_paid')}</span>
                        <span className="font-black text-green-600 text-base leading-none whitespace-nowrap">
                          {item.amount_paid.toLocaleString()}
                        </span>
                      </div>
                      {isAdmin() && (
                        <button 
                          onClick={() => handleDeletePayment(item)}
                          className="p-1.5 text-gray-200 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all group-hover:text-gray-300"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-gray-400 bg-white rounded-3xl border-2 border-dashed border-gray-100 text-sm font-bold animate-in zoom-in duration-300">
              {t('no_activity_found')}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default History;

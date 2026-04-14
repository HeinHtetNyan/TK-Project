import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Save as SaveIcon, ArrowLeft as ArrowLeftIcon, CreditCard as CreditCardIcon, Smartphone, Landmark, Banknote } from 'lucide-react';
import Layout from '../components/Layout';
import DropdownDatePicker from '../components/DropdownDatePicker';
import { customerService, paymentService } from '../services/api';
import BalanceDisplay from '../components/BalanceDisplay';

const Payment = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [customer] = useState(location.state?.customer || null);
  const [balance, setBalance] = useState(0);
  
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [paymentDate, setPaymentDate] = useState(new Date().toLocaleDateString('en-GB').split('/').join('-'));
  const [loading, setLoading] = useState(false);
  const [isBulk, setIsBulk] = useState(true);

  useEffect(() => {
    if (!customer) {
      navigate('/');
    } else {
      fetchBalance(customer.id);
    }
  }, [customer, navigate]);

  const fetchBalance = async (id) => {
    try {
      const response = await customerService.getBalance(id);
      setBalance(response.data.balance);
    } catch (error) {
      console.error(error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return alert('Enter a valid amount');
    
    setLoading(true);
    try {
      const paymentData = {
        customer_id: customer.id,
        amount_paid: parseFloat(amount),
        payment_method: paymentMethod,
        payment_date: paymentDate,
        note: note
      };

      if (isBulk) {
        await paymentService.createBulk(paymentData);
      } else {
        await paymentService.create(paymentData);
      }
      alert('Payment Saved Successfully!');
      navigate('/', { state: { customer: customer } });
    } catch (error) {
      alert('Error saving payment');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const paymentMethods = [
    { id: 'CASH', label: 'Cash', icon: Banknote, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', active: 'bg-green-600 text-white' },
    { id: 'KBZPAY', label: 'KBZPay', icon: Smartphone, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', active: 'bg-blue-600 text-white' },
    { id: 'BANK_TRANSFER', label: 'Bank', icon: Landmark, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200', active: 'bg-purple-600 text-white' },
  ];

  return (
    <Layout>
      <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
        <header className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-100 transition-all">
            <ArrowLeftIcon size={24} className="text-gray-600" />
          </button>
          <h2 className="text-2xl font-black text-gray-800">Add Payment</h2>
        </header>

        {customer && (
          <div className="space-y-6">
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
              <span className="text-xs font-bold text-gray-400 uppercase px-1">Customer</span>
              <p className="text-xl font-black text-blue-600 truncate">{customer.name}</p>
            </div>

            <BalanceDisplay balance={balance} label="Current Debt" />

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-black text-gray-600 uppercase px-1">Payment Amount</label>
                  <input
                    autoFocus
                    required
                    type="number"
                    className="w-full p-4 bg-green-50 border-2 border-green-100 rounded-2xl outline-none focus:border-green-500 transition-all text-3xl font-black text-green-700 text-center"
                    placeholder="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <DropdownDatePicker 
                    label="Payment Date" 
                    value={paymentDate} 
                    onChange={setPaymentDate} 
                  />

                  <div className="flex items-center justify-between bg-blue-50 p-4 rounded-2xl border-2 border-blue-100">
                    <div>
                      <span className="font-black text-blue-800 text-sm block">Settle Oldest Debts First (FIFO)</span>
                      <span className="text-[10px] font-bold text-blue-600 uppercase">Recommended for regular payments</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsBulk(!isBulk)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                        isBulk ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          isBulk ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-600 uppercase px-1">Payment Method</label>
                    <div className="grid grid-cols-3 gap-2">
                      {paymentMethods.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setPaymentMethod(m.id)}
                          className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all gap-1 ${
                            paymentMethod === m.id 
                              ? `${m.active} border-transparent shadow-md transform scale-105` 
                              : `bg-white border-gray-100 text-gray-400 hover:border-gray-200`
                          }`}
                        >
                          <m.icon size={20} />
                          <span className="text-[10px] font-black uppercase">{m.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-gray-600 uppercase px-1">Note (Optional)</label>
                    <textarea
                      className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl outline-none focus:border-blue-500 font-bold transition-all"
                      rows="2"
                      placeholder="e.g. Cash payment, Bank transfer..."
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                    ></textarea>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full p-5 rounded-3xl text-white text-xl font-black shadow-lg shadow-green-200 transition-all flex items-center justify-center gap-4 ${
                  loading ? 'bg-green-300' : 'bg-green-600 hover:bg-green-700 active:scale-95'
                }`}
              >
                <CreditCardIcon size={28} />
                {loading ? 'Saving...' : 'SAVE PAYMENT'}
              </button>
            </form>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Payment;

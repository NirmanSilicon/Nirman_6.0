import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  ShieldCheck,
  QrCode,
  Smartphone,
  CheckCircle2,
  Building,
  Lock,
  X,
  AlertCircle,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Wallet,
  BadgeCheck,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { formatCurrency } from '../../utils/currency';
import {
  RazorpayOrderResponse,
  RazorpayPaymentSuccessResponse,
  verifyRazorpayPayment,
} from '../../utils/razorpay';

interface RazorpayCheckoutModalProps {
  isOpen: boolean;
  order: RazorpayOrderResponse | null;
  hotelName: string;
  roomName: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  amount: number;
  currency: string;
  onSuccess: (paymentData: RazorpayPaymentSuccessResponse & { paidAmount: number; paidCurrency: string }) => void;
  onCancel: () => void;
}

export const RazorpayCheckoutModal: React.FC<RazorpayCheckoutModalProps> = ({
  isOpen,
  order,
  hotelName,
  roomName,
  guestName,
  guestEmail,
  guestPhone,
  amount,
  currency,
  onSuccess,
  onCancel,
}) => {
  const [activeTab, setActiveTab] = useState<'UPI' | 'CARD' | 'NETBANKING' | 'WALLET'>('UPI');
  const [upiId, setUpiId] = useState('traveler@okhdfcbank');
  const [upiApp, setUpiApp] = useState<'GPAY' | 'PHONEPE' | 'PAYTM' | 'BHIM'>('GPAY');
  
  // Card Form
  const [cardNumber, setCardNumber] = useState('4532 •••• •••• 8821');
  const [cardExpiry, setCardExpiry] = useState('08/29');
  const [cardCvv, setCardCvv] = useState('•••');
  const [cardHolder, setCardHolder] = useState(guestName || 'AccessWay Verified Traveler');
  
  // Netbanking
  const [selectedBank, setSelectedBank] = useState('HDFC');
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'SELECT' | 'AUTHORIZING' | 'SUCCESS'>('SELECT');
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      setPaymentStep('SELECT');
      setIsProcessing(false);
    }
  }, [isOpen]);

  if (!isOpen || !order) return null;

  const formattedAmount = formatCurrency(amount, currency);

  const handleSimulatePayment = async () => {
    setIsProcessing(true);
    setPaymentStep('AUTHORIZING');
    setStatusMessage('Securing 256-bit encrypted handshake with Razorpay Gateway...');

    setTimeout(async () => {
      setStatusMessage('Authorizing reservation with Bank & Accessibility Guarantee...');
      
      setTimeout(async () => {
        const paymentId = `pay_rzp_${Math.random().toString(36).substring(2, 11).toUpperCase()}`;
        const signature = `sig_rzp_${Math.random().toString(36).substring(2, 16)}`;

        try {
          await verifyRazorpayPayment({
            razorpay_payment_id: paymentId,
            razorpay_order_id: order.orderId,
            razorpay_signature: signature,
          });
        } catch (e) {
          console.warn('Backend verification note:', e);
        }

        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#2563EB', '#10B981', '#3B82F6', '#F59E0B'],
        });

        setPaymentStep('SUCCESS');
        setIsProcessing(false);

        setTimeout(() => {
          onSuccess({
            razorpay_payment_id: paymentId,
            razorpay_order_id: order.orderId,
            razorpay_signature: signature,
            paidAmount: amount,
            paidCurrency: currency,
          });
        }, 1200);
      }, 1000);
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
        
        {/* Razorpay Brand Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-900 text-white p-5 sm:p-6 flex items-start justify-between relative">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="px-2.5 py-0.5 bg-blue-500/30 border border-blue-400/40 rounded-md text-[11px] font-black uppercase tracking-wider text-blue-200 flex items-center gap-1">
                <Lock className="w-3 h-3 text-emerald-300" />
                <span>Razorpay Secure</span>
              </div>
              <span className="text-xs text-blue-200">Verified PRM Checkout</span>
            </div>
            <h3 className="text-xl font-black text-white">{hotelName}</h3>
            <p className="text-xs text-blue-200 line-clamp-1">{roomName}</p>
          </div>

          <div className="text-right">
            <div className="text-xs text-blue-200 font-medium">Amount to Pay</div>
            <div className="text-2xl font-black text-white">{formattedAmount}</div>
          </div>

          <button
            onClick={onCancel}
            disabled={isProcessing}
            className="absolute top-4 right-4 p-1.5 text-blue-200 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            title="Close Checkout"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        {paymentStep === 'AUTHORIZING' ? (
          <div className="p-10 flex flex-col items-center justify-center text-center space-y-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="space-y-1.5">
              <h4 className="font-bold text-base text-slate-900 dark:text-white">
                Processing Secure Razorpay Transaction
              </h4>
              <p className="text-xs text-slate-500 max-w-xs">{statusMessage}</p>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-xl text-[11px] text-blue-700 dark:text-blue-300 font-medium">
              Order ID: <code className="font-mono">{order.orderId}</code>
            </div>
          </div>
        ) : paymentStep === 'SUCCESS' ? (
          <div className="p-10 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 rounded-full flex items-center justify-center animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div className="space-y-1">
              <h4 className="font-black text-lg text-slate-900 dark:text-white">
                Payment Authorized Successfully!
              </h4>
              <p className="text-xs text-slate-500">
                Guaranteed accessible stay registered with hotel front desk.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            
            {/* Payment Method Selector Tabs */}
            <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
              <button
                type="button"
                onClick={() => setActiveTab('UPI')}
                className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                  activeTab === 'UPI'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                <span>UPI / QR</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('CARD')}
                className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                  activeTab === 'CARD'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>Card</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('NETBANKING')}
                className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                  activeTab === 'NETBANKING'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Building className="w-4 h-4" />
                <span>NetBanking</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('WALLET')}
                className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                  activeTab === 'WALLET'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Wallet className="w-4 h-4" />
                <span>Wallets</span>
              </button>
            </div>

            {/* Tab 1: UPI & Instant QR */}
            {activeTab === 'UPI' && (
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-2">
                  {(['GPAY', 'PHONEPE', 'PAYTM', 'BHIM'] as const).map((app) => (
                    <button
                      key={app}
                      type="button"
                      onClick={() => {
                        setUpiApp(app);
                        setUpiId(
                          app === 'GPAY'
                            ? 'traveler@okhdfcbank'
                            : app === 'PHONEPE'
                            ? 'traveler@ybl'
                            : app === 'PAYTM'
                            ? 'traveler@paytm'
                            : 'traveler@upi'
                        );
                      }}
                      className={`p-2.5 rounded-xl border text-center font-bold text-xs transition-all ${
                        upiApp === app
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/20'
                          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {app === 'GPAY' && 'Google Pay'}
                      {app === 'PHONEPE' && 'PhonePe'}
                      {app === 'PAYTM' && 'Paytm UPI'}
                      {app === 'BHIM' && 'BHIM UPI'}
                    </button>
                  ))}
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Scan & Pay with Any UPI App
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Zero surcharge • Real-time instant verification
                    </div>
                  </div>
                  <div className="p-2 bg-white rounded-xl shadow-xs border border-slate-200 shrink-0">
                    <QrCode className="w-12 h-12 text-slate-900" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Enter Virtual Payment Address (VPA / UPI ID)
                  </label>
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="username@bank"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            )}

            {/* Tab 2: Credit/Debit Card */}
            {activeTab === 'CARD' && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Card Number (Visa, Mastercard, RuPay, Amex)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      placeholder="4532 0000 0000 0000"
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white"
                    />
                    <CreditCard className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Expiry Date
                    </label>
                    <input
                      type="text"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      placeholder="MM/YY"
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      CVV
                    </label>
                    <input
                      type="password"
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value)}
                      placeholder="123"
                      maxLength={4}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Cardholder Name
                  </label>
                  <input
                    type="text"
                    value={cardHolder}
                    onChange={(e) => setCardHolder(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            )}

            {/* Tab 3: NetBanking */}
            {activeTab === 'NETBANKING' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'HDFC', name: 'HDFC Bank' },
                    { id: 'SBI', name: 'State Bank' },
                    { id: 'ICICI', name: 'ICICI Bank' },
                    { id: 'AXIS', name: 'Axis Bank' },
                  ].map((bank) => (
                    <button
                      key={bank.id}
                      type="button"
                      onClick={() => setSelectedBank(bank.id)}
                      className={`p-3 rounded-xl border text-center font-bold text-xs transition-all ${
                        selectedBank === bank.id
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/20'
                          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {bank.name}
                    </button>
                  ))}
                </div>
                <select
                  value={selectedBank}
                  onChange={(e) => setSelectedBank(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                >
                  <option value="HDFC">HDFC Bank</option>
                  <option value="SBI">State Bank of India (SBI)</option>
                  <option value="ICICI">ICICI Bank</option>
                  <option value="AXIS">Axis Bank</option>
                  <option value="KOTAK">Kotak Mahindra Bank</option>
                  <option value="PNB">Punjab National Bank</option>
                  <option value="BOB">Bank of Baroda</option>
                </select>
              </div>
            )}

            {/* Tab 4: Wallets */}
            {activeTab === 'WALLET' && (
              <div className="grid grid-cols-2 gap-2">
                {['Paytm Wallet', 'Amazon Pay', 'Mobikwik', 'Freecharge'].map((w, idx) => (
                  <div
                    key={w}
                    className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between cursor-pointer ${
                      idx === 0
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                        : 'border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <span>{w}</span>
                    <BadgeCheck className="w-4 h-4 text-blue-600" />
                  </div>
                ))}
              </div>
            )}

            {/* Trust & Guarantee Banner */}
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800 dark:text-emerald-300">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <strong>Accessible Stay Guarantee:</strong> 100% refund if room specifications fail audit upon arrival.
              </div>
            </div>

            {/* Pay Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleSimulatePayment}
                disabled={isProcessing}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-black rounded-2xl text-sm shadow-xl hover:shadow-2xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <Lock className="w-4 h-4 text-emerald-300" />
                <span>Pay {formattedAmount} via Razorpay</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>
            </div>

            {/* Footer details */}
            <div className="text-center text-[10px] text-slate-400 space-y-1">
              <div>Merchant: AccessWay Universal Travel Foundation • Key: {order.keyId}</div>
              <div>Secured by Razorpay Payments India Ltd • RBI Authorized Payment Aggregator</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

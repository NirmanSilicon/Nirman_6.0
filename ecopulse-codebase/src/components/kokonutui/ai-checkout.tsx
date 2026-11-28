/**
 * @author: @kokonutui
 * @description: AI Checkout
 * @version: 1.1.0
 * @date: 2026-10-31
 * @license: MIT
 * @website: https://kokonutui.com
 * @github: https://github.com/kokonut-labs/kokonutui
 */

import { Check, Lock, Minus, Plus } from 'lucide-react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/utils';

export interface CheckoutItem {
  title: string;
  subtitle: string;
  /** Price of one, in cents (or EcoPoints when formatAmount is provided). */
  unitPrice: number;
  quantity: number;
  /** Most you can order in one go. */
  maxQuantity?: number;
  icon?: ReactNode;
}

export interface CheckoutDetails {
  merchant: string;
  item: CheckoutItem;
  /** Tax rate, e.g. 0.08. */
  taxRate: number;
  currency?: string;
  /** Last four digits of the saved card or wallet ID. */
  cardLast4: string;
  /** e.g. "Arrives in 2 days". */
  delivery: string;
}

export interface AICheckoutProps {
  /** The user's message, drawn as a bubble. Only the demo draws one by default. */
  prompt?: string;
  /** What the assistant says before the order. */
  message?: string;
  /** What it says once paid. */
  confirmation?: string;
  /** The order, usually a tool's output. Leave it out for the demo. */
  checkout?: CheckoutDetails;
  /** Optional custom formatter (e.g. for EcoPoints). */
  formatAmount?: (amount: number) => string;
  /** Optional custom pay button prefix (default: "Pay"). */
  payActionLabel?: string;
  /** Optional custom shipping line label (default: "Free"). */
  shippingLabel?: string;
  /** Optional custom wallet/card label override. */
  paymentMethodLabel?: string;
  /**
   * Charges the card/wallet for this many items, with the total. Resolve
   * with an order number for the receipt. Throw and the order comes back with
   * the error's message under it, so they can try again.
   */
  onPay?: (quantity: number, total: number) => Promise<string>;
  /** Called when they change how many. */
  onQuantityChange?: (quantity: number) => void;
  className?: string;
}

type Status = 'review' | 'paying' | 'paid' | 'receipt';

const EASE_OUT = [0.23, 1, 0.32, 1] as const;
const EASE_DRAWER = [0.32, 0.72, 0, 1] as const;
const NON_NUMBER = /[^0-9.]/g;
const ROLL = {
  enter: (dir: number) => ({
    y: `${60 * dir}%`,
    opacity: 0,
    filter: 'blur(2px)',
  }),
  exit: (dir: number) => ({
    y: `${-60 * dir}%`,
    opacity: 0,
    filter: 'blur(2px)',
  }),
};
const MORPH = { type: 'spring', stiffness: 420, damping: 36 } as const;

const DEMO: CheckoutDetails = {
  merchant: 'Northside Roasters',
  item: {
    title: 'Ethiopia Guji',
    subtitle: 'Whole bean, 250 g',
    unitPrice: 1900,
    quantity: 2,
    maxQuantity: 6,
  },
  taxRate: 0.08,
  cardLast4: '4242',
  delivery: 'Arrives in 2 days',
};

const demoPay = () =>
  new Promise<string>((resolve) => setTimeout(() => resolve('7F2K'), 1500));

const DEMO_TEXT = {
  prompt: 'Reorder the coffee beans I got last month',
  message: 'Same as October, two bags of Ethiopia Guji. Want me to place it?',
  confirmation: 'Done. I’ll tell you when it ships.',
};

function shownText(
  text: Pick<AICheckoutProps, 'prompt' | 'message' | 'confirmation'>,
  isDemo: boolean
) {
  if (!isDemo) {
    return text;
  }
  return {
    prompt: text.prompt ?? DEMO_TEXT.prompt,
    message: text.message ?? DEMO_TEXT.message,
    confirmation: text.confirmation ?? DEMO_TEXT.confirmation,
  };
}

const reason = (error: unknown) =>
  error instanceof Error && error.message
    ? error.message
    : 'The payment didn’t go through. Try again.';

export default function AICheckout({
  prompt,
  message,
  confirmation,
  checkout: checkoutProp,
  formatAmount,
  payActionLabel = 'Pay',
  shippingLabel = 'Free',
  paymentMethodLabel,
  onPay = demoPay,
  onQuantityChange,
  className,
}: AICheckoutProps) {
  const checkout = checkoutProp ?? DEMO;
  const shown = shownText(
    { prompt, message, confirmation },
    checkoutProp === undefined
  );
  const { item } = checkout;
  const [status, setStatus] = useState<Status>('review');
  const [quantity, setQuantity] = useState(item.quantity);
  const [orderId, setOrderId] = useState('');
  const [error, setError] = useState<string>();

  const subtotal = item.unitPrice * quantity;
  const tax = Math.round(subtotal * checkout.taxRate);
  const total = subtotal + tax;
  const money = (cents: number) =>
    formatAmount
      ? formatAmount(cents)
      : new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: checkout.currency ?? 'USD',
        }).format(cents / 100);

  useEffect(() => {
    if (status !== 'paid') {
      return;
    }
    const t = setTimeout(() => setStatus('receipt'), 900);
    return () => clearTimeout(t);
  }, [status]);

  const pay = async () => {
    setStatus('paying');
    setError(undefined);
    try {
      setOrderId(await onPay(quantity, total));
      setStatus('paid');
    } catch (e) {
      setError(reason(e));
      setStatus('review');
    }
  };

  const changeQuantity = (n: number) => {
    setQuantity(n);
    setError(undefined);
    onQuantityChange?.(n);
  };

  const locked = status !== 'review';

  return (
    <MotionConfig reducedMotion="user">
      <div
        className={cn('flex w-full max-w-md flex-col gap-4', className)}
        data-state={error && status === 'review' ? 'error' : status}
      >
        {shown.prompt ? (
          <p className="max-w-[85%] self-end text-pretty rounded-2xl rounded-br-md bg-zinc-100 px-3.5 py-2 text-[14px] text-zinc-800 leading-snug">
            {shown.prompt}
          </p>
        ) : null}
        {shown.message ? (
          <p className="text-pretty text-[15px] text-zinc-800 leading-6">
            {shown.message}
          </p>
        ) : null}

        <AutoHeight className="rounded-[22px] bg-black/[0.04]">
          <AnimatePresence initial={false} mode="popLayout">
            {status === 'receipt' ? (
              <motion.div
                animate={{ opacity: 1, filter: 'blur(0px)' }}
                initial={{ opacity: 0, filter: 'blur(4px)' }}
                key="receipt"
                transition={{ duration: 0.35, ease: EASE_OUT, delay: 0.1 }}
              >
                <Receipt
                  delivery={checkout.delivery}
                  merchant={checkout.merchant}
                  orderId={orderId}
                  total={money(total)}
                />
              </motion.div>
            ) : (
              <motion.div
                exit={{ opacity: 0, filter: 'blur(4px)' }}
                key="order"
                transition={{ duration: 0.2 }}
              >
                <div className="flex h-8 items-center justify-between px-3 text-[12px] text-zinc-500">
                  <span className="font-medium text-zinc-700">
                    {checkout.merchant}
                  </span>
                  <span className="flex items-center gap-1">
                    <Lock aria-hidden="true" className="size-3" />
                    Secure checkout
                  </span>
                </div>

                <div className="rounded-[18px] bg-white shadow-[0_1px_2px_rgb(0_0_0/0.04)] ring-1 ring-black/[0.06]">
                  <div className="flex items-center gap-3 p-3.5">
                    {item.icon ? (
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-2xl">
                        {item.icon}
                      </span>
                    ) : (
                      <BagStack count={quantity} />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-[14px] text-zinc-900">
                        {item.title}
                      </p>
                      <p className="mt-0.5 truncate text-[12.5px] text-zinc-500">
                        {money(item.unitPrice)} · {item.subtitle}
                      </p>
                    </div>
                    <Stepper
                      disabled={locked}
                      max={item.maxQuantity ?? 9}
                      onChange={changeQuantity}
                      value={quantity}
                    />
                  </div>

                  <dl className="mx-3.5 space-y-1 border-black/[0.08] border-t border-dashed py-3 text-[13px]">
                    <Line label="Subtotal" value={money(subtotal)} />
                    <Line label="Delivery" value={shippingLabel} />
                    {checkout.taxRate > 0 && (
                      <Line label="Fee" value={money(tax)} />
                    )}
                  </dl>
                  <div className="flex items-baseline justify-between border-black/[0.06] border-t px-3.5 py-3">
                    <span className="font-medium text-[14px] text-zinc-900">
                      Total
                    </span>
                    <Rolling
                      className="font-semibold text-[17px] text-zinc-900 tracking-tight"
                      value={money(total)}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 py-1 pr-1 pl-3">
                  <span className="flex min-w-0 flex-1 items-center gap-2 text-[12.5px] text-zinc-600">
                    <CardChip />
                    <span className="whitespace-nowrap tabular-nums tracking-wide">
                      {paymentMethodLabel ?? `•••• ${checkout.cardLast4}`}
                    </span>
                    <span className="hidden truncate text-zinc-400 sm:inline">
                      · {checkout.delivery}
                    </span>
                  </span>
                  <PayButton
                    label={`${payActionLabel} ${money(total)}`}
                    onPay={pay}
                    status={status}
                  />
                </div>
                <AnimatePresence initial={false}>
                  {error ? (
                    <motion.p
                      animate={{ height: 'auto', opacity: 1 }}
                      className="overflow-hidden px-3 text-[12.5px] text-rose-600"
                      exit={{ height: 0, opacity: 0 }}
                      initial={{ height: 0, opacity: 0 }}
                      key="error"
                      transition={{ duration: 0.2, ease: EASE_OUT }}
                    >
                      <span className="block pb-2">{error}</span>
                    </motion.p>
                  ) : null}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </AutoHeight>

        <AnimatePresence>
          {status === 'receipt' && shown.confirmation ? (
            <motion.p
              animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
              className="text-pretty text-[15px] text-zinc-800 leading-6"
              initial={{ opacity: 0, filter: 'blur(4px)', y: 4 }}
              transition={{ duration: 0.4, ease: EASE_OUT, delay: 0.4 }}
            >
              {shown.confirmation}
            </motion.p>
          ) : null}
        </AnimatePresence>
        <p aria-live="polite" className="sr-only">
          {status === 'paying' ? 'Processing redemption' : ''}
          {status === 'paid' || status === 'receipt' ? 'Complete' : ''}
          {error ?? ''}
        </p>
      </div>
    </MotionConfig>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="text-zinc-700 tabular-nums">
        <Rolling value={value} />
      </dd>
    </div>
  );
}

function Rolling({ value, className }: { value: string; className?: string }) {
  const amount = Number.parseFloat(value.replace(NON_NUMBER, '')) || 0;
  const last = useRef(amount);
  const dir = amount < last.current ? -1 : 1;
  useEffect(() => {
    last.current = amount;
  }, [amount]);

  return (
    <span className={cn('relative inline-flex overflow-hidden tabular-nums', className)}>
      <AnimatePresence custom={dir} initial={false} mode="popLayout">
        <motion.span
          animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
          custom={dir}
          exit="exit"
          initial="enter"
          key={value}
          transition={{ duration: 0.22, ease: EASE_OUT }}
          variants={ROLL}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function Stepper({
  value,
  max,
  disabled,
  onChange,
}: {
  value: number;
  max: number;
  disabled: boolean;
  onChange: (n: number) => void;
}) {
  const button =
    'flex size-7 items-center justify-center rounded-full text-zinc-600 outline-hidden transition-colors duration-100 hover:bg-zinc-100 hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-zinc-400/50 disabled:pointer-events-none disabled:opacity-30 active:bg-zinc-200 cursor-pointer';
  return (
    <div className="flex items-center rounded-full p-0.5 ring-1 ring-black/[0.08]">
      <button
        aria-label="One fewer"
        className={button}
        disabled={disabled || value <= 1}
        onClick={() => onChange(value - 1)}
        type="button"
      >
        <Minus className="size-3.5" />
      </button>
      <Rolling
        className="w-5 justify-center font-medium text-[13px] text-zinc-900"
        value={String(value)}
      />
      <button
        aria-label="One more"
        className={button}
        disabled={disabled || value >= max}
        onClick={() => onChange(value + 1)}
        type="button"
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}

function Bag({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 32 40">
      <path d="M4.5 7.5h23l1.3 29.2a2 2 0 0 1-2 2.1H5.2a2 2 0 0 1-2-2.1z" fill="#c09166" />
      <path d="M4.5 7.5h23l.1 2.5h-23.2z" fill="#a87a50" />
      <rect fill="#8a6240" height="5.5" rx="1" width="25" x="3.5" y="2.5" />
      <path
        d="M7 3.5v3.5M10.5 3.5v3.5M14 3.5v3.5M17.5 3.5v3.5M21 3.5v3.5M24.5 3.5v3.5"
        stroke="#6f4e37"
        strokeWidth=".8"
      />
      <circle cx="16" cy="13.5" fill="#8a6240" r="1.3" />
      <rect fill="#f6efe6" height="15" rx="1.5" width="17" x="7.5" y="18" />
      <ellipse cx="16" cy="23" fill="#6f4e37" rx="2.2" ry="3" transform="rotate(28 16 23)" />
      <path d="M16.9 20.6c-1.4 1.3-.4 3.4-1.8 4.8" stroke="#f6efe6" strokeLinecap="round" strokeWidth=".7" />
      <rect fill="#6f4e37" height="1" rx=".5" width="9" x="11.5" y="28" />
      <rect fill="#c9b8a6" height="1" rx=".5" width="6" x="13" y="30" />
    </svg>
  );
}

function BagStack({ count }: { count: number }) {
  const behind = Math.min(Math.max(count, 1), 3) - 1;
  return (
    <span aria-hidden="true" className="relative h-11 w-12 shrink-0">
      <AnimatePresence initial={false}>
        {Array.from({ length: behind }, (_, i) => {
          const depth = behind - i;
          return (
            <motion.span
              animate={{ x: depth * 7, y: -depth, opacity: 1 }}
              className="absolute bottom-0 left-0 brightness-[0.82]"
              exit={{ x: 0, y: 0, opacity: 0 }}
              initial={{ x: 0, y: 0, opacity: 0 }}
              key={depth}
              transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
            >
              <Bag className="h-[42px] w-[34px]" />
            </motion.span>
          );
        })}
      </AnimatePresence>
      <span className="absolute bottom-0 left-0 drop-shadow-[1px_0_0_rgb(0_0_0/0.12)]">
        <Bag className="h-[42px] w-[34px]" />
      </span>
    </span>
  );
}

function CardChip() {
  return (
    <span
      aria-hidden="true"
      className="relative flex h-[18px] w-[27px] shrink-0 items-end justify-end overflow-hidden rounded-[4px] bg-[#059669] px-[3px] pb-[2px]"
    >
      <span className="absolute top-[4px] left-[3px] h-[5px] w-[7px] rounded-[1.5px] bg-[#fde68a]" />
      <span className="font-black text-[6.5px] text-white italic leading-none tracking-tight">
        ECO
      </span>
    </span>
  );
}

function PayButton({
  status,
  label,
  onPay,
}: {
  status: Status;
  label: string;
  onPay: () => void;
}) {
  const round = status !== 'review';
  const paid = status === 'paid' || status === 'receipt';
  let name = label;
  if (round) {
    name = paid ? 'Paid' : 'Paying';
  }

  return (
    <motion.button
      aria-label={name}
      className={cn(
        'relative flex h-10 shrink-0 items-center justify-center overflow-hidden font-medium text-[14px] outline-hidden transition-colors duration-300 focus-visible:ring-2 focus-visible:ring-zinc-400/60 focus-visible:ring-offset-2 cursor-pointer',
        round ? 'w-10' : 'px-4',
        paid
          ? 'bg-emerald-600 text-white'
          : 'bg-zinc-900 text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.14),0_1px_2px_rgb(0_0_0/0.16)] hover:bg-zinc-800 active:bg-zinc-700'
      )}
      disabled={round}
      layout
      onClick={onPay}
      style={{ borderRadius: 999 }}
      transition={{ layout: MORPH }}
      type="button"
    >
      <AnimatePresence initial={false} mode="popLayout">
        {status === 'review' && (
          <motion.span
            animate={{ opacity: 1 }}
            className="whitespace-nowrap tabular-nums"
            exit={{ opacity: 0, transition: { duration: 0.08 } }}
            initial={{ opacity: 0 }}
            key="label"
            layout="position"
          >
            {label}
          </motion.span>
        )}
        {status === 'paying' && (
          <motion.svg
            animate={{ opacity: 1, rotate: 360 }}
            aria-hidden="true"
            className="size-5"
            exit={{ opacity: 0 }}
            fill="none"
            initial={{ opacity: 0 }}
            key="ring"
            transition={{
              opacity: { duration: 0.15, delay: 0.12 },
              rotate: {
                duration: 0.6,
                ease: 'linear',
                repeat: Number.POSITIVE_INFINITY,
              },
            }}
            viewBox="0 0 20 20"
          >
            <circle cx="10" cy="10" opacity="0.25" r="8" stroke="currentColor" strokeWidth="2" />
            <path d="M10 2a8 8 0 0 1 8 8" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
          </motion.svg>
        )}
        {paid && (
          <motion.svg aria-hidden="true" className="size-5" fill="none" key="check" viewBox="0 0 20 20">
            <motion.path
              animate={{ pathLength: 1 }}
              d="M5 10.5l3.2 3.2L15 6.8"
              initial={{ pathLength: 0 }}
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.2"
              transition={{ duration: 0.35, ease: EASE_OUT, delay: 0.1 }}
            />
          </motion.svg>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

function Receipt({
  total,
  merchant,
  orderId,
  delivery,
}: {
  total: string;
  merchant: string;
  orderId: string;
  delivery: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-[18px] bg-white px-3.5 py-3 ring-1 ring-black/[0.06]">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-600/10 text-emerald-600">
        <Check aria-hidden="true" className="size-4" strokeWidth={2.5} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] text-zinc-900">
          <span className="font-medium tabular-nums">Redeemed {total}</span>
          <span className="text-zinc-500"> at {merchant}</span>
        </p>
        <p className="mt-0.5 truncate text-[12px] text-zinc-500">{delivery}</p>
      </div>
      <span className="shrink-0 rounded-md bg-zinc-100 px-1.5 py-0.5 font-mono text-[11px] text-zinc-600">
        #{orderId}
      </span>
    </div>
  );
}

function AutoHeight({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const innerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | 'auto'>('auto');

  useEffect(() => {
    const inner = innerRef.current;
    if (!inner) {
      return;
    }
    const observer = new ResizeObserver(() => setHeight(inner.offsetHeight));
    observer.observe(inner);
    return () => observer.disconnect();
  }, []);

  return (
    <motion.div
      animate={{ height }}
      className={cn('overflow-hidden', className)}
      initial={false}
      transition={{ duration: 0.3, ease: EASE_DRAWER }}
    >
      <div className="p-1" ref={innerRef}>
        {children}
      </div>
    </motion.div>
  );
}

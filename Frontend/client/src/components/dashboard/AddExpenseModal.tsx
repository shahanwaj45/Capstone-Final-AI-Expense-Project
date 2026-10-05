import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, X, Zap, ArrowDownLeft, ArrowUpRight, Camera } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/auth/AuthContext";
import api from "@/lib/api";

interface Props {
  open: boolean;
  onClose: () => void;
  initialType?: "expense" | "income";
}

const EXPENSE_CATEGORIES = [
  "Food",
  "Travel",
  "Education",
  "Entertainment",
  "Bills",
  "Health",
  "Shopping",
  "Subscription",
  "Other"
];

const INCOME_CATEGORIES = [
  "Pocket Money",
  "Allowance",
  "Salary",
  "Freelance",
  "Stipend",
  "Gift",
  "Investment",
  "Refund",
  "Other"
];

const PAYMENT_METHODS = ["UPI", "Cash", "Bank Transfer", "Card", "Other"];

export default function AddExpenseModal({ open, onClose, initialType = "expense" }: Props) {
  const { role } = useAuth();
  const [txType, setTxType] = useState<"expense" | "income">(initialType);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Food");
  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [loading, setLoading] = useState(false);
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [showPaymentMenu, setShowPaymentMenu] = useState(false);

  useEffect(() => {
    if (open) {
      setTxType(initialType);
      setCategory(initialType === "income" ? "Pocket Money" : "Food");
    }
  }, [open, initialType]);

  const handleTypeChange = (newType: "expense" | "income") => {
    setTxType(newType);
    setCategory(newType === "income" ? "Pocket Money" : "Food");
    setShowCategoryMenu(false);
    setShowPaymentMenu(false);
  };

  const reset = () => {
    setName("");
    setAmount("");
    setCategory(txType === "income" ? "Pocket Money" : "Food");
    setPaymentMethod("UPI");
  };

  const submit = async () => {
    if (!name || !amount) {
      toast.error("Please add a title and amount first");
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Please enter a valid amount greater than 0");
      return;
    }

    setLoading(true);
    try {
      // 1. Post to transactions
      await api.post("/transactions", {
        name: name.trim(),
        amount: parsedAmount,
        category,
        payment_method: paymentMethod,
        type: txType,
        notes: txType === "income" ? `Money received: ${category}` : undefined,
      });

      // 2. If professional and income, also sync to /income endpoint
      if (role === "professional" && txType === "income") {
        try {
          await api.post("/income", {
            source: name.trim(),
            amount: parsedAmount,
            type: category === "Salary" ? "fixed" : "variable",
          });
        } catch {
          // ignore secondary sync error
        }
      }

      const isInc = txType === "income";
      toast.success(
        isInc
          ? `+₹${parsedAmount.toLocaleString("en-IN")} added to your money!`
          : `${name} added to your expenses`,
        {
          description: `${isInc ? "Received" : "Spent"}: ₹${parsedAmount.toLocaleString("en-IN")} · ${category} · ${paymentMethod}`,
        }
      );
      reset();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || "Failed to save transaction");
    } finally {
      setLoading(false);
    }
  };

  const categories = txType === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center bg-[#172532]/30 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            className="w-full max-w-md rounded-[26px] bg-[#f9fbf8] p-6 shadow-[0_20px_60px_rgba(23,37,50,.2)] border border-[#e2ece5]"
          >
            {/* Header & Close */}
            <div className="flex items-start justify-between">
              <div>
                <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[.14em] ${
                  txType === "income" ? "bg-[#e7f8ef] text-[#2b7256]" : "bg-[#fff0eb] text-[#d66f4e]"
                }`}>
                  {txType === "income" ? <ArrowDownLeft size={12} /> : <ArrowUpRight size={12} />}
                  {txType === "income" ? "Money In / Received" : "Money Out / Spent"}
                </span>
                <h3 className="mt-2.5 font-display text-2xl font-bold tracking-[-.05em] text-[#172532]">
                  {txType === "income" ? "Add Money Received" : "Add an Expense"}
                </h3>
                <p className="mt-1 text-[12px] text-[#8b9891]">
                  {txType === "income"
                    ? "Record pocket money, allowance, salary, stipend, or gift."
                    : "Capture your spending now. Keep your budget on track."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => { reset(); onClose(); }}
                className="rounded-xl bg-white p-2 text-[#82908a] hover:bg-[#f0f4f1] transition"
              >
                <X size={17} />
              </button>
            </div>

            {/* Type selector toggle tabs */}
            <div className="mt-5 grid grid-cols-2 gap-2 rounded-2xl bg-[#edf3ef] p-1.5">
              <button
                type="button"
                onClick={() => handleTypeChange("expense")}
                className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-[12px] font-bold transition ${
                  txType === "expense"
                    ? "bg-white text-[#d66f4e] shadow-sm"
                    : "text-[#73837b] hover:text-[#172532]"
                }`}
              >
                <ArrowUpRight size={14} /> Expense (Money Spent)
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange("income")}
                className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-[12px] font-bold transition ${
                  txType === "income"
                    ? "bg-white text-[#2b7256] shadow-sm"
                    : "text-[#73837b] hover:text-[#172532]"
                }`}
              >
                <ArrowDownLeft size={14} /> Income (Money Received)
              </button>
            </div>

            {/* Form inputs */}
            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-bold text-[#76837b]">
                  {txType === "income" ? "Where did you get this money?" : "What did you spend on?"}
                </span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={
                    txType === "income"
                      ? "e.g. Pocket money from Dad, Stipend, Salary, Gift"
                      : "e.g. Lunch, Grocery, Books, Coffee"
                  }
                  className="h-11 w-full rounded-xl border border-[#e2e9e2] bg-white px-3.5 text-sm font-medium text-[#172532] outline-none focus:border-[#4caf89] focus:ring-2 focus:ring-[#b8ecd6]"
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[11px] font-bold text-[#76837b]">
                  Amount (₹) *
                </span>
                <div className="relative">
                  <span className={`absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold ${
                    txType === "income" ? "text-[#3b8165]" : "text-[#8a978f]"
                  }`}>
                    {txType === "income" ? "+₹" : "₹"}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0"
                    className="h-11 w-full rounded-xl border border-[#e2e9e2] bg-white pl-9 pr-3.5 text-sm font-bold text-[#172532] outline-none focus:border-[#4caf89] focus:ring-2 focus:ring-[#b8ecd6]"
                    onKeyDown={(e) => e.key === "Enter" && submit()}
                  />
                </div>
              </label>

              <div className="grid grid-cols-2 gap-3">
                {/* Category selector */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => { setShowCategoryMenu(!showCategoryMenu); setShowPaymentMenu(false); }}
                    className="w-full rounded-xl border border-[#e2e9e2] bg-white p-3 text-left hover:bg-[#f8faf8] transition"
                  >
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#8d9992]">Category</p>
                    <p className="mt-1 text-[12px] font-bold text-[#172532] flex items-center justify-between">
                      {category} <ChevronDown size={13} className="text-[#8d9992]" />
                    </p>
                  </button>
                  {showCategoryMenu && (
                    <div className="absolute left-0 top-full z-20 mt-1 max-h-48 w-48 overflow-y-auto rounded-xl border border-[#e2e9e2] bg-white p-1 shadow-xl">
                      {categories.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => { setCategory(c); setShowCategoryMenu(false); }}
                          className={`block w-full rounded-lg px-3 py-2 text-left text-[12px] font-medium transition ${
                            category === c ? "bg-[#eafaf3] text-[#2b7256] font-bold" : "hover:bg-[#f0f5ef] text-[#172532]"
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Payment method selector */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => { setShowPaymentMenu(!showPaymentMenu); setShowCategoryMenu(false); }}
                    className="w-full rounded-xl border border-[#e2e9e2] bg-white p-3 text-left hover:bg-[#f8faf8] transition"
                  >
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#8d9992]">Payment Mode</p>
                    <p className="mt-1 text-[12px] font-bold text-[#172532] flex items-center justify-between">
                      {paymentMethod} <ChevronDown size={13} className="text-[#8d9992]" />
                    </p>
                  </button>
                  {showPaymentMenu && (
                    <div className="absolute left-0 top-full z-20 mt-1 w-44 rounded-xl border border-[#e2e9e2] bg-white p-1 shadow-xl">
                      {PAYMENT_METHODS.map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => { setPaymentMethod(m); setShowPaymentMenu(false); }}
                          className={`block w-full rounded-lg px-3 py-2 text-left text-[12px] font-medium transition ${
                            paymentMethod === m ? "bg-[#eafaf3] text-[#2b7256] font-bold" : "hover:bg-[#f0f5ef] text-[#172532]"
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Submit button */}
            <button
              type="button"
              onClick={submit}
              disabled={loading}
              className={`mt-6 h-12 w-full rounded-xl text-[13px] font-bold text-white shadow-lg transition active:scale-[.98] disabled:opacity-60 ${
                txType === "income"
                  ? "bg-[#2b7256] hover:bg-[#235d46]"
                  : "bg-[#172532] hover:bg-[#294353]"
              }`}
            >
              {loading ? (
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : txType === "income" ? (
                <>Save Money Received <ArrowDownLeft size={15} className="ml-1 inline text-[#7BE2BE]" /></>
              ) : (
                <>Save Expense <Zap size={14} className="ml-1 inline text-[#7BE2BE]" /></>
              )}
            </button>

            {txType === "expense" && (
              <div className="mt-3 text-center">
                <Link
                  to={role === "professional" ? "/professional/receipt-scanner" : "/student/receipt-scanner"}
                  onClick={() => { reset(); onClose(); }}
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#3b8165] hover:underline"
                >
                  <Camera size={13} className="text-[#3ea87c]" />
                  Have a receipt? Take photo with camera or upload document
                </Link>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

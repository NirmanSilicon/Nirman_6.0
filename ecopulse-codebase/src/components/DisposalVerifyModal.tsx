import React, { useState } from 'react';
import { X, CheckCircle2, AlertCircle, Sparkles, ShieldAlert } from 'lucide-react';
import { ScanPrediction, WasteCategoryId } from '../types/eco';
import { CATEGORY_LIST, WASTE_CATEGORIES } from '../data/wasteDatabase';
import SpecularButton from './SpecularButton';

interface DisposalVerifyModalProps {
  prediction: ScanPrediction;
  onClose: () => void;
  onConfirmCorrectBin: (selectedBin: WasteCategoryId) => {
    awardedPoints: number;
    newlyUnlockedBadges: string[];
    capped: boolean;
  };
}

export const DisposalVerifyModal: React.FC<DisposalVerifyModalProps> = ({
  prediction,
  onClose,
  onConfirmCorrectBin,
}) => {
  const [pickedBin, setPickedBin] = useState<WasteCategoryId | null>(null);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'wrong';
    message: string;
    awardedPoints?: number;
    badges?: string[];
  } | null>(null);

  const handleBinTap = (catId: WasteCategoryId) => {
    setPickedBin(catId);
    if (catId === prediction.effectiveCategory) {
      const res = onConfirmCorrectBin(catId);
      setFeedback({
        type: 'success',
        awardedPoints: res.awardedPoints,
        badges: res.newlyUnlockedBadges,
        message: res.capped
          ? `Verified! Daily EcoPoint cap reached (200 pts/day) — your streak and CO2 impact still logged!`
          : `Awesome! You threw ${prediction.item.name} in the ${WASTE_CATEGORIES[catId].binName} and prevented cross-contamination.`,
      });
    } else {
      setFeedback({
        type: 'wrong',
        message: `Hold on! Putting ${prediction.item.name} in the ${WASTE_CATEGORIES[catId].binName} causes cross-contamination (up to 60% of recyclables are lost this way). Try the ${WASTE_CATEGORIES[prediction.effectiveCategory].binName}!`,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">{prediction.item.emoji}</span>
            <div>
              <h3 className="font-display font-bold text-base text-slate-900">
                Verify Bin Disposal &amp; Earn Points
              </h3>
              <p className="text-xs text-slate-500">
                Select the bin you are throwing <strong>{prediction.item.name}</strong> into:
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {feedback?.type === 'success' ? (
            <div className="text-center py-4 space-y-3">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-emerald-600 text-white font-display font-extrabold text-lg shadow-sm">
                <Sparkles className="w-4 h-4" />
                +{feedback.awardedPoints} EcoPoints Earned!
              </div>
              <p className="text-sm text-slate-700 max-w-sm mx-auto">{feedback.message}</p>
              {feedback.badges && feedback.badges.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-xs text-amber-900 font-semibold">
                  Badge Unlocked: {feedback.badges.join(', ')}
                </div>
              )}
              <SpecularButton
                size="lg"
                radius={18}
                tint="#ffffff"
                tintOpacity={0.04}
                textColor="#f5f5f5"
                lineColor="#ffffff"
                baseColor="#525252"
                surfaceColor="#0f172a"
                intensity={1}
                idleIntensity={0.35}
                shineSize={10}
                shineFade={34}
                thickness={1.2}
                glow={1}
                followMouse
                proximity={250}
                fullWidth
                onClick={onClose}
                className="mt-2"
              >
                Continue Scanning
              </SpecularButton>
            </div>
          ) : (
            <>
              {feedback?.type === 'wrong' && (
                <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-2xl p-3.5 text-xs text-red-900">
                  <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{feedback.message}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2.5">
                {CATEGORY_LIST.map((cat) => {
                  const isPicked = pickedBin === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleBinTap(cat.id)}
                      className={`p-3.5 rounded-2xl border text-left transition cursor-pointer ${
                        isPicked
                          ? 'border-red-400 bg-red-50/50'
                          : 'border-slate-200 hover:border-slate-400 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="w-3.5 h-3.5 rounded-full shrink-0"
                          style={{ backgroundColor: cat.hex }}
                        />
                        <span className="text-xs font-bold text-slate-900">{cat.label}</span>
                      </div>
                      <p className="text-[11px] text-slate-500">{cat.binName}</p>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 text-[11px] text-slate-500 bg-slate-50 p-3 rounded-xl">
                <AlertCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Correct disposal awards <strong>+{prediction.item.basePoints} base pts</strong> (up to 200 pts/day cap to ensure fair verified impact).
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

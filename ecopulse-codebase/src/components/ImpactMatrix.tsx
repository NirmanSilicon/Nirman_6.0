import React, { useState } from 'react';
import { BarChart3, Users, Database, ShieldCheck } from 'lucide-react';
import { WasteCategoryId } from '../types/eco';
import { CATEGORY_LIST, WASTE_CATEGORIES, WASTE_ITEMS } from '../data/wasteDatabase';
import AnimatedContent from './AnimatedContent';

export const ImpactMatrix: React.FC = () => {
  const [selectedCat, setSelectedCat] = useState<WasteCategoryId | 'all'>('all');

  const filteredItems =
    selectedCat === 'all'
      ? WASTE_ITEMS
      : WASTE_ITEMS.filter(
          (i) => i.primaryCategory === selectedCat || i.applicableCategories.includes(selectedCat)
        );

  return (
    <AnimatedContent
      distance={90}
      direction="vertical"
      duration={0.8}
      ease="power3.out"
      blur={0}
      stagger={0.08}
      threshold={0.1}
      className="space-y-6"
    >
      {/* PPT Proof Points Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
            Global Waste Crisis
          </p>
          <p className="font-display font-extrabold text-3xl text-slate-900 mt-1">2B+ Tonnes</p>
          <p className="text-xs text-slate-500 mt-1">
            Municipal solid waste generated annually worldwide.
          </p>
        </div>
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-600">
            Cross-Contamination Loss
          </p>
          <p className="font-display font-extrabold text-3xl text-slate-900 mt-1">Up to 60%</p>
          <p className="text-xs text-slate-500 mt-1">
            Recyclable materials lost to landfill due to sorting confusion before the bin.
          </p>
        </div>
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
            EcoPulse AI Camera Assist
          </p>
          <p className="font-display font-extrabold text-3xl text-slate-900 mt-1">96% Accuracy</p>
          <p className="text-xs text-slate-500 mt-1">
            Up from 52% unassisted human sorting &amp; 68% basic bin labels.
          </p>
        </div>
      </div>

      {/* Accuracy Comparison & Stream Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
          <h3 className="font-display font-bold text-base text-slate-900 flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-emerald-600" />
            Sorting Accuracy Benchmark (PPT Proof Points)
          </h3>
          <div className="space-y-4">
            {[
              { label: 'Unassisted Human Sorting', pct: 52, color: 'bg-slate-400' },
              { label: 'Basic Bin Labels', pct: 68, color: 'bg-blue-500' },
              { label: 'EcoPulse AI Camera Assist', pct: 96, color: 'bg-emerald-600' },
            ].map((bar) => (
              <div key={bar.label}>
                <div className="flex justify-between text-xs font-semibold mb-1.5">
                  <span className="text-slate-700">{bar.label}</span>
                  <span className="text-slate-900">{bar.pct}%</span>
                </div>
                <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${bar.color}`}
                    style={{ width: `${bar.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
          <h3 className="font-display font-bold text-base text-slate-900 flex items-center gap-2 mb-4">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Municipal Waste-Stream Opportunity
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { pct: '44%', label: 'Organic & Compostable', cls: 'bg-emerald-50 border-emerald-200 text-emerald-900' },
              { pct: '28%', label: 'Paper & Dry Recyclables', cls: 'bg-blue-50 border-blue-200 text-blue-900' },
              { pct: '16%', label: 'Plastics & Glass', cls: 'bg-teal-50 border-teal-200 text-teal-900' },
              { pct: '12%', label: 'E-Waste & Hazardous', cls: 'bg-violet-50 border-violet-200 text-violet-900' },
            ].map((s) => (
              <div key={s.label} className={`p-3.5 rounded-2xl border ${s.cls}`}>
                <p className="font-display font-extrabold text-2xl">{s.pct}</p>
                <p className="text-xs font-semibold mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Material Reference Matrix across 6 Categories */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="font-display font-bold text-base text-slate-900 flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-600" />
              6-Category Waste Taxonomy &amp; Material Reference Matrix
            </h3>
            <p className="text-xs text-slate-500">
              Covers Biodegradable, Non-Biodegradable, Recyclable, Non-Recyclable, E-Waste, and Hazardous Waste.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedCat('all')}
              className={`px-3 py-1 rounded-full text-xs font-semibold border cursor-pointer ${
                selectedCat === 'all'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-slate-50 text-slate-600 border-slate-200'
              }`}
            >
              All
            </button>
            {CATEGORY_LIST.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedCat(c.id)}
                className={`px-3 py-1 rounded-full text-xs font-semibold border cursor-pointer ${
                  selectedCat === c.id
                    ? 'text-white border-transparent'
                    : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}
                style={selectedCat === c.id ? { backgroundColor: c.hex } : undefined}
              >
                {c.shortLabel}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2.5 pr-4 font-semibold">Item</th>
                <th className="py-2.5 pr-4 font-semibold">Primary Category &amp; Bin</th>
                <th className="py-2.5 pr-4 font-semibold">Material / Code</th>
                <th className="py-2.5 pr-4 font-semibold">Decomposition</th>
                <th className="py-2.5 pr-4 font-semibold">Hazard</th>
                <th className="py-2.5 font-semibold">Pts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.map((item) => {
                const cat = WASTE_CATEGORIES[item.primaryCategory];
                return (
                  <tr key={item.id} className="hover:bg-slate-50/70">
                    <td className="py-3 pr-4 font-semibold text-slate-900 whitespace-nowrap">
                      <span className="mr-2">{item.emoji}</span>
                      {item.name}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold text-white"
                        style={{ backgroundColor: cat.hex }}
                      >
                        {cat.label}
                      </span>
                      <span className="block text-[11px] text-slate-500 mt-0.5">
                        {cat.binName}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-slate-600">
                      <div>{item.materialClass}</div>
                      <div className="text-[11px] text-slate-400">{item.resinOrCode}</div>
                    </td>
                    <td className="py-3 pr-4 font-medium text-slate-700">
                      {item.decompositionTime}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`font-semibold ${
                          item.hazardLabel === 'Critical' || item.hazardLabel === 'High'
                            ? 'text-red-600'
                            : 'text-slate-600'
                        }`}
                      >
                        {item.hazardLabel}
                      </span>
                    </td>
                    <td className="py-3 font-bold text-emerald-700">+{item.basePoints}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Team NeuroNexus Credits */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
            <Users className="w-4 h-4" />
            Team NeuroNexus · EcoPulse
          </p>
          <h4 className="font-display font-bold text-lg mt-1">
            AI-Powered Waste Classifier &amp; Comprehensive Waste Impact Scoring System
          </h4>
          <p className="text-xs text-slate-300 mt-1">
            Built by <strong>Divypratap Singh</strong>, <strong>Pratik Patra</strong>,{' '}
            <strong>Prachet Giri</strong>, <strong>Priyani Mishra</strong>, and{' '}
            <strong>Nupur Chandra</strong>.
          </p>
        </div>
        <div className="text-xs text-slate-400 shrink-0">
          Sustainability · AI &amp; Computer Vision
        </div>
      </div>
    </AnimatedContent>
  );
};

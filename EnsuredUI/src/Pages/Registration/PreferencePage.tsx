import React, { useState } from "react";
import TopNavBar from '../../xds/components/TopNavBar'
import SideNavBar from '../../xds/components/SideNavBar'
import Input from '../../xds/components/Input'
import Button from '../../xds/components/Button'
import Range from '../../xds/components/Range'
import Checkbox from '../../xds/components/Checkbox'

const PreferencePage: React.FC = () => {
  const [risk, setRisk] = useState<number>(25);
  const [yieldTarget, setYieldTarget] = useState<number>(8);
  const [coverage, setCoverage] = useState<"natural" | "global">("natural");
  const [income, setIncome] = useState<string>("");
  const [netWorth, setNetWorth] = useState<string>("");
  const [accredited, setAccredited] = useState<boolean>(false);

  return (
    <>
      <TopNavBar />
      <SideNavBar />
      <main className="lg:ml-72 ml-0 pt-16 min-h-screen bg-surface">
      <div className="max-w-6xl mx-auto px-12 py-12">
        <header className="mb-12">
          <h1 className="text-4xl font-extrabold font-headline tracking-tight text-on-surface mb-2">Portfolio Preference</h1>
          <p className="text-on-surface-variant max-w-2xl text-lg">Define your quantitative exposure limits and coverage scope. Our algorithmic engine will suggest the optimal capital tranches based on your selections.</p>
        </header>

        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-12 lg:col-span-7 space-y-8">
            <section className="bg-surface-container-low rounded-xl p-8 border border-outline-variant/5">
              <h3 className="text-sm font-mono uppercase tracking-[0.2em] text-primary mb-8">1. Risk Parameters</h3>
              <div className="space-y-12">
                <div className="group">
                  <div className="flex justify-between items-end mb-4">
                    <label className="text-on-surface font-semibold text-lg">Risk Tolerance</label>
                    <div className="text-right">
                      <span className="font-mono text-2xl text-secondary">Conservative</span>
                      <p className="text-xs text-on-surface-variant uppercase font-mono">Max Loss: <span className="text-error">2.4%</span></p>
                    </div>
                  </div>
                  <Range
                    max={100}
                    min={1}
                    value={risk}
                    onChange={(e) => setRisk(Number(e.target.value))}
                    style={{ height: 8 }}
                  />
                  <div className="flex justify-between mt-2 text-[10px] font-mono text-on-surface-variant uppercase">
                    <span>Preservation</span>
                    <span>Balanced</span>
                    <span>Aggressive</span>
                  </div>
                </div>

                <div className="group">
                  <div className="flex justify-between items-end mb-4">
                    <label className="text-on-surface font-semibold text-lg">Target Annual Yield</label>
                    <div className="text-right">
                      <span className="font-mono text-2xl text-primary">{yieldTarget.toFixed(2)}%</span>
                      <p className="text-xs text-on-surface-variant uppercase font-mono">Net of Fees</p>
                    </div>
                  </div>
                  <Range
                    max={25}
                    min={4}
                    value={yieldTarget}
                    onChange={(e) => setYieldTarget(Number(e.target.value))}
                    style={{ height: 8 }}
                  />
                  <div className="flex justify-between mt-2 text-[10px] font-mono text-on-surface-variant uppercase">
                    <span>4.0% Floor</span>
                    <span>14.5% Targeted</span>
                    <span>25.0% Cap</span>
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-surface-container-low rounded-xl p-8 border border-outline-variant/5">
              <h3 className="text-sm font-mono uppercase tracking-[0.2em] text-primary mb-6">2. Preferred Coverage</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setCoverage("natural")}
                  className={`relative text-left p-5 rounded-lg transition-all group overflow-hidden ${coverage === "natural" ? "border-2 border-primary bg-primary/5" : "border border-outline-variant/20 bg-surface-container"}`}
                >
                  <div className="absolute top-2 right-2">
                    <span className={`material-symbols-outlined text-xl ${coverage === "natural" ? "text-primary" : "text-on-surface-variant"}`} style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  </div>
                  <span className="material-symbols-outlined text-primary mb-3 text-3xl">nature</span>
                  <h4 className="text-on-surface font-bold text-base mb-1">Only Natural Catastrophes</h4>
                  <p className="text-xs text-on-surface-variant leading-relaxed">Focus exclusively on high-impact environmental events like hurricanes and seismic activity.</p>
                </button>

                <button
                  type="button"
                  onClick={() => setCoverage("global")}
                  className={`text-left p-5 rounded-lg transition-all group ${coverage === "global" ? "border-2 border-primary bg-primary/5" : "border border-outline-variant/20 bg-surface-container"}`}
                >
                  <span className="material-symbols-outlined text-on-surface-variant mb-3 text-3xl group-hover:text-primary transition-colors">public</span>
                  <h4 className="text-on-surface font-bold text-base mb-1">Global Diversified</h4>
                  <p className="text-xs text-on-surface-variant leading-relaxed">A balanced basket of aviation, marine, property, and cyber risk across all major jurisdictions.</p>
                </button>
              </div>
            </section>

            <section className="bg-surface-container-low rounded-xl p-8 border border-outline-variant/5">
              <h3 className="text-sm font-mono uppercase tracking-[0.2em] text-primary mb-6">3. Accreditation Status</h3>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-mono uppercase text-on-surface-variant">Annual Income (USD)</label>
                    <Input
                      placeholder="$200,000+"
                      value={income}
                      onChange={(e) => setIncome(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-mono uppercase text-on-surface-variant">Net Worth (Excl. Primary Residence)</label>
                    <Input
                      placeholder="$1,000,000+"
                      value={netWorth}
                      onChange={(e) => setNetWorth(e.target.value)}
                    />
                  </div>
                </div>
                <label className="flex items-start gap-3 cursor-pointer group">
                  <Checkbox checked={accredited} onChange={(e) => setAccredited(Boolean((e.target as HTMLInputElement).checked))} />
                  <span className="text-xs text-on-surface-variant leading-relaxed group-hover:text-on-surface transition-colors">I hereby confirm that I am an "Accredited Investor" as defined under Rule 501 of Regulation D of the Securities Act of 1933.</span>
                </label>
              </div>
            </section>
          </div>

          <div className="col-span-12 lg:col-span-5 space-y-6">
            <div className="glass-panel rounded-xl p-6 border border-primary/10 sticky top-24">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-lg font-bold font-headline">Yield Projection</h3>
                  <p className="text-xs text-on-surface-variant">Modeled for 2024-2025 cycle</p>
                </div>
                <span className="text-xs font-mono bg-secondary-container/20 text-secondary px-2 py-1 rounded">Optimized</span>
              </div>

              <div className="h-48 w-full mb-8 relative flex items-end gap-1">
                <div className="flex-1 bg-primary/20 h-[30%] rounded-t-sm"></div>
                <div className="flex-1 bg-primary/30 h-[45%] rounded-t-sm"></div>
                <div className="flex-1 bg-primary/40 h-[60%] rounded-t-sm"></div>
                <div className="flex-1 bg-primary/60 h-[80%] rounded-t-sm relative">
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-surface-bright p-2 rounded text-[10px] font-mono border border-outline-variant shadow-xl">Expected Peak</div>
                </div>
                <div className="flex-1 bg-primary/40 h-[50%] rounded-t-sm"></div>
                <div className="flex-1 bg-primary/25 h-[35%] rounded-t-sm"></div>
              </div>

              <div className="space-y-4 pt-4 border-t border-outline-variant/10">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-on-surface-variant uppercase tracking-wider">Projected APY</span>
                  <span className="font-mono text-primary text-lg">{yieldTarget.toFixed(2)}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-on-surface-variant uppercase tracking-wider">Annualized Volatility</span>
                  <span className="font-mono text-on-surface text-lg">1.2%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-on-surface-variant uppercase tracking-wider">Max Drawdown Target</span>
                  <span className="font-mono text-error text-lg">-2.4%</span>
                </div>
              </div>

              <div className="mt-8">
                <Button style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
                  <span>Continue to Verification</span>
                  <span className="material-symbols-outlined">arrow_forward</span>
                </Button>
                <p className="text-[10px] text-center text-on-surface-variant mt-4 font-mono">ENCRYPTED END-TO-END VIA SYNHETIX LEDGER</p>
              </div>
            </div>

            <div className="p-6 rounded-xl border border-outline-variant/10 bg-surface-container-low">
              <div className="flex items-start gap-4">
                <span className="material-symbols-outlined text-tertiary">warning</span>
                <div>
                  <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider mb-2">Institutional Disclosure</h4>
                  <p className="text-[11px] leading-relaxed text-on-surface-variant">Reinsurance capital involves significant risk of loss. The "Conservative" profile minimizes but does not eliminate catastrophic event exposure. Ensure you have reviewed the <a className="text-primary underline decoration-primary/30" href="#">Master Risk Disclosure</a> before proceeding.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
    </>
  );
};

export default PreferencePage;

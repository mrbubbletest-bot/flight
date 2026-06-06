"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PlaneTakeoff, PlaneLanding, Calendar, Users, Briefcase, Plus, X, Search, Trash2 } from "lucide-react";
import AutocompleteInput from "@/components/AutocompleteInput";
import styles from "./page.module.css";

type DestMode = "single" | "multi";
type TripType = "oneway" | "roundtrip";

const DEFAULT_LEGS = [
  { id: 1, origin: "", dest: "", minDays: "3", maxDays: "5", cabin: "economy", maxStops: "any" },
  { id: 2, origin: "", dest: "", minDays: "2", maxDays: "4", cabin: "economy", maxStops: "any" }
];

export default function Home() {
  const router = useRouter();
  
  // Initialization state to prevent hydration mismatch
  const [isLoaded, setIsLoaded] = useState(false);

  // Tab states
  const [destMode, setDestMode] = useState<DestMode>("single");
  const [tripType, setTripType] = useState<TripType>("roundtrip");
  
  // API Provider state
  const [provider, setProvider] = useState<"rapidapi" | "serpapi">("rapidapi");
  const [quota, setQuota] = useState<{ rapidapi: string, serpapi: string } | null>(null);
  
  // Basic search state
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [departDate, setDepartDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  
  // Multi-city state (Array of legs)
  const [legs, setLegs] = useState(DEFAULT_LEGS);

  const [passengers, setPassengers] = useState("1");
  const [globalCabin, setGlobalCabin] = useState("economy");
  const [globalMaxStops, setGlobalMaxStops] = useState("any");

  // Load from sessionStorage and fetch quota
  useEffect(() => {
    const saved = sessionStorage.getItem('flightSearchState');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.destMode) setDestMode(parsed.destMode);
        if (parsed.tripType) setTripType(parsed.tripType);
        if (parsed.origin) setOrigin(parsed.origin);
        if (parsed.destination) setDestination(parsed.destination);
        if (parsed.departDate) setDepartDate(parsed.departDate);
        if (parsed.returnDate) setReturnDate(parsed.returnDate);
        if (parsed.legs) setLegs(parsed.legs);
        if (parsed.passengers) setPassengers(parsed.passengers);
        if (parsed.globalCabin) setGlobalCabin(parsed.globalCabin);
        if (parsed.globalMaxStops) setGlobalMaxStops(parsed.globalMaxStops);
        if (parsed.provider) setProvider(parsed.provider);
      } catch (e) {
        console.error("Failed to parse session storage", e);
      }
    }
    setIsLoaded(true);

    // Fetch API Quotas
    fetch('/api/quota')
      .then(res => res.json())
      .then(data => setQuota(data))
      .catch(err => console.error("Quota fetch error", err));
  }, []);

  // Save to sessionStorage
  useEffect(() => {
    if (isLoaded) {
      sessionStorage.setItem('flightSearchState', JSON.stringify({
        destMode, tripType, origin, destination, departDate, returnDate, legs, passengers, globalCabin, globalMaxStops, provider
      }));
    }
  }, [destMode, tripType, origin, destination, departDate, returnDate, legs, passengers, globalCabin, globalMaxStops, provider, isLoaded]);

  const handleClearData = () => {
    setDestMode("single");
    setTripType("roundtrip");
    setOrigin("");
    setDestination("");
    setDepartDate("");
    setReturnDate("");
    setLegs(DEFAULT_LEGS);
    setPassengers("1");
    setGlobalCabin("economy");
    setGlobalMaxStops("any");
    sessionStorage.removeItem('flightSearchState');
  };

  const handleAddLeg = () => {
    setLegs([...legs, { id: Date.now(), origin: "", dest: "", minDays: "1", maxDays: "3", cabin: "economy", maxStops: "any" }]);
  };

  const handleRemoveLeg = (id: number) => {
    if (legs.length > 2) {
      setLegs(legs.filter(leg => leg.id !== id));
    }
  };

  const handleLegChange = (id: number, field: string, value: string) => {
    setLegs(legs.map(leg => leg.id === id ? { ...leg, [field]: value } : leg));
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // For prototype: we just encode the global cabin in URL. 
    // In a real app, the legs data could be passed via POST or complex query string.
    const query = new URLSearchParams({
      type: destMode === "multi" ? "multicity" : tripType,
      trip: tripType,
      pax: passengers,
      cabin: globalCabin,
      stops: globalMaxStops,
      provider: provider,
    });
    router.push(`/results?${query.toString()}`);
  };

  if (!isLoaded) return null; // Prevent hydration flash

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>AeroHunt</h1>
        <p className={styles.subtitle}>Discover the smartest flight combinations</p>
        
        {/* API Provider Switch & Quota */}
        {quota && (
          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', borderRadius: '20px', padding: '4px' }}>
              <button
                type="button"
                onClick={() => setProvider("rapidapi")}
                style={{
                  padding: '6px 16px', borderRadius: '16px', fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s',
                  background: provider === 'rapidapi' ? 'var(--primary-color)' : 'transparent',
                  color: 'white', border: 'none'
                }}
              >
                RapidAPI
              </button>
              <button
                type="button"
                onClick={() => setProvider("serpapi")}
                style={{
                  padding: '6px 16px', borderRadius: '16px', fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s',
                  background: provider === 'serpapi' ? 'var(--primary-color)' : 'transparent',
                  color: 'white', border: 'none'
                }}
              >
                SerpAPI
              </button>
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              剩餘次數: RapidAPI ({quota.rapidapi}) | SerpAPI ({quota.serpapi})
            </div>
          </div>
        )}
      </header>

      <main className={`glass-panel animate-fade-in ${styles.searchContainer}`}>
        {/* Header Actions (Clear) */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
          <button 
            type="button"
            onClick={handleClearData}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '6px', 
              color: 'var(--text-secondary)', background: 'transparent', 
              fontSize: '0.9rem', cursor: 'pointer', transition: 'color 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.color = 'var(--error-color)'}
            onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
          >
            <Trash2 size={16} /> 清除資料 (Clear)
          </button>
        </div>

        {/* Main Tabs: DestMode */}
        <div className={styles.tabs} style={{ justifyContent: 'center' }}>
          <button 
            className={`${styles.tab} ${destMode === "single" ? styles.activeTab : ""}`}
            onClick={() => setDestMode("single")}
            type="button"
          >
            單一目的地 (Single Destination)
          </button>
          <button 
            className={`${styles.tab} ${destMode === "multi" ? styles.activeTab : ""}`}
            onClick={() => setDestMode("multi")}
            type="button"
          >
            多個目的地 (Multi-city)
          </button>
        </div>

        {/* Sub Tabs: TripType (For both Single and Multi-city) */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', justifyContent: 'center' }}>
          <button 
            onClick={() => setTripType("oneway")}
            type="button"
            style={{ 
              padding: '6px 16px', 
              borderRadius: '20px', 
              border: '1px solid var(--glass-border)', 
              background: tripType === 'oneway' ? 'rgba(255,255,255,0.15)' : 'transparent', 
              color: 'white', 
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontSize: '0.9rem'
            }}
          >
            單程 (One-way)
          </button>
          <button 
            onClick={() => setTripType("roundtrip")}
            type="button"
            style={{ 
              padding: '6px 16px', 
              borderRadius: '20px', 
              border: '1px solid var(--glass-border)', 
              background: tripType === 'roundtrip' ? 'rgba(255,255,255,0.15)' : 'transparent', 
              color: 'white', 
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontSize: '0.9rem'
            }}
          >
            來回 (Round-trip)
          </button>
        </div>

        <form onSubmit={handleSearch}>
          {/* Passenger & Global Cabin Row */}
          <div className={styles.row} style={{ marginBottom: "24px" }}>
            <div className={styles.inputGroup}>
              <label className={styles.label}>人數 Passengers</label>
              <div className={styles.inputWrapper}>
                <Users className={styles.icon} size={20} />
                <input 
                  type="number" 
                  min="1" 
                  className={`glass-input ${styles.input}`} 
                  value={passengers}
                  onChange={(e) => setPassengers(e.target.value)}
                />
              </div>
            </div>
            
            {/* Global Cabin Class - only for single destination mode */}
            {destMode === "single" && (
              <>
                <div className={styles.inputGroup}>
                  <label className={styles.label}>艙等 Cabin Class</label>
                  <div className={styles.inputWrapper}>
                    <Briefcase className={styles.icon} size={20} />
                    <select 
                      className={`glass-input ${styles.input} ${styles.select}`}
                      value={globalCabin}
                      onChange={(e) => setGlobalCabin(e.target.value)}
                    >
                      <option value="economy">經濟艙 Economy</option>
                      <option value="premium_economy">豪經艙 Premium Economy</option>
                      <option value="business">商務艙 Business</option>
                      <option value="first">頭等艙 First</option>
                    </select>
                  </div>
                </div>
                <div className={styles.inputGroup}>
                  <label className={styles.label}>轉機限制 Stops</label>
                  <div className={styles.inputWrapper}>
                    <select 
                      className={`glass-input ${styles.input} ${styles.select}`}
                      value={globalMaxStops}
                      onChange={(e) => setGlobalMaxStops(e.target.value)}
                    >
                      <option value="any">不限 Any</option>
                      <option value="0">直飛 Direct Only</option>
                      <option value="1">最多一次轉機 Up to 1 Stop</option>
                    </select>
                  </div>
                </div>
              </>
            )}
          </div>

          {destMode === "single" && (
            <div className={styles.formGrid}>
              <div className={styles.row}>
                <div className={styles.inputGroup}>
                  <label className={styles.label}>出發地 From</label>
                  <AutocompleteInput 
                    value={origin} 
                    onChange={setOrigin} 
                    placeholder="e.g. Taiwan or TPE"
                    icon={PlaneTakeoff}
                    iconClassName={styles.icon}
                    inputClassName={`glass-input ${styles.input}`}
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label className={styles.label}>目的地 To</label>
                  <AutocompleteInput 
                    value={destination} 
                    onChange={setDestination} 
                    placeholder="e.g. Japan or NRT"
                    icon={PlaneLanding}
                    iconClassName={styles.icon}
                    inputClassName={`glass-input ${styles.input}`}
                  />
                </div>
              </div>
              <div className={styles.row}>
                <div className={styles.inputGroup}>
                  <label className={styles.label}>出發日期 Depart</label>
                  <div className={styles.inputWrapper}>
                    <Calendar className={styles.icon} size={20} />
                    <input 
                      type="date" 
                      className={`glass-input ${styles.input}`}
                      value={departDate}
                      onChange={(e) => setDepartDate(e.target.value)}
                      required
                    />
                  </div>
                </div>
                {tripType === "roundtrip" && (
                  <div className={styles.inputGroup}>
                    <label className={styles.label}>回程日期 Return</label>
                    <div className={styles.inputWrapper}>
                      <Calendar className={styles.icon} size={20} />
                      <input 
                        type="date" 
                        className={`glass-input ${styles.input}`}
                        value={returnDate}
                        onChange={(e) => setReturnDate(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {destMode === "multi" && (
            <div className={styles.formGrid}>
              {legs.map((leg, index) => (
                <div key={leg.id} className={styles.legContainer}>
                  {legs.length > 2 && (
                    <button type="button" className={styles.removeLegBtn} onClick={() => handleRemoveLeg(leg.id)}>
                      <X size={18} />
                    </button>
                  )}
                  <h4 style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>航段 Leg {index + 1}</h4>
                  
                  <div className={styles.row} style={{ marginBottom: '16px' }}>
                    <div className={styles.inputGroup}>
                      <label className={styles.label}>出發地 From</label>
                      <AutocompleteInput 
                        value={leg.origin} 
                        onChange={(val) => handleLegChange(leg.id, "origin", val)} 
                        placeholder="Origin"
                        icon={PlaneTakeoff}
                        iconClassName={styles.icon}
                        inputClassName={`glass-input ${styles.input}`}
                      />
                    </div>
                    <div className={styles.inputGroup}>
                      <label className={styles.label}>目的地 To (支援國家)</label>
                      <AutocompleteInput 
                        value={leg.dest} 
                        onChange={(val) => handleLegChange(leg.id, "dest", val)} 
                        placeholder="e.g. Japan"
                        icon={PlaneLanding}
                        iconClassName={styles.icon}
                        inputClassName={`glass-input ${styles.input}`}
                      />
                    </div>
                  </div>
                  
                  <div className={styles.row}>
                    <div className={styles.inputGroup}>
                      <label className={styles.label}>停留天數區間 (Min - Max Days)</label>
                      <div className={styles.row}>
                        <div className={styles.inputWrapper} style={{ flex: 1 }}>
                          <input 
                            type="number" 
                            min="0" 
                            placeholder="Min" 
                            className={`glass-input ${styles.input}`} 
                            value={leg.minDays} 
                            onChange={(e) => handleLegChange(leg.id, "minDays", e.target.value)}
                            required 
                          />
                        </div>
                        <span style={{ display: 'flex', alignItems: 'center', color: 'var(--text-secondary)' }}>-</span>
                        <div className={styles.inputWrapper} style={{ flex: 1 }}>
                          <input 
                            type="number" 
                            min="0" 
                            placeholder="Max" 
                            className={`glass-input ${styles.input}`} 
                            value={leg.maxDays} 
                            onChange={(e) => handleLegChange(leg.id, "maxDays", e.target.value)}
                            required 
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className={styles.inputGroup}>
                      <label className={styles.label}>轉機限制 Stops</label>
                      <div className={styles.inputWrapper}>
                        <select 
                          className={`glass-input ${styles.input} ${styles.select}`}
                          value={leg.maxStops || "any"}
                          onChange={(e) => handleLegChange(leg.id, "maxStops", e.target.value)}
                        >
                          <option value="any">不限 Any</option>
                          <option value="0">直飛 Direct Only</option>
                          <option value="1">最多一次轉機 Up to 1 Stop</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className={styles.row}>
                    <div className={styles.inputGroup}>
                      <label className={styles.label}>艙等 Cabin Class</label>
                      <div className={styles.inputWrapper}>
                        <Briefcase className={styles.icon} size={20} />
                        <select 
                          className={`glass-input ${styles.input} ${styles.select}`}
                          value={leg.cabin}
                          onChange={(e) => handleLegChange(leg.id, "cabin", e.target.value)}
                        >
                          <option value="economy">經濟艙 Economy</option>
                          <option value="premium_economy">豪經艙 Premium Economy</option>
                          <option value="business">商務艙 Business</option>
                          <option value="first">頭等艙 First</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {index === 0 && (
                    <div className={styles.row} style={{ marginTop: '16px' }}>
                       <div className={styles.inputGroup}>
                         <label className={styles.label}>首段出發日期 (Start Date)</label>
                         <div className={styles.inputWrapper}>
                           <Calendar className={styles.icon} size={20} />
                           <input 
                             type="date" 
                             className={`glass-input ${styles.input}`} 
                             value={departDate}
                             onChange={(e) => setDepartDate(e.target.value)}
                             required 
                           />
                         </div>
                       </div>
                    </div>
                  )}
                </div>
              ))}
              <button type="button" className={styles.addLegBtn} onClick={handleAddLeg}>
                <Plus size={20} /> 新增航段 Add Leg
              </button>
            </div>
          )}

          <button type="submit" className={`primary-btn ${styles.submitBtn}`}>
            <Search size={22} />
            搜尋最佳組合 Search Combinations
          </button>
        </form>
      </main>
    </div>
  );
}

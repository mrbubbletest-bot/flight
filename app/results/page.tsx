"use client";

import { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, Clock, DollarSign, ExternalLink, Plane } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import styles from './page.module.css';

interface Leg {
  origin: string;
  dest: string;
  airline: string;
  flightNo: string;
  departTime: string;
  arrivalTime: string;
  durationMin: number;
  price?: number;
  airlineLogo?: string;
  stops?: number;
}

interface Combination {
  id: string;
  totalPrice: number;
  totalDurationMin: number;
  legs: Leg[];
}

import { Suspense } from 'react';

function ResultsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [searchState, setSearchState] = useState<any>(null);
  const [data, setData] = useState<Combination[]>([]);
  const [rateLimit, setRateLimit] = useState<{ limit: string | null; remaining: string | null; reset: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters & Sorting
  const [sortBy, setSortBy] = useState<'price' | 'duration'>('price');
  const [selectedAirlines, setSelectedAirlines] = useState<Set<string>>(new Set());

  // Load state from sessionStorage
  useEffect(() => {
    const saved = sessionStorage.getItem('flightSearchState');
    if (saved) {
      try {
        setSearchState(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse search state", e);
        setError("無法載入搜尋設定，將使用預設資料。");
      }
    } else {
      setError("無搜尋設定，請返回首頁重新搜尋。");
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!searchState) return;

    const fetchFlights = async () => {
      setLoading(true);
      setError(null);
      setRateLimit(null);
      try {
        const params = new URLSearchParams();
        params.append('destMode', searchState.destMode);
        params.append('tripType', searchState.tripType);
        params.append('pax', searchState.passengers || '1');
        params.append('provider', searchState.provider || 'rapidapi');

        if (searchState.destMode === 'single') {
          params.append('origin', searchState.origin);
          params.append('destination', searchState.destination);
          params.append('departDate', searchState.departDate);
          if (searchState.tripType === 'roundtrip') {
            params.append('returnDate', searchState.returnDate || '');
          }
          params.append('cabin', searchState.globalCabin || 'economy');
          if (searchState.globalMaxStops && searchState.globalMaxStops !== 'any') {
            params.append('maxStops', searchState.globalMaxStops);
          }
        } else {
          params.append('legs', JSON.stringify(searchState.legs));
          params.append('departDate', searchState.departDate || '');
        }

        const res = await fetch(`/api/flights?${params.toString()}`);
        const result = await res.json();
        
        if (result.error) {
          setError(`API 提示: ${result.error} (已自動載入離線/快取資料)`);
        }
        setData(result.combinations || []);
        if (result.rateLimit) {
          setRateLimit(result.rateLimit);
        }
      } catch (err: any) {
        console.error(err);
        setError("連線失敗，請檢查網路或稍後再試。");
      } finally {
        setLoading(false);
      }
    };

    fetchFlights();
  }, [searchState]);

  const allAirlines = useMemo(() => {
    const airlines = new Set<string>();
    data.forEach(comb => {
      comb.legs.forEach(leg => {
        if (leg.airline) {
          leg.airline.split(', ').forEach((a: string) => airlines.add(a));
        }
      });
    });
    return Array.from(airlines).sort();
  }, [data]);

  const toggleAirline = (airline: string) => {
    const newSelected = new Set(selectedAirlines);
    if (newSelected.has(airline)) {
      newSelected.delete(airline);
    } else {
      newSelected.add(airline);
    }
    setSelectedAirlines(newSelected);
  };

  const filteredAndSortedData = useMemo(() => {
    let result = [...data];
    
    // Filter by airline
    if (selectedAirlines.size > 0) {
      result = result.filter(comb => {
        return comb.legs.some(leg => {
          if (!leg.airline) return false;
          return leg.airline.split(', ').some((a: string) => selectedAirlines.has(a));
        });
      });
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'price') return a.totalPrice - b.totalPrice;
      return a.totalDurationMin - b.totalDurationMin;
    });

    return result;
  }, [data, selectedAirlines, sortBy]);

  const formatDuration = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  };

  const formatTime = (isoString: string) => {
    try {
      return format(parseISO(isoString), 'HH:mm');
    } catch(e) {
      return "00:00";
    }
  };
  
  const formatDate = (isoString: string) => {
    try {
      return format(parseISO(isoString), 'MMM dd');
    } catch(e) {
      return "";
    }
  };

  const getBookingUrl = (legs: Leg[]) => {
    if (legs.length === 0) return "https://www.google.com/travel/flights";
    
    const formatDateForQuery = (isoStr: string) => {
      try {
        return format(parseISO(isoStr), 'yyyy-MM-dd');
      } catch (e) {
        return isoStr.split('T')[0];
      }
    };

    if (legs.length === 1) {
      const leg = legs[0];
      return `https://www.google.com/travel/flights?q=Flights from ${leg.origin} to ${leg.dest} on ${formatDateForQuery(leg.departTime)}`;
    } else if (legs.length === 2 && legs[0].origin === legs[1].dest && legs[0].dest === legs[1].origin) {
      // Round-trip
      const leg0 = legs[0];
      const leg1 = legs[1];
      return `https://www.google.com/travel/flights?q=Flights from ${leg0.origin} to ${leg0.dest} on ${formatDateForQuery(leg0.departTime)} through ${formatDateForQuery(leg1.departTime)}`;
    } else {
      // Multi-city
      let query = `Flights from ${legs[0].origin} to ${legs[0].dest} on ${formatDateForQuery(legs[0].departTime)}`;
      for (let i = 1; i < legs.length; i++) {
        query += ` then to ${legs[i].dest} on ${formatDateForQuery(legs[i].departTime)}`;
      }
      return `https://www.google.com/travel/flights?q=${encodeURIComponent(query)}`;
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <button onClick={() => router.back()} className={styles.backBtn}>
            <ArrowLeft size={20} />
            返回搜尋 Back
          </button>
        </div>
        <h1 className={styles.title}>
          搜尋結果 Results
          {searchState && (
            <span style={{ fontSize: '1rem', marginLeft: '12px', opacity: 0.8, fontWeight: 'normal' }}>
              (使用 {searchState.provider === 'serpapi' ? 'SerpAPI / Google Flights' : 'RapidAPI / Skyscanner'})
            </span>
          )}
        </h1>
      </header>

      <div className={styles.layout}>
        {/* Sidebar */}
        <aside className={`glass-panel ${styles.sidebar}`}>
          <div className={styles.filterGroup}>
            <h3 className={styles.filterTitle}>排序方式 Sort By</h3>
            <div className={styles.sortControls}>
              <button 
                className={`${styles.sortBtn} ${sortBy === 'price' ? styles.active : ''}`}
                onClick={() => setSortBy('price')}
              >
                <DollarSign size={18} style={{ margin: '0 auto 8px' }} />
                總價最低<br/>Price
              </button>
              <button 
                className={`${styles.sortBtn} ${sortBy === 'duration' ? styles.active : ''}`}
                onClick={() => setSortBy('duration')}
              >
                <Clock size={18} style={{ margin: '0 auto 8px' }} />
                飛行最短<br/>Duration
              </button>
            </div>
          </div>

          {!loading && allAirlines.length > 0 && (
            <div className={styles.filterGroup}>
              <h3 className={styles.filterTitle}>航空公司 Airlines</h3>
              {allAirlines.map(airline => (
                <label key={airline} className={styles.checkboxLabel}>
                  <input 
                    type="checkbox" 
                    checked={selectedAirlines.has(airline)}
                    onChange={() => toggleAirline(airline)}
                  />
                  {airline}
                </label>
              ))}
            </div>
          )}
        </aside>

        {/* List */}
        <main className={styles.list}>
          {rateLimit && (
            <div style={{
              background: 'rgba(59, 130, 246, 0.15)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              color: '#93c5fd',
              padding: '12px 16px',
              borderRadius: '8px',
              marginBottom: '16px',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>💡</span> 
              <span>
                RapidAPI 額度提醒：本月總額度 {rateLimit.limit} 次，剩餘 {rateLimit.remaining} 次 
                {rateLimit.reset ? ` (將於 ${(() => {
                  const s = parseInt(rateLimit.reset, 10);
                  if (isNaN(s)) return rateLimit.reset + ' 秒';
                  const h = Math.floor(s / 3600);
                  const m = Math.floor((s % 3600) / 60);
                  if (h > 0) return `${h} 小時 ${m} 分鐘`;
                  return `${m} 分鐘`;
                })()}後重置)` : ''}
              </span>
            </div>
          )}

          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#fca5a5',
              padding: '12px 16px',
              borderRadius: '8px',
              marginBottom: '16px',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>⚠️</span> {error}
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>
              <div className="spinner" style={{ marginBottom: '16px' }}></div>
              正在搜尋最佳機票組合，請稍候...
            </div>
          ) : filteredAndSortedData.length === 0 ? (
            <div className="glass-panel" style={{ textAlign: 'center', padding: '60px' }}>
              無符合條件的航班組合，請嘗試調整日期或搜尋範圍。
            </div>
          ) : (
            filteredAndSortedData.map(comb => (
              <div key={comb.id} className={`glass-panel animate-fade-in ${styles.card}`}>
                <div className={styles.cardHeader}>
                  <div>
                    <div className={styles.price}>TWD {comb.totalPrice.toLocaleString()}</div>
                    <div className={styles.duration}>
                      總時長 Total: {formatDuration(comb.totalDurationMin)}
                    </div>
                  </div>
                </div>

                {comb.legs.map((leg: any, idx) => (
                  <div key={idx} className={styles.leg}>
                    <div className={styles.legTime}>
                      <span className={styles.timeText}>{formatTime(leg.departTime)}</span>
                      <span className={styles.airportText}>{leg.origin}</span>
                      <span className={styles.airportText}>{formatDate(leg.departTime)}</span>
                    </div>
                    
                    <div className={styles.flightLine}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                        {leg.airlineLogo && (
                          <img 
                            src={leg.airlineLogo} 
                            alt={leg.airline} 
                            style={{ width: '18px', height: '18px', objectFit: 'contain', borderRadius: '2px' }}
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                        )}
                        <span className={styles.airline}>{leg.airline} ({leg.flightNo})</span>
                      </div>
                      <div className={styles.line}></div>
                      <span className={styles.legDuration}>
                        {formatDuration(leg.durationMin)}
                        {leg.stops !== undefined && (
                          <span style={{ 
                            display: 'block', fontSize: '0.7rem', 
                            color: leg.stops === 0 ? 'var(--success-color)' : 'var(--text-secondary)',
                            marginTop: '2px'
                          }}>
                            {leg.stops === 0 ? '直飛 Direct' : `${leg.stops} 轉 Stop${leg.stops > 1 ? 's' : ''}`}
                          </span>
                        )}
                      </span>
                    </div>

                    <div className={styles.legTime}>
                      <span className={styles.timeText}>{formatTime(leg.arrivalTime)}</span>
                      <span className={styles.airportText}>{leg.dest}</span>
                      <span className={styles.airportText}>{formatDate(leg.arrivalTime)}</span>
                    </div>
                  </div>
                ))}

                <a 
                  href={getBookingUrl(comb.legs)} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={styles.bookBtn}
                >
                  前往 Google Flights 訂購 <ExternalLink size={18} />
                </a>
              </div>
            ))
          )}
        </main>
      </div>
    </div>
  );
}

export default function Results() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: '100px', color: 'var(--text-secondary)' }}>載入中...</div>}>
      <ResultsContent />
    </Suspense>
  );
}

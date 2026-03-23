"use client";

import React, { useMemo, useState, useEffect, useCallback } from 'react';
// @ts-ignore - react-simple-maps does not have type definitions
import { ComposableMap, Geographies, Geography, Sphere, Graticule } from 'react-simple-maps';
import { scaleLinear } from 'd3-scale';
import { NUMERIC_TO_ALPHA2, COUNTRY_NAMES_KO } from '@/components/charts/WorldSalesMap';
import { numberFormat } from '@/utils/snapshotTransformers';

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

// Format value in 억: show 1 decimal if < 1억, otherwise show integer
function formatEok(value: number): string {
  const eok = value / 100_000_000;
  if (Math.abs(eok) < 1) {
    return eok.toLocaleString("ko-KR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  }
  return numberFormat(Math.round(eok));
}

interface CountryData {
  countryCode: string;
  totalSales: number;
  operatingProfit: number;
  opm: number;
}

interface DetailRow {
  name: string;
  totalSales: number;
  operatingProfit: number;
  opm: number;
}

interface CountryPerformance {
  name: string;
  sales: number;
  operatingProfit: number;
  opm: number;
}

interface CountryDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  countries: CountryData[];
  onCountrySelect?: (countryCode: string) => void;
  onBackToAll?: () => void;
  countryDetailData?: {
    topCustomers: CountryPerformance[];
    topProducts: CountryPerformance[];
    topChannels: CountryPerformance[];
  };
  onCustomerClick?: (customerName: string) => void;
  onProductClick?: (productName: string) => void;
}

interface HoveredCountry {
  name: string;
  totalSales: number | null;
  opm: number | null;
}

const MEDALS = ['🥇', '🥈', '🥉'];

export function CountryDetailModal({
  isOpen,
  onClose,
  countries,
  onCountrySelect,
  onBackToAll,
  countryDetailData,
  onCustomerClick,
  onProductClick
}: CountryDetailModalProps) {
  const [hovered, setHovered] = useState<HoveredCountry | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setSelectedCountry(null);
      setHovered(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedCountry) {
          setSelectedCountry(null);
        } else {
          onClose();
        }
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, selectedCountry, onClose]);

  const salesByCountry = useMemo(() => {
    const map = new Map<string, CountryData>();
    countries.forEach(d => map.set(d.countryCode, d));
    return map;
  }, [countries]);

  const colorScale = useMemo(() => {
    const maxSales = Math.max(...countries.map(d => d.totalSales), 1);
    return scaleLinear<string>()
      .domain([0, maxSales * 0.3, maxSales])
      .range(['#dbeafe', '#3b82f6', '#1e40af']);
  }, [countries]);

  const totalSales = useMemo(() => countries.reduce((s, d) => s + d.totalSales, 0), [countries]);

  const handleMouseEnter = useCallback((geo: { id: string; properties: Record<string, string> }) => {
    const alpha2 = NUMERIC_TO_ALPHA2[geo.id];
    if (!alpha2) return;
    const countryData = salesByCountry.get(alpha2);
    const name = COUNTRY_NAMES_KO[alpha2] || geo.properties.name || alpha2;
    setHovered({
      name,
      totalSales: countryData?.totalSales ?? null,
      opm: countryData?.opm ?? null,
    });
  }, [salesByCountry]);

  const handleMouseLeave = useCallback(() => setHovered(null), []);

  const handleCountryClick = useCallback((code: string) => {
    if (salesByCountry.has(code)) {
      setSelectedCountry(code);
      onCountrySelect?.(code);
    }
  }, [salesByCountry, onCountrySelect]);

  const selectedCountryData = selectedCountry ? salesByCountry.get(selectedCountry) : null;
  const selectedCountryName = selectedCountry
    ? COUNTRY_NAMES_KO[selectedCountry] || selectedCountry
    : '';

  if (!isOpen) return null;

  const maxSalesInRanking = countries.length > 0 ? countries[0].totalSales : 1;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: 16,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          width: '95vw',
          maxWidth: 1280,
          height: '85vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'modalIn 200ms ease-out'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 24px',
          borderBottom: '1px solid #f1f5f9',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              padding: 8,
              background: '#eff6ff',
              borderRadius: 8
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="2" y1="12" x2="22" y2="12"/>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
            </div>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b' }}>국가별 매출 분포</h2>
              <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                총 {countries.length}개국 · 매출 합계 {numberFormat(Math.round(totalSales))}억
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: 8,
              borderRadius: 8,
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f1f5f9';
              e.currentTarget.style.color = '#475569';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = '#94a3b8';
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
          {/* Left: Map */}
          <div style={{ flex: 2, minWidth: 0, display: 'flex', flexDirection: 'column', padding: 20, borderRight: '1px solid #f1f5f9' }}>
            {/* Hover tooltip */}
            <div style={{
              flexShrink: 0,
              marginBottom: 12,
              borderRadius: 8,
              padding: '10px 16px',
              background: hovered ? '#1e293b' : '#f8fafc',
              minHeight: 40,
              transition: 'all 0.15s'
            }}>
              {hovered ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#ffffff' }}>{hovered.name}</span>
                  {hovered.totalSales !== null ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 14 }}>
                      <span style={{ color: '#cbd5e1' }}>
                        매출{' '}
                        <span style={{ color: '#ffffff', fontWeight: 600 }}>
                          {numberFormat(Math.round(hovered.totalSales))}
                        </span>
                        <span style={{ color: '#94a3b8' }}>억</span>
                      </span>
                      <span style={{ color: '#cbd5e1' }}>
                        영업이익{' '}
                        <span style={{
                          fontWeight: 600,
                          color: (hovered.opm ?? 0) < 0 ? '#fca5a5' : '#6ee7b7'
                        }}>
                          {hovered.opm}%
                        </span>
                      </span>
                    </div>
                  ) : (
                    <span style={{ fontSize: 14, color: '#94a3b8' }}>매출 데이터 없음</span>
                  )}
                </div>
              ) : (
                <p style={{ fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: '20px' }}>
                  국가에 마우스를 올리거나 클릭하여 상세 정보를 확인하세요
                </p>
              )}
            </div>

            {/* Map */}
            <div style={{ flex: 1, minHeight: 0 }}>
              <ComposableMap
                projection="geoNaturalEarth1"
                projectionConfig={{ scale: 160, center: [0, 5] }}
                width={800}
                height={450}
                style={{ width: '100%', height: '100%' }}
              >
                <Sphere id="modal-sphere-bg" fill="#f8fafc" stroke="#e2e8f0" strokeWidth={0.5} />
                <Graticule stroke="#e2e8f0" strokeWidth={0.3} />
                <Geographies geography={GEO_URL}>
                  {({ geographies }: { geographies: any }) =>
                    geographies.map((geo: any) => {
                      const alpha2 = NUMERIC_TO_ALPHA2[geo.id];
                      const countryData = alpha2 ? salesByCountry.get(alpha2) : undefined;
                      const fill = countryData ? colorScale(countryData.totalSales) : '#f1f5f9';
                      const isSelected = alpha2 === selectedCountry;

                      return (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          fill={isSelected ? '#0ea5e9' : fill}
                          stroke={isSelected ? '#0369a1' : '#cbd5e1'}
                          strokeWidth={isSelected ? 1.5 : 0.3}
                          style={{
                            default: { outline: 'none' },
                            hover: { fill: '#0ea5e9', outline: 'none', cursor: 'pointer' },
                            pressed: { outline: 'none' },
                          }}
                          onMouseEnter={() => handleMouseEnter(geo)}
                          onMouseLeave={handleMouseLeave}
                          onClick={() => {
                            const a2 = NUMERIC_TO_ALPHA2[geo.id];
                            if (a2) handleCountryClick(a2);
                          }}
                        />
                      );
                    })
                  }
                </Geographies>
              </ComposableMap>
            </div>

            {/* Legend */}
            {countries.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexShrink: 0, paddingLeft: 8, paddingRight: 8 }}>
                <span style={{ fontSize: 12, color: '#94a3b8' }}>낮음</span>
                <div style={{
                  flex: 1,
                  height: 8,
                  borderRadius: 999,
                  background: 'linear-gradient(to right, #dbeafe, #3b82f6, #1e40af)',
                }} />
                <span style={{ fontSize: 12, color: '#94a3b8' }}>높음</span>
              </div>
            )}
          </div>

          {/* Right: Ranking */}
          <div style={{ width: 340, minWidth: 280, display: 'flex', flexDirection: 'column', background: '#fafafa' }}>
            {selectedCountry ? (
              /* Country Detail View */
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', flexShrink: 0, background: '#ffffff' }}>
                  <button
                    onClick={() => {
                      setSelectedCountry(null);
                      onBackToAll?.();
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 12,
                      color: '#2563eb',
                      fontWeight: 500,
                      marginBottom: 8,
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="19" y1="12" x2="5" y2="12"/>
                      <polyline points="12 19 5 12 12 5"/>
                    </svg>
                    전체 랭킹으로 돌아가기
                  </button>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b' }}>{selectedCountryName}</h3>
                  {selectedCountryData && (
                    <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                      <div style={{ fontSize: 12, color: '#64748b' }}>
                        매출{' '}
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>
                          {numberFormat(Math.round(selectedCountryData.totalSales))}억
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>
                        영업이익{' '}
                        <span style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: selectedCountryData.operatingProfit >= 0 ? '#1e293b' : '#ef4444'
                        }}>
                          {numberFormat(Math.round(selectedCountryData.operatingProfit))}억
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>
                        영업이익{' '}
                        <span style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: selectedCountryData.opm >= 0 ? '#10b981' : '#ef4444'
                        }}>
                          {selectedCountryData.opm.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
                  {countryDetailData ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      {/* Top Customers */}
                      {countryDetailData.topCustomers && countryDetailData.topCustomers.length > 0 && (
                        <div>
                          <h4 style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 10 }}>
                            Top 고객사 ({countryDetailData.topCustomers.length})
                          </h4>
                          <div style={{ background: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                              <thead>
                                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                  <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#64748b' }}>고객사</th>
                                  <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: '#64748b' }}>매출(억)</th>
                                  <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: '#64748b' }}>영업이익(%)</th>
                                </tr>
                              </thead>
                              <tbody>
                                {countryDetailData.topCustomers.slice(0, 10).map((customer, idx) => (
                                  <tr
                                    key={idx}
                                    style={{
                                      borderBottom: idx < 9 ? '1px solid #f1f5f9' : 'none',
                                      cursor: onCustomerClick ? 'pointer' : 'default',
                                      transition: 'background 0.2s'
                                    }}
                                    onClick={() => onCustomerClick?.(customer.name)}
                                    onMouseEnter={(e) => {
                                      if (onCustomerClick) e.currentTarget.style.background = '#f8fafc';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.background = 'transparent';
                                    }}
                                  >
                                    <td style={{ padding: '8px 12px', color: onCustomerClick ? '#2563eb' : '#0f172a', fontWeight: 500, textDecoration: onCustomerClick ? 'underline' : 'none' }}>{customer.name}</td>
                                    <td style={{ padding: '8px 12px', textAlign: 'right', color: '#0f172a' }}>
                                      {formatEok(customer.sales)}
                                    </td>
                                    <td style={{ padding: '8px 12px', textAlign: 'right', color: customer.opm >= 0 ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                                      {customer.opm.toFixed(1)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Top Products */}
                      {countryDetailData.topProducts && countryDetailData.topProducts.length > 0 && (
                        <div>
                          <h4 style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 10 }}>
                            Top 제품 ({countryDetailData.topProducts.length})
                          </h4>
                          <div style={{ background: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                              <thead>
                                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                  <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#64748b' }}>제품명</th>
                                  <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: '#64748b' }}>매출(억)</th>
                                  <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: '#64748b' }}>영업이익(%)</th>
                                </tr>
                              </thead>
                              <tbody>
                                {countryDetailData.topProducts.slice(0, 10).map((product, idx) => (
                                  <tr
                                    key={idx}
                                    style={{
                                      borderBottom: idx < 9 ? '1px solid #f1f5f9' : 'none',
                                      cursor: onProductClick ? 'pointer' : 'default',
                                      transition: 'background 0.2s'
                                    }}
                                    onClick={() => onProductClick?.(product.name)}
                                    onMouseEnter={(e) => {
                                      if (onProductClick) e.currentTarget.style.background = '#f8fafc';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.background = 'transparent';
                                    }}
                                  >
                                    <td style={{ padding: '8px 12px', color: onProductClick ? '#2563eb' : '#0f172a', fontWeight: 500, fontSize: 10, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: onProductClick ? 'underline' : 'none' }}>
                                      {product.name}
                                    </td>
                                    <td style={{ padding: '8px 12px', textAlign: 'right', color: '#0f172a' }}>
                                      {formatEok(product.sales)}
                                    </td>
                                    <td style={{ padding: '8px 12px', textAlign: 'right', color: product.opm >= 0 ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                                      {product.opm.toFixed(1)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Top Channels */}
                      {countryDetailData.topChannels && countryDetailData.topChannels.length > 0 && (
                        <div>
                          <h4 style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 10 }}>
                            Top 채널 ({countryDetailData.topChannels.length})
                          </h4>
                          <div style={{ background: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                              <thead>
                                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                  <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#64748b' }}>채널</th>
                                  <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: '#64748b' }}>매출(억)</th>
                                  <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: '#64748b' }}>영업이익(%)</th>
                                </tr>
                              </thead>
                              <tbody>
                                {countryDetailData.topChannels.slice(0, 10).map((channel, idx) => (
                                  <tr key={idx} style={{ borderBottom: idx < countryDetailData.topChannels.slice(0, 10).length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                                    <td style={{ padding: '8px 12px', color: '#0f172a', fontWeight: 500 }}>{channel.name}</td>
                                    <td style={{ padding: '8px 12px', textAlign: 'right', color: '#0f172a' }}>
                                      {formatEok(channel.sales)}
                                    </td>
                                    <td style={{ padding: '8px 12px', textAlign: 'right', color: channel.opm >= 0 ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                                      {channel.opm.toFixed(1)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{
                      background: '#f8fafc',
                      borderRadius: 12,
                      padding: '32px 20px',
                      textAlign: 'center',
                      border: '1px dashed #cbd5e1'
                    }}>
                      <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 8 }}>
                        데이터 로딩 중...
                      </p>
                      <p style={{ fontSize: 12, color: '#64748b' }}>
                        국가별 상세 데이터를 불러오고 있습니다
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Country Ranking View */
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>국가별 매출 랭킹</h3>
                  <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>클릭하면 상세 정보를 확인합니다</p>
                </div>
                <div style={{ flex: 1, overflow: 'auto' }}>
                  {countries.map((country, idx) => {
                    const name = COUNTRY_NAMES_KO[country.countryCode] || country.countryCode;
                    const barWidth = maxSalesInRanking > 0
                      ? Math.max(4, (country.totalSales / maxSalesInRanking) * 100)
                      : 0;
                    const ratio = totalSales > 0
                      ? ((country.totalSales / totalSales) * 100).toFixed(1)
                      : '0.0';

                    return (
                      <div
                        key={country.countryCode}
                        style={{
                          position: 'relative',
                          padding: '12px 20px',
                          borderBottom: '1px solid #f1f5f9',
                          cursor: 'pointer',
                          transition: 'background 0.2s'
                        }}
                        onClick={() => handleCountryClick(country.countryCode)}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#eff6ff';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        {/* Background bar */}
                        <div
                          style={{
                            position: 'absolute',
                            inset: 0,
                            background: '#dbeafe',
                            width: `${barWidth}%`,
                            transition: 'width 0.3s'
                          }}
                        />
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span style={{ width: 24, textAlign: 'center', fontSize: 14, fontWeight: 600, flexShrink: 0 }}>
                            {idx < 3 ? MEDALS[idx] : (
                              <span style={{ color: '#94a3b8', fontSize: 12 }}>{idx + 1}</span>
                            )}
                          </span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                              <span style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {name}
                              </span>
                              <span style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', flexShrink: 0 }}>
                                {numberFormat(Math.round(country.totalSales))}
                                <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 400, marginLeft: 2 }}>억</span>
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 2 }}>
                              <span style={{ fontSize: 12, color: '#94a3b8' }}>
                                비중 {ratio}%
                              </span>
                              <span style={{
                                fontSize: 12,
                                fontWeight: 500,
                                color: country.opm >= 0 ? '#10b981' : '#ef4444'
                              }}>
                                영업이익 {country.opm.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {countries.length === 0 && (
                    <div style={{ padding: '48px 20px', textAlign: 'center', fontSize: 14, color: '#94a3b8' }}>
                      국가별 매출 데이터가 없습니다
                    </div>
                  )}
                </div>
                {/* Summary footer */}
                <div style={{ padding: '12px 20px', borderTop: '1px solid #e2e8f0', background: '#ffffff', flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, color: '#64748b' }}>전체 매출 합계</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>
                      {numberFormat(Math.round(totalSales))}
                      <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 400, marginLeft: 2 }}>억</span>
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

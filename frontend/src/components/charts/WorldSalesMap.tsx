import React, { useMemo, useState, useCallback } from 'react';
// @ts-ignore - react-simple-maps does not have type definitions
import { ComposableMap, Geographies, Geography, Sphere, Graticule } from 'react-simple-maps';
import { scaleLinear } from 'd3-scale';

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

export const NUMERIC_TO_ALPHA2: Record<string, string> = {
  '004': 'AF', '008': 'AL', '012': 'DZ', '016': 'AS', '020': 'AD',
  '024': 'AO', '028': 'AG', '031': 'AZ', '032': 'AR', '036': 'AU',
  '040': 'AT', '044': 'BS', '048': 'BH', '050': 'BD', '051': 'AM',
  '052': 'BB', '056': 'BE', '064': 'BT', '068': 'BO', '070': 'BA',
  '072': 'BW', '076': 'BR', '084': 'BZ', '090': 'SB', '096': 'BN',
  '100': 'BG', '104': 'MM', '108': 'BI', '112': 'BY', '116': 'KH',
  '120': 'CM', '124': 'CA', '140': 'CF', '144': 'LK', '148': 'TD',
  '152': 'CL', '156': 'CN', '158': 'TW', '170': 'CO', '174': 'KM',
  '178': 'CG', '180': 'CD', '188': 'CR', '191': 'HR', '192': 'CU',
  '196': 'CY', '203': 'CZ', '204': 'BJ', '208': 'DK', '214': 'DO',
  '218': 'EC', '222': 'SV', '226': 'GQ', '231': 'ET', '232': 'ER',
  '233': 'EE', '242': 'FJ', '246': 'FI', '250': 'FR', '262': 'DJ',
  '266': 'GA', '268': 'GE', '270': 'GM', '275': 'PS', '276': 'DE',
  '288': 'GH', '300': 'GR', '320': 'GT', '324': 'GN', '328': 'GY',
  '332': 'HT', '340': 'HN', '344': 'HK', '348': 'HU', '352': 'IS',
  '356': 'IN', '360': 'ID', '364': 'IR', '368': 'IQ', '372': 'IE',
  '376': 'IL', '380': 'IT', '384': 'CI', '388': 'JM', '392': 'JP',
  '398': 'KZ', '400': 'JO', '404': 'KE', '408': 'KP', '410': 'KR',
  '414': 'KW', '417': 'KG', '418': 'LA', '422': 'LB', '426': 'LS',
  '428': 'LV', '430': 'LR', '434': 'LY', '440': 'LT', '442': 'LU',
  '450': 'MG', '454': 'MW', '458': 'MY', '462': 'MV', '466': 'ML',
  '470': 'MT', '478': 'MR', '480': 'MU', '484': 'MX', '496': 'MN',
  '498': 'MD', '499': 'ME', '504': 'MA', '508': 'MZ', '512': 'OM',
  '516': 'NA', '524': 'NP', '528': 'NL', '540': 'NC', '548': 'VU',
  '554': 'NZ', '558': 'NI', '562': 'NE', '566': 'NG', '578': 'NO',
  '586': 'PK', '591': 'PA', '598': 'PG', '600': 'PY', '604': 'PE',
  '608': 'PH', '616': 'PL', '620': 'PT', '624': 'GW', '626': 'TL',
  '630': 'PR', '634': 'QA', '642': 'RO', '643': 'RU', '646': 'RW',
  '682': 'SA', '686': 'SN', '688': 'RS', '694': 'SL', '702': 'SG',
  '703': 'SK', '704': 'VN', '705': 'SI', '706': 'SO', '710': 'ZA',
  '716': 'ZW', '724': 'ES', '728': 'SS', '729': 'SD', '740': 'SR',
  '748': 'SZ', '752': 'SE', '756': 'CH', '760': 'SY', '762': 'TJ',
  '764': 'TH', '768': 'TG', '780': 'TT', '784': 'AE', '788': 'TN',
  '792': 'TR', '795': 'TM', '800': 'UG', '804': 'UA', '807': 'MK',
  '818': 'EG', '826': 'GB', '834': 'TZ', '840': 'US', '854': 'BF',
  '858': 'UY', '860': 'UZ', '862': 'VE', '887': 'YE', '894': 'ZM',
  '-99': 'XK',
};

export const COUNTRY_NAMES_KO: Record<string, string> = {
  AU: '호주', CH: '스위스', CN: '중국', GB: '영국', HK: '홍콩',
  KR: '한국', KZ: '카자흐스탄', LU: '룩셈부르크', PH: '필리핀',
  RU: '러시아', SG: '싱가포르', TH: '태국', TW: '대만', US: '미국',
  VN: '베트남', AS: '아메리칸사모아', JP: '일본', DE: '독일', FR: '프랑스',
  IN: '인도', ID: '인도네시아', MY: '말레이시아', CA: '캐나다', BR: '브라질',
};

// Map country names from data to ISO Alpha-2 codes
const COUNTRY_NAME_TO_CODE: Record<string, string> = {
  '호주': 'AU', '스위스': 'CH', '중국': 'CN', '영국': 'GB', '홍콩': 'HK',
  '한국': 'KR', '카자흐스탄': 'KZ', '룩셈부르크': 'LU', '필리핀': 'PH',
  '러시아': 'RU', '싱가포르': 'SG', '태국': 'TH', '대만': 'TW', '미국': 'US',
  '베트남': 'VN', '일본': 'JP', '독일': 'DE', '프랑스': 'FR',
  '인도': 'IN', '인도네시아': 'ID', '말레이시아': 'MY', '캐나다': 'CA', '브라질': 'BR',
};

interface CountrySalesData {
  name: string;
  value: number;
}

interface HoveredCountry {
  name: string;
  totalSales: number | null;
}

interface WorldSalesMapProps {
  data: CountrySalesData[];
  title?: string;
  onCountryClick?: (countryName: string) => void;
  onExpand?: () => void;
}

export const WorldSalesMap: React.FC<WorldSalesMapProps> = ({
  data,
  title = '국가별 매출 분포',
  onCountryClick,
  onExpand
}) => {
  const [hovered, setHovered] = useState<HoveredCountry | null>(null);

  const salesByCountry = useMemo(() => {
    const map = new Map<string, number>();
    data.forEach(d => {
      // Try to get code from Korean name mapping first, otherwise use as-is (already a code)
      let code = COUNTRY_NAME_TO_CODE[d.name] || d.name;

      // Hong Kong (HK) is not a separate geography in world-atlas, merge with China (CN)
      if (code === 'HK') {
        code = 'CN';
      }

      // Verify it's a valid country code (exists in COUNTRY_NAMES_KO)
      if (COUNTRY_NAMES_KO[code] || code === 'CN') {
        const existingValue = map.get(code) || 0;
        map.set(code, existingValue + (d.value / 100_000_000)); // Convert to 억 and sum
      }
    });
    return map;
  }, [data]);

  const colorScale = useMemo(() => {
    const values = Array.from(salesByCountry.values());
    const maxSales = Math.max(...values, 1);
    return scaleLinear<string>()
      .domain([0, maxSales * 0.3, maxSales])
      .range(['#dbeafe', '#3b82f6', '#1e40af']);
  }, [salesByCountry]);

  const handleMouseEnter = useCallback((geo: { id: string; properties: Record<string, string> }) => {
    const alpha2 = NUMERIC_TO_ALPHA2[geo.id];
    if (!alpha2) return;

    const totalSales = salesByCountry.get(alpha2) ?? null;
    const name = COUNTRY_NAMES_KO[alpha2] || geo.properties.name || alpha2;

    setHovered({
      name,
      totalSales,
    });
  }, [salesByCountry]);

  const handleMouseLeave = useCallback(() => {
    setHovered(null);
  }, []);

  return (
    <div style={{
      background: '#ffffff',
      borderRadius: 12,
      boxShadow: '0 1px 2px rgba(15, 23, 42, 0.06)',
      padding: 12,
      border: '1px solid #e2e8f0',
      height: '100%',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, flexShrink: 0 }}>
        <h3 style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>{title}</h3>
        {onExpand && (
          <button
            onClick={onExpand}
            style={{
              padding: '4px 8px',
              background: '#eff6ff',
              border: '1px solid #dbeafe',
              borderRadius: 6,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 10,
              fontWeight: 500,
              color: '#2563eb',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#dbeafe';
              e.currentTarget.style.borderColor = '#93c5fd';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#eff6ff';
              e.currentTarget.style.borderColor = '#dbeafe';
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
            </svg>
            확대보기
          </button>
        )}
      </div>

      <div style={{
        flexShrink: 0,
        marginBottom: 4,
        borderRadius: 8,
        padding: '6px 12px',
        background: hovered ? '#1e293b' : '#f8fafc',
        minHeight: 30,
        transition: 'all 0.15s'
      }}>
        {hovered ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: '#ffffff' }}>{hovered.name}</span>
            {hovered.totalSales !== null ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 10 }}>
                <span style={{ color: '#cbd5e1' }}>매출 <span style={{ color: '#ffffff', fontWeight: 600 }}>{Math.round(hovered.totalSales).toLocaleString()}</span><span style={{ color: '#94a3b8' }}>억</span></span>
              </div>
            ) : (
              <span style={{ fontSize: 10, color: '#94a3b8' }}>매출 데이터 없음</span>
            )}
          </div>
        ) : (
          <p style={{ fontSize: 10, color: '#64748b', textAlign: 'center', lineHeight: '18px' }}>국가에 마우스를 올려보세요</p>
        )}
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>
        <ComposableMap
          projection="geoNaturalEarth1"
          projectionConfig={{ scale: 120, center: [0, 0] }}
          width={500}
          height={260}
          style={{ width: '100%', height: '100%' }}
        >
          <Sphere id="sphere-bg" fill="#f8fafc" stroke="#e2e8f0" strokeWidth={0.5} />
          <Graticule stroke="#e2e8f0" strokeWidth={0.3} />
          <Geographies geography={GEO_URL}>
            {({ geographies }: { geographies: any }) =>
              geographies.map((geo: any) => {
                const alpha2 = NUMERIC_TO_ALPHA2[geo.id];
                const salesValue = alpha2 ? salesByCountry.get(alpha2) : undefined;
                const fill = salesValue ? colorScale(salesValue) : '#f1f5f9';

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={fill}
                    stroke="#cbd5e1"
                    strokeWidth={0.3}
                    style={{
                      default: { outline: 'none' },
                      hover: { fill: '#0ea5e9', outline: 'none', cursor: 'pointer' },
                      pressed: { outline: 'none' },
                    }}
                    onMouseEnter={() => handleMouseEnter(geo)}
                    onMouseLeave={handleMouseLeave}
                    onClick={() => {
                      const a2 = NUMERIC_TO_ALPHA2[geo.id];
                      // Pass country code instead of Korean name for API filtering
                      if (a2 && salesByCountry.has(a2) && onCountryClick) {
                        onCountryClick(a2);
                      }
                    }}
                  />
                );
              })
            }
          </Geographies>
        </ComposableMap>
      </div>

      {data.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexShrink: 0 }}>
          <span style={{ fontSize: 9, color: '#94a3b8' }}>낮음</span>
          <div style={{
            flex: 1,
            height: 6,
            borderRadius: 999,
            background: 'linear-gradient(to right, #dbeafe, #3b82f6, #1e40af)',
          }} />
          <span style={{ fontSize: 9, color: '#94a3b8' }}>높음</span>
        </div>
      )}
    </div>
  );
};

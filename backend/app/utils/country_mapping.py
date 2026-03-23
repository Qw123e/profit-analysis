"""
Country Code Mapping Utilities

Provides mappings between:
- Numeric country codes (e.g., '410' for South Korea)
- ISO 3166-1 Alpha-2 codes (e.g., 'KR')
- Korean country names (e.g., '한국')

Usage:
    from app.utils.country_mapping import COUNTRY_NAMES_KO, get_country_name_ko

    # Get Korean name from Alpha-2 code
    name = get_country_name_ko('KR')  # '한국'

    # Get Alpha-2 code from numeric code
    alpha2 = numeric_to_alpha2('410')  # 'KR'
"""

# Numeric country code (UN M49) to ISO 3166-1 Alpha-2 mapping
NUMERIC_TO_ALPHA2: dict[str, str] = {
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
}

# ISO 3166-1 Alpha-2 to Korean country name mapping
COUNTRY_NAMES_KO: dict[str, str] = {
    'AU': '호주', 'CH': '스위스', 'CN': '중국', 'GB': '영국', 'HK': '홍콩',
    'KR': '한국', 'KZ': '카자흐스탄', 'LU': '룩셈부르크', 'PH': '필리핀',
    'RU': '러시아', 'SG': '싱가포르', 'TH': '태국', 'TW': '대만', 'US': '미국',
    'VN': '베트남', 'AS': '아메리칸사모아', 'JP': '일본', 'DE': '독일', 'FR': '프랑스',
    'IN': '인도', 'ID': '인도네시아', 'MY': '말레이시아', 'CA': '캐나다', 'BR': '브라질',
}

# Reverse mapping: Alpha-2 to Numeric (auto-generated)
ALPHA2_TO_NUMERIC: dict[str, str] = {v: k for k, v in NUMERIC_TO_ALPHA2.items()}


def numeric_to_alpha2(numeric_code: str) -> str | None:
    """
    Convert numeric country code to ISO 3166-1 Alpha-2 code.

    Args:
        numeric_code: UN M49 numeric country code (e.g., '410')

    Returns:
        Alpha-2 code (e.g., 'KR') or None if not found

    Example:
        >>> numeric_to_alpha2('410')
        'KR'
        >>> numeric_to_alpha2('840')
        'US'
    """
    return NUMERIC_TO_ALPHA2.get(numeric_code)


def alpha2_to_numeric(alpha2_code: str) -> str | None:
    """
    Convert ISO 3166-1 Alpha-2 code to numeric country code.

    Args:
        alpha2_code: ISO 3166-1 Alpha-2 code (e.g., 'KR')

    Returns:
        Numeric code (e.g., '410') or None if not found

    Example:
        >>> alpha2_to_numeric('KR')
        '410'
        >>> alpha2_to_numeric('US')
        '840'
    """
    return ALPHA2_TO_NUMERIC.get(alpha2_code.upper())


def get_country_name_ko(alpha2_code: str, fallback: str | None = None) -> str:
    """
    Get Korean country name from ISO 3166-1 Alpha-2 code.

    Args:
        alpha2_code: ISO 3166-1 Alpha-2 code (e.g., 'KR')
        fallback: Fallback value if not found (default: alpha2_code itself)

    Returns:
        Korean country name or fallback value

    Example:
        >>> get_country_name_ko('KR')
        '한국'
        >>> get_country_name_ko('US')
        '미국'
        >>> get_country_name_ko('XX')
        'XX'
        >>> get_country_name_ko('XX', fallback='Unknown')
        'Unknown'
    """
    if fallback is None:
        fallback = alpha2_code
    return COUNTRY_NAMES_KO.get(alpha2_code.upper(), fallback)


def get_country_name_ko_from_numeric(numeric_code: str, fallback: str | None = None) -> str:
    """
    Get Korean country name from numeric country code.

    Args:
        numeric_code: UN M49 numeric country code (e.g., '410')
        fallback: Fallback value if not found (default: numeric_code itself)

    Returns:
        Korean country name or fallback value

    Example:
        >>> get_country_name_ko_from_numeric('410')
        '한국'
        >>> get_country_name_ko_from_numeric('840')
        '미국'
    """
    alpha2 = numeric_to_alpha2(numeric_code)
    if alpha2:
        return get_country_name_ko(alpha2, fallback=fallback or numeric_code)
    return fallback or numeric_code

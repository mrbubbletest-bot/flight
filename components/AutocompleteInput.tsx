"use client";

import { useState, useRef, useEffect } from "react";
import styles from "./AutocompleteInput.module.css";
import { LucideIcon } from "lucide-react";

interface LocationOption {
  code: string;
  name: string;
  type: "country" | "city" | "airport";
  countryName?: string;
}

// Comprehensive location dataset — countries, cities, and individual airports
const LOCATIONS: LocationOption[] = [
  // ===== Countries =====
  { code: "TW", name: "Taiwan 台灣 (All Airports)", type: "country" },
  { code: "JP", name: "Japan 日本 (All Airports)", type: "country" },
  { code: "TH", name: "Thailand 泰國 (All Airports)", type: "country" },
  { code: "US", name: "United States 美國 (All Airports)", type: "country" },
  { code: "UK", name: "United Kingdom 英國 (All Airports)", type: "country" },
  { code: "KR", name: "South Korea 韓國 (All Airports)", type: "country" },
  { code: "MY", name: "Malaysia 馬來西亞 (All Airports)", type: "country" },
  { code: "SG", name: "Singapore 新加坡 (All Airports)", type: "country" },
  { code: "HK", name: "Hong Kong 香港 (All Airports)", type: "country" },
  { code: "VN", name: "Vietnam 越南 (All Airports)", type: "country" },
  { code: "PH", name: "Philippines 菲律賓 (All Airports)", type: "country" },
  { code: "AU", name: "Australia 澳洲 (All Airports)", type: "country" },

  // ===== Cities (multi-airport) =====
  { code: "台北", name: "Taipei 台北 (TPE+TSA)", type: "city" },
  { code: "東京", name: "Tokyo 東京 (NRT+HND)", type: "city" },
  { code: "大阪", name: "Osaka 大阪 (KIX+ITM+UKB)", type: "city" },
  { code: "曼谷", name: "Bangkok 曼谷 (BKK+DMK)", type: "city" },
  { code: "首爾", name: "Seoul 首爾 (ICN+GMP)", type: "city" },
  { code: "倫敦", name: "London 倫敦 (LHR+LGW+STN+LTN+LCY)", type: "city" },
  { code: "紐約", name: "New York 紐約 (JFK+EWR+LGA)", type: "city" },
  { code: "巴黎", name: "Paris 巴黎 (CDG+ORY+BVA)", type: "city" },
  { code: "上海", name: "Shanghai 上海 (PVG+SHA)", type: "city" },
  { code: "北京", name: "Beijing 北京 (PEK+PKX)", type: "city" },
  { code: "吉隆坡", name: "Kuala Lumpur 吉隆坡 (KUL+SZB)", type: "city" },
  { code: "杜拜", name: "Dubai 杜拜 (DXB+DWC)", type: "city" },
  { code: "芝加哥", name: "Chicago 芝加哥 (ORD+MDW)", type: "city" },
  { code: "達拉斯", name: "Dallas 達拉斯 (DFW+DAL)", type: "city" },
  { code: "舊金山", name: "San Francisco 舊金山 (SFO+OAK+SJC)", type: "city" },
  { code: "洛杉磯", name: "Los Angeles 洛杉磯 (LAX+BUR+ONT+SNA)", type: "city" },
  { code: "伊斯坦堡", name: "Istanbul 伊斯坦堡 (IST+SAW)", type: "city" },
  { code: "雅加達", name: "Jakarta 雅加達 (CGK+HLP)", type: "city" },
  { code: "多倫多", name: "Toronto 多倫多 (YYZ+YTZ)", type: "city" },
  { code: "邁阿密", name: "Miami 邁阿密 (MIA+FLL)", type: "city" },
  { code: "休士頓", name: "Houston 休士頓 (IAH+HOU)", type: "city" },
  { code: "成都", name: "Chengdu 成都 (CTU+TFU)", type: "city" },
  { code: "莫斯科", name: "Moscow 莫斯科 (SVO+DME+VKO)", type: "city" },
  { code: "羅馬", name: "Rome 羅馬 (FCO+CIA)", type: "city" },
  { code: "墨西哥城", name: "Mexico City 墨西哥城 (MEX+NLU)", type: "city" },

  // ===== Taiwan =====
  { code: "TPE", name: "Taipei Taoyuan 桃園", type: "airport", countryName: "Taiwan" },
  { code: "TSA", name: "Taipei Songshan 松山", type: "airport", countryName: "Taiwan" },
  { code: "KHH", name: "Kaohsiung 高雄", type: "airport", countryName: "Taiwan" },
  { code: "RMQ", name: "Taichung 台中", type: "airport", countryName: "Taiwan" },
  { code: "TNN", name: "Tainan 台南", type: "airport", countryName: "Taiwan" },

  // ===== Japan =====
  { code: "NRT", name: "Tokyo Narita 成田", type: "airport", countryName: "Japan" },
  { code: "HND", name: "Tokyo Haneda 羽田", type: "airport", countryName: "Japan" },
  { code: "KIX", name: "Osaka Kansai 關西", type: "airport", countryName: "Japan" },
  { code: "ITM", name: "Osaka Itami 伊丹", type: "airport", countryName: "Japan" },
  { code: "UKB", name: "Kobe 神戶", type: "airport", countryName: "Japan" },
  { code: "CTS", name: "Sapporo Chitose 新千歲", type: "airport", countryName: "Japan" },
  { code: "FUK", name: "Fukuoka 福岡", type: "airport", countryName: "Japan" },
  { code: "NGO", name: "Nagoya Chubu 中部", type: "airport", countryName: "Japan" },
  { code: "OKA", name: "Okinawa Naha 那霸", type: "airport", countryName: "Japan" },

  // ===== Thailand =====
  { code: "BKK", name: "Bangkok Suvarnabhumi 素萬那普", type: "airport", countryName: "Thailand" },
  { code: "DMK", name: "Bangkok Don Mueang 廊曼", type: "airport", countryName: "Thailand" },
  { code: "HKT", name: "Phuket 普吉島", type: "airport", countryName: "Thailand" },
  { code: "CNX", name: "Chiang Mai 清邁", type: "airport", countryName: "Thailand" },
  { code: "USM", name: "Koh Samui 蘇美島", type: "airport", countryName: "Thailand" },

  // ===== South Korea =====
  { code: "ICN", name: "Seoul Incheon 仁川", type: "airport", countryName: "South Korea" },
  { code: "GMP", name: "Seoul Gimpo 金浦", type: "airport", countryName: "South Korea" },
  { code: "CJU", name: "Jeju 濟州", type: "airport", countryName: "South Korea" },
  { code: "PUS", name: "Busan Gimhae 釜山", type: "airport", countryName: "South Korea" },

  // ===== Singapore =====
  { code: "SIN", name: "Singapore Changi 樟宜", type: "airport", countryName: "Singapore" },

  // ===== Hong Kong =====
  { code: "HKG", name: "Hong Kong 香港", type: "airport", countryName: "Hong Kong" },

  // ===== Malaysia =====
  { code: "KUL", name: "Kuala Lumpur KLIA 吉隆坡", type: "airport", countryName: "Malaysia" },
  { code: "SZB", name: "Kuala Lumpur Sultan Abdul Aziz Shah", type: "airport", countryName: "Malaysia" },
  { code: "PEN", name: "Penang 檳城", type: "airport", countryName: "Malaysia" },
  { code: "BKI", name: "Kota Kinabalu 亞庇", type: "airport", countryName: "Malaysia" },

  // ===== Vietnam =====
  { code: "SGN", name: "Ho Chi Minh City 胡志明市", type: "airport", countryName: "Vietnam" },
  { code: "HAN", name: "Hanoi 河內", type: "airport", countryName: "Vietnam" },
  { code: "DAD", name: "Da Nang 峴港", type: "airport", countryName: "Vietnam" },
  { code: "CXR", name: "Nha Trang Cam Ranh 芽莊", type: "airport", countryName: "Vietnam" },

  // ===== Philippines =====
  { code: "MNL", name: "Manila Ninoy Aquino 馬尼拉", type: "airport", countryName: "Philippines" },
  { code: "CEB", name: "Cebu Mactan 宿霧", type: "airport", countryName: "Philippines" },
  { code: "KLO", name: "Kalibo 卡利博", type: "airport", countryName: "Philippines" },

  // ===== Australia =====
  { code: "SYD", name: "Sydney 雪梨", type: "airport", countryName: "Australia" },
  { code: "MEL", name: "Melbourne 墨爾本", type: "airport", countryName: "Australia" },
  { code: "BNE", name: "Brisbane 布里斯班", type: "airport", countryName: "Australia" },
  { code: "PER", name: "Perth 伯斯", type: "airport", countryName: "Australia" },
  { code: "ADL", name: "Adelaide 阿得雷德", type: "airport", countryName: "Australia" },

  // ===== United States =====
  { code: "ATL", name: "Atlanta 亞特蘭大", type: "airport", countryName: "United States" },
  { code: "JFK", name: "New York JFK 甘迺迪", type: "airport", countryName: "United States" },
  { code: "EWR", name: "Newark 紐華克", type: "airport", countryName: "United States" },
  { code: "LGA", name: "New York LaGuardia 拉瓜迪亞", type: "airport", countryName: "United States" },
  { code: "LAX", name: "Los Angeles 洛杉磯", type: "airport", countryName: "United States" },
  { code: "SFO", name: "San Francisco 舊金山", type: "airport", countryName: "United States" },
  { code: "ORD", name: "Chicago O'Hare 芝加哥", type: "airport", countryName: "United States" },
  { code: "MDW", name: "Chicago Midway", type: "airport", countryName: "United States" },
  { code: "DFW", name: "Dallas/Fort Worth 達拉斯", type: "airport", countryName: "United States" },
  { code: "DEN", name: "Denver 丹佛", type: "airport", countryName: "United States" },
  { code: "SEA", name: "Seattle-Tacoma 西雅圖", type: "airport", countryName: "United States" },
  { code: "LAS", name: "Las Vegas 拉斯維加斯", type: "airport", countryName: "United States" },
  { code: "CLT", name: "Charlotte 夏洛特", type: "airport", countryName: "United States" },
  { code: "MCO", name: "Orlando 奧蘭多", type: "airport", countryName: "United States" },
  { code: "MIA", name: "Miami 邁阿密", type: "airport", countryName: "United States" },
  { code: "FLL", name: "Fort Lauderdale 勞德代爾堡", type: "airport", countryName: "United States" },
  { code: "PHX", name: "Phoenix 鳳凰城", type: "airport", countryName: "United States" },
  { code: "IAH", name: "Houston Intercontinental 休士頓", type: "airport", countryName: "United States" },
  { code: "HOU", name: "Houston Hobby", type: "airport", countryName: "United States" },

  // ===== United Kingdom =====
  { code: "LHR", name: "London Heathrow 希斯洛", type: "airport", countryName: "United Kingdom" },
  { code: "LGW", name: "London Gatwick 蓋特威克", type: "airport", countryName: "United Kingdom" },
  { code: "STN", name: "London Stansted 斯坦斯特德", type: "airport", countryName: "United Kingdom" },
  { code: "LTN", name: "London Luton 盧頓", type: "airport", countryName: "United Kingdom" },
  { code: "LCY", name: "London City", type: "airport", countryName: "United Kingdom" },
  { code: "MAN", name: "Manchester 曼徹斯特", type: "airport", countryName: "United Kingdom" },

  // ===== Europe =====
  { code: "CDG", name: "Paris Charles de Gaulle 巴黎戴高樂", type: "airport", countryName: "France" },
  { code: "ORY", name: "Paris Orly 巴黎奧利", type: "airport", countryName: "France" },
  { code: "AMS", name: "Amsterdam Schiphol 阿姆斯特丹", type: "airport", countryName: "Netherlands" },
  { code: "FRA", name: "Frankfurt 法蘭克福", type: "airport", countryName: "Germany" },
  { code: "MUC", name: "Munich 慕尼黑", type: "airport", countryName: "Germany" },
  { code: "MAD", name: "Madrid Barajas 馬德里", type: "airport", countryName: "Spain" },
  { code: "BCN", name: "Barcelona El Prat 巴塞隆納", type: "airport", countryName: "Spain" },
  { code: "FCO", name: "Rome Fiumicino 羅馬", type: "airport", countryName: "Italy" },
  { code: "IST", name: "Istanbul 伊斯坦堡", type: "airport", countryName: "Turkey" },
  { code: "SAW", name: "Istanbul Sabiha Gökçen", type: "airport", countryName: "Turkey" },
  { code: "SVO", name: "Moscow Sheremetyevo 莫斯科", type: "airport", countryName: "Russia" },

  // ===== Middle East =====
  { code: "DXB", name: "Dubai 杜拜", type: "airport", countryName: "UAE" },
  { code: "DWC", name: "Dubai Al Maktoum", type: "airport", countryName: "UAE" },
  { code: "DOH", name: "Doha Hamad 杜哈", type: "airport", countryName: "Qatar" },
  { code: "AUH", name: "Abu Dhabi 阿布達比", type: "airport", countryName: "UAE" },

  // ===== India =====
  { code: "DEL", name: "New Delhi Indira Gandhi 新德里", type: "airport", countryName: "India" },
  { code: "BOM", name: "Mumbai 孟買", type: "airport", countryName: "India" },
  { code: "BLR", name: "Bangalore 班加羅爾", type: "airport", countryName: "India" },

  // ===== China =====
  { code: "PEK", name: "Beijing Capital 北京首都", type: "airport", countryName: "China" },
  { code: "PKX", name: "Beijing Daxing 北京大興", type: "airport", countryName: "China" },
  { code: "PVG", name: "Shanghai Pudong 上海浦東", type: "airport", countryName: "China" },
  { code: "SHA", name: "Shanghai Hongqiao 上海虹橋", type: "airport", countryName: "China" },
  { code: "CAN", name: "Guangzhou Baiyun 廣州白雲", type: "airport", countryName: "China" },
  { code: "SZX", name: "Shenzhen Bao'an 深圳寶安", type: "airport", countryName: "China" },
  { code: "CTU", name: "Chengdu Shuangliu 成都雙流", type: "airport", countryName: "China" },
  { code: "TFU", name: "Chengdu Tianfu 成都天府", type: "airport", countryName: "China" },
  { code: "KMG", name: "Kunming Changshui 昆明", type: "airport", countryName: "China" },
  { code: "CKG", name: "Chongqing Jiangbei 重慶", type: "airport", countryName: "China" },
  { code: "HGH", name: "Hangzhou Xiaoshan 杭州", type: "airport", countryName: "China" },

  // ===== Indonesia =====
  { code: "CGK", name: "Jakarta Soekarno-Hatta 雅加達", type: "airport", countryName: "Indonesia" },
  { code: "DPS", name: "Bali Ngurah Rai 峇里島", type: "airport", countryName: "Indonesia" },

  // ===== Americas =====
  { code: "YYZ", name: "Toronto Pearson 多倫多", type: "airport", countryName: "Canada" },
  { code: "YVR", name: "Vancouver 溫哥華", type: "airport", countryName: "Canada" },
  { code: "MEX", name: "Mexico City 墨西哥城", type: "airport", countryName: "Mexico" },
  { code: "GRU", name: "São Paulo Guarulhos 聖保羅", type: "airport", countryName: "Brazil" },
  { code: "BOG", name: "Bogota El Dorado 波哥大", type: "airport", countryName: "Colombia" },
];

interface AutocompleteInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  icon: LucideIcon;
  inputClassName?: string;
  iconClassName?: string;
}

export default function AutocompleteInput({
  value,
  onChange,
  placeholder,
  icon: Icon,
  inputClassName,
  iconClassName
}: AutocompleteInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredOptions, setFilteredOptions] = useState<LocationOption[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);
    
    if (val.trim() === "") {
      setFilteredOptions([]);
      setIsOpen(false);
      return;
    }

    const lowerVal = val.toLowerCase();
    const filtered = LOCATIONS.filter(
      loc => loc.name.toLowerCase().includes(lowerVal) || 
             loc.code.toLowerCase().includes(lowerVal) ||
             (loc.countryName && loc.countryName.toLowerCase().includes(lowerVal))
    );
    setFilteredOptions(filtered);
    setIsOpen(true);
  };

  const handleSelect = (option: LocationOption) => {
    onChange(option.code);
    setIsOpen(false);
  };

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <Icon className={iconClassName} size={20} />
      <input
        type="text"
        placeholder={placeholder}
        className={inputClassName}
        value={value}
        onChange={handleInputChange}
        onFocus={() => {
          if (value.trim() !== "") setIsOpen(true);
        }}
        required
      />
      
      {isOpen && (
        <div className={styles.dropdown}>
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option, idx) => (
              <div 
                key={`${option.code}-${idx}`} 
                className={styles.dropdownItem}
                onClick={() => handleSelect(option)}
              >
                <span className={styles.itemName}>
                  {option.name} ({option.code})
                </span>
                {option.type === "airport" && (
                  <span className={styles.itemSub}>{option.countryName} - Airport</span>
                )}
                {option.type === "country" && (
                  <span className={styles.itemSub}>Entire Country</span>
                )}
                {option.type === "city" && (
                  <span className={styles.itemSub}>City - All Airports</span>
                )}
              </div>
            ))
          ) : (
            <div className={styles.empty}>No matches found</div>
          )}
        </div>
      )}
    </div>
  );
}

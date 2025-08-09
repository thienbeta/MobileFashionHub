import { useState, useEffect } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, TextInput, StyleSheet, ViewStyle, TextStyle, ImageStyle } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useTheme } from '../../context/theme';
import { Search, SlidersHorizontal, Tag } from 'lucide-react-native';
import { apiFetch } from '../../../src/utils/api';

interface ComboProduct {
  idSanPham: string;
  name: string;
  thuongHieu: string;
  loaiSanPham: string;
  kichThuoc: string[];
  soLuong: number;
  donGia: number;
  moTa: string | null;
  chatLieu: string;
  mauSac: string[];
  hinh: string[];
  ngayTao: string;
  trangThai: number;
}

interface Combo {
  maCombo: number;
  name: string;
  hinhAnh: string;
  ngayTao: string;
  trangThai: number;
  sanPhams: ComboProduct[];
  moTa: string;
  gia: number;
  soLuong: number;
}

interface Styles {
  container: ViewStyle;
  containerDark: ViewStyle;
  header: ViewStyle;
  tabContainer: ViewStyle;
  tabButton: ViewStyle;
  tabButtonActive: ViewStyle;
  tabText: TextStyle;
  tabTextActive: TextStyle;
  title: TextStyle;
  textDark: TextStyle;
  searchContainer: ViewStyle;
  searchContainerDark: ViewStyle;
  searchInput: TextStyle;
  searchInputDark: TextStyle;
  filterButton: ViewStyle;
  filterButtonActive: ViewStyle;
  filterButtonText: TextStyle;
  filterContainer: ViewStyle;
  comboGrid: ViewStyle;
  comboCard: ViewStyle;
  comboImage: ImageStyle;
  comboInfo: ViewStyle;
  comboInfoDark: ViewStyle;
  comboName: TextStyle;
  comboPrice: TextStyle;
  comboDescription: TextStyle;
  badgeContainer: ViewStyle;
  badge: ViewStyle;
  badgeText: TextStyle;
  errorText: TextStyle;
  emptyText: TextStyle;
  clearButton: ViewStyle;
  clearButtonText: TextStyle;
}

export default function CombosScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const [originalCombos, setOriginalCombos] = useState<Combo[]>([]);
  const [filteredCombos, setFilteredCombos] = useState<Combo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('featured');
  const [priceRange, setPriceRange] = useState<{ min: number; max: number } | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const formatter = new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    currencyDisplay: 'code',
  });

  useEffect(() => {
    const fetchCombos = async () => {
      try {
        setIsLoading(true);
        const data = await apiFetch('https://ce5e722365ab.ngrok-free.app/api/Combo/ComboSanPhamView', 'Combos');

        const mappedCombos = data.map((combo: any) => ({
          maCombo: combo.maCombo,
          name: combo.name,
          hinhAnh: `data:image/jpeg;base64,${combo.hinhAnh}`,
          ngayTao: combo.ngayTao,
          trangThai: combo.trangThai,
          sanPhams: combo.sanPhams.map((product: any) => ({
            idSanPham: product.idSanPham,
            name: product.name,
            thuongHieu: product.thuongHieu,
            loaiSanPham: product.loaiSanPham,
            kichThuoc: product.kichThuoc,
            soLuong: product.soLuong,
            donGia: product.donGia,
            moTa: product.moTa || 'Không có mô tả',
            chatLieu: product.chatLieu,
            mauSac: product.mauSac,
            hinh: product.hinh.map((img: string) => `data:image/jpeg;base64,${img}`),
            ngayTao: product.ngayTao,
            trangThai: product.trangThai,
          })),
          moTa: combo.moTa || 'Không có mô tả',
          gia: combo.gia,
          soLuong: combo.soLuong,
        }));

        setOriginalCombos(mappedCombos);
        setError(null);
      } catch (err: any) {
        console.error('Lỗi khi lấy combo:', err);
        setError('Không thể tải combo. Vui lòng thử lại sau.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCombos();
  }, []);

  useEffect(() => {
    let result = [...originalCombos];
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (combo) =>
          combo.name.toLowerCase().includes(query) ||
          combo.moTa.toLowerCase().includes(query)
      );
    }
    if (priceRange) {
      result = result.filter(
        (combo) => combo.gia >= priceRange.min && combo.gia <= priceRange.max
      );
    }
    switch (sortOrder) {
      case 'price-asc':
        result.sort((a, b) => a.gia - b.gia);
        break;
      case 'price-desc':
        result.sort((a, b) => b.gia - a.gia);
        break;
      case 'name-asc':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name-desc':
        result.sort((a, b) => b.name.localeCompare(b.name));
        break;
      default:
        break;
    }
    setFilteredCombos(result);
  }, [originalCombos, searchQuery, sortOrder, priceRange]);

  const clearFilters = () => {
    setSearchQuery('');
    setSortOrder('featured');
    setPriceRange(null);
  };

  const renderCombo = ({ item }: { item: Combo }) => (
    <TouchableOpacity
      style={styles.comboCard}
      onPress={() => router.push(`/combos/${item.maCombo}`)}
    >
      <Image
        source={{ uri: item.hinhAnh }}
        style={styles.comboImage}
      />
      <View style={[styles.comboInfo, isDarkMode && styles.comboInfoDark]}>
        <Text style={[styles.comboName, isDarkMode && styles.textDark]}>
          {item.name}
        </Text>
        <Text style={styles.comboPrice}>
          {formatter.format(item.gia)}
        </Text>
        <View style={styles.badgeContainer}>
          {item.sanPhams.map((product) => (
            <View key={product.idSanPham} style={styles.badge}>
              <Tag size={12} color={isDarkMode ? '#A0AEC0' : '#718096'} />
              <Text style={[styles.badgeText, isDarkMode && styles.textDark]}>
                {product.name}
              </Text>
            </View>
          ))}
        </View>
        <Text style={[styles.comboDescription, isDarkMode && styles.textDark]}>
          {item.moTa}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      <View style={styles.header}>
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[
              styles.tabButton,
              pathname === '/products' && styles.tabButtonActive,
            ]}
            onPress={() => router.push('/products')}
          >
            <Text
              style={[
                styles.tabText,
                pathname === '/products' && styles.tabTextActive,
              ]}
            >
              Sản Phẩm
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tabButton,
              pathname === '/combos' && styles.tabButtonActive,
            ]}
            onPress={() => router.push('/combos')}
          >
            <Text
              style={[
                styles.tabText,
                pathname === '/combos' && styles.tabTextActive,
              ]}
            >
              Combos
            </Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.searchContainer, isDarkMode && styles.searchContainerDark]}>
          <Search size={20} color={isDarkMode ? '#A0AEC0' : '#718096'} />
          <TextInput
            style={[styles.searchInput, isDarkMode && styles.searchInputDark]}
            placeholder="Tìm kiếm combo..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal size={20} color={isDarkMode ? '#A0AEC0' : '#718096'} />
          </TouchableOpacity>
        </View>

        {showFilters && (
          <View style={styles.filterContainer}>
            <Text style={[styles.textDark, isDarkMode && styles.textDark]}>Khoảng Giá</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 8 }}>
              {[
                { label: 'Tất cả giá', value: 'all' },
                { label: 'Dưới 100,000 VND', value: 'under-100000' },
                { label: '100,000 - 200,000 VND', value: '100000-200000' },
                { label: '200,000 - 500,000 VND', value: '200000-500000' },
                { label: 'Trên 500,000 VND', value: 'over-500000' },
              ].map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.filterButton,
                    priceRange?.min === (option.value === 'all' ? null : option.value === 'under-100000' ? 0 : option.value === 'over-500000' ? 500000 : parseInt(option.value.split('-')[0])) && styles.filterButtonActive,
                  ]}
                  onPress={() => {
                    switch (option.value) {
                      case 'under-100000':
                        setPriceRange({ min: 0, max: 100000 });
                        break;
                      case '100000-200000':
                        setPriceRange({ min: 100000, max: 200000 });
                        break;
                      case '200000-500000':
                        setPriceRange({ min: 200000, max: 500000 });
                        break;
                      case 'over-500000':
                        setPriceRange({ min: 500000, max: Infinity });
                        break;
                      default:
                        setPriceRange(null);
                    }
                  }}
                >
                  <Text style={styles.filterButtonText}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.textDark, isDarkMode && styles.textDark]}>Sắp Xếp Theo</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 8 }}>
              {[
                { label: 'Nổi bật', value: 'featured' },
                { label: 'Giá: Thấp đến Cao', value: 'price-asc' },
                { label: 'Giá: Cao đến Thấp', value: 'price-desc' },
                { label: 'Tên: A đến Z', value: 'name-asc' },
                { label: 'Tên: Z đến A', value: 'name-desc' },
              ].map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.filterButton,
                    sortOrder === option.value && styles.filterButtonActive,
                  ]}
                  onPress={() => setSortOrder(option.value)}
                >
                  <Text style={styles.filterButtonText}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
              <Text style={styles.clearButtonText}>Xóa Bộ Lọc</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : isLoading ? (
        <Text style={[styles.emptyText, isDarkMode && styles.textDark]}>Đang tải combo...</Text>
      ) : filteredCombos.length > 0 ? (
        <FlatList
          data={filteredCombos}
          renderItem={renderCombo}
          keyExtractor={(item) => item.maCombo.toString()}
          numColumns={2}
          contentContainerStyle={styles.comboGrid}
        />
      ) : (
        <View style={{ alignItems: 'center', padding: 24 }}>
          <Text style={[styles.emptyText, isDarkMode && styles.textDark]}>
            Không tìm thấy combo
          </Text>
          <Text style={[styles.emptyText, isDarkMode && styles.textDark]}>
            Hãy thử điều chỉnh tiêu chí tìm kiếm hoặc bộ lọc
          </Text>
          <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
            <Text style={styles.clearButtonText}>Xóa tất cả bộ lọc</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create<Styles>({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 48,
  },
  containerDark: {
    backgroundColor: '#1A202C',
  },
  header: {
    padding: 24,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: '#9F7AEA',
  },
  tabText: {
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
    color: '#718096',
  },
  tabTextActive: {
    color: '#9F7AEA',
  },
  title: {
    fontSize: 24,
    fontFamily: 'Poppins_600SemiBold',
    color: '#2D3748',
    marginBottom: 16,
  },
  textDark: {
    color: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F7FAFC',
    borderRadius: 12,
  },
  searchContainerDark: {
    backgroundColor: '#2D3748',
  },
  searchInput: {
    marginLeft: 8,
    color: '#718096',
    fontFamily: 'Poppins_400Regular',
    flex: 1,
  },
  searchInputDark: {
    color: '#A0AEC0',
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#F7FAFC',
  },
  filterButtonActive: {
    backgroundColor: '#9F7AEA',
  },
  filterButtonText: {
    color: '#718096',
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
  },
  filterContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginTop: 16,
    elevation: 2,
  },
  comboGrid: {
    padding: 12,
  },
  comboCard: {
    flex: 1,
    margin: 8,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  comboImage: {
    width: '100%',
    height: 150,
  },
  comboInfo: {
    padding: 12,
    backgroundColor: '#fff',
  },
  comboInfoDark: {
    backgroundColor: '#2D3748',
  },
  comboName: {
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
    color: '#2D3748',
  },
  comboPrice: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: '#9F7AEA',
    marginTop: 4,
  },
  comboDescription: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: '#718096',
    marginTop: 4,
  },
  badgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    paddingHorizontal: 6,
    backgroundColor: '#EDF2F7',
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: 'Poppins_400Regular',
    color: '#718096',
    marginLeft: 4,
  },
  errorText: {
    color: '#EF4444',
    textAlign: 'center',
    padding: 24,
    fontSize: 16,
  },
  emptyText: {
    color: '#718096',
    textAlign: 'center',
    fontSize: 16,
    marginVertical: 8,
  },
  clearButton: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#718096',
    borderRadius: 8,
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#718096',
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
  },
});
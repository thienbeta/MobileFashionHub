import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, TextInput, ViewStyle, TextStyle, ImageStyle, ActivityIndicator } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useTheme } from '../../context/theme';
import { Search, SlidersHorizontal } from 'lucide-react-native';
import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../../../src/utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import debounce from 'lodash.debounce';

interface Product {
  id: string;
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

interface Styles {
  container: ViewStyle;
  containerDark: ViewStyle;
  header: ViewStyle;
  tabContainer: ViewStyle;
  tabButton: ViewStyle;
  tabButtonActive: ViewStyle;
  tabText: TextStyle;
  tabTextActive: TextStyle;
  textDark: TextStyle;
  searchContainer: ViewStyle;
  searchContainerDark: ViewStyle;
  searchInput: TextStyle;
  searchInputDark: TextStyle;
  filterButton: ViewStyle;
  filterButtonActive: ViewStyle;
  filterButtonText: TextStyle;
  filterContainer: ViewStyle;
  productGrid: ViewStyle;
  productCard: ViewStyle;
  productImage: ImageStyle;
  productInfo: ViewStyle;
  productInfoDark: ViewStyle;
  productName: TextStyle;
  productPrice: TextStyle;
  productCategory: TextStyle;
  errorText: TextStyle;
  emptyText: TextStyle;
  clearButton: ViewStyle;
  clearButtonText: TextStyle;
}

type PriceRangeKey = 'under-100000' | '100000-200000' | '200000-500000' | 'over-500000';
type SortOrder = 'featured' | 'price-asc' | 'price-desc' | 'name-asc' | 'name-desc';

export default function ProductsScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const [originalProducts, setOriginalProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('featured');
  const [selectedPriceRange, setSelectedPriceRange] = useState<PriceRangeKey | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const API_BASE_URL = 'http://192.168.10.32:5261/api';

  const priceRanges: Record<PriceRangeKey, { min: number; max: number }> = {
    'under-100000': { min: 0, max: 100000 },
    '100000-200000': { min: 100000, max: 200000 },
    '200000-500000': { min: 200000, max: 500000 },
    'over-500000': { min: 500000, max: 999999999 },
  };

  const formatter = new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    currencyDisplay: 'code',
  });

  const debouncedSetSearchQuery = useCallback(
    debounce((query: string) => setSearchQuery(query), 300),
    []
  );

  useEffect(() => {
    const loadFilters = async () => {
      try {
        const savedFilters = await AsyncStorage.getItem('productFilters');
        if (savedFilters) {
          const { searchQuery, sortOrder, selectedPriceRange } = JSON.parse(savedFilters);
          setSearchQuery(searchQuery || '');
          setSortOrder(sortOrder || 'featured');
          setSelectedPriceRange(selectedPriceRange || null);
        }
      } catch (err) {
        console.error('Error loading filters:', err);
      }
    };
    loadFilters();
  }, []);

  useEffect(() => {
    const saveFilters = async () => {
      try {
        await AsyncStorage.setItem(
          'productFilters',
          JSON.stringify({ searchQuery, sortOrder, selectedPriceRange })
        );
      } catch (err) {
        console.error('Error saving filters:', err);
      }
    };
    saveFilters();
  }, [searchQuery, sortOrder, selectedPriceRange]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await apiFetch(`${API_BASE_URL}/SanPham/ListSanPham`, 'Products');
        if (!Array.isArray(data)) {
          throw new Error('Dữ liệu sản phẩm không hợp lệ');
        }
        setOriginalProducts(data);
        setFilteredProducts(data);
      } catch (err) {
        console.error('Error fetching products:', err);
        setError('Không thể tải sản phẩm. Vui lòng thử lại sau.');
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  useEffect(() => {
    let result = [...originalProducts];
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (product) =>
          product.name.toLowerCase().includes(query) ||
          (product.moTa || '').toLowerCase().includes(query)
      );
    }
    if (selectedPriceRange && priceRanges[selectedPriceRange]) {
      const { min, max } = priceRanges[selectedPriceRange];
      result = result.filter((product) => product.donGia >= min && product.donGia <= max);
    }
    switch (sortOrder) {
      case 'price-asc':
        result.sort((a, b) => a.donGia - b.donGia);
        break;
      case 'price-desc':
        result.sort((a, b) => b.donGia - a.donGia);
        break;
      case 'name-asc':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name-desc':
        result.sort((a, b) => b.name.localeCompare(a.name));
        break;
      default:
        break;
    }
    setFilteredProducts(result);
  }, [searchQuery, sortOrder, selectedPriceRange, originalProducts]);

  const clearFilters = () => {
    setSearchQuery('');
    setSortOrder('featured');
    setSelectedPriceRange(null);
  };

  const renderProduct = ({ item }: { item: Product }) => (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => router.push(`/products/${item.id}`)}
    >
      <Image
        source={{
          uri: item.hinh[0]?.startsWith('http')
            ? item.hinh[0]
            : item.hinh[0]
            ? `data:image/jpeg;base64,${item.hinh[0]}`
            : 'https://images.unsplash.com/photo-1591369822096-ffd140ec948f?w=500',
        }}
        style={styles.productImage}
      />
      <View style={[styles.productInfo, isDarkMode && styles.productInfoDark]}>
        <Text style={[styles.productName, isDarkMode && styles.textDark]}>{item.name}</Text>
        <Text style={styles.productPrice}>{formatter.format(item.donGia)}</Text>
        <Text style={[styles.productCategory, isDarkMode && styles.textDark]}>{item.loaiSanPham}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      <View style={styles.header}>
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, pathname === '/products' && styles.tabButtonActive]}
            onPress={() => router.push('/products')}
          >
            <Text style={[styles.tabText, pathname === '/products' && styles.tabTextActive]}>Sản phẩm</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, pathname === '/combos' && styles.tabButtonActive]}
            onPress={() => router.push('/(tabs)/combos')}
          >
            <Text style={[styles.tabText, pathname === '/combos' && styles.tabTextActive]}>Combos</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.searchContainer, isDarkMode && styles.searchContainerDark]}>
          <Search size={20} color={isDarkMode ? '#A0AEC0' : '#718096'} />
          <TextInput
            style={[styles.searchInput, isDarkMode && styles.searchInputDark]}
            placeholder="Tìm kiếm sản phẩm..."
            value={searchQuery}
            onChangeText={debouncedSetSearchQuery}
          />
          <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilters(!showFilters)}>
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
                    selectedPriceRange === option.value && styles.filterButtonActive,
                  ]}
                  onPress={() => setSelectedPriceRange(option.value === 'all' ? null : option.value as PriceRangeKey)}
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
                  style={[styles.filterButton, sortOrder === option.value && styles.filterButtonActive]}
                  onPress={() => setSortOrder(option.value as SortOrder)}
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
        <View style={{ alignItems: 'center', padding: 24 }}>
          <Text style={[styles.errorText, isDarkMode && styles.textDark]}>{error}</Text>
          <Text style={[styles.errorText, isDarkMode && styles.textDark, { marginTop: 8 }]}>
            Vui lòng kiểm tra kết nối mạng hoặc thử lại sau.
          </Text>
        </View>
      ) : loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={isDarkMode ? '#fff' : '#9F7AEA'} />
        </View>
      ) : filteredProducts.length > 0 ? (
        <FlatList
          data={filteredProducts}
          renderItem={renderProduct}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.productGrid}
        />
      ) : (
        <View style={{ alignItems: 'center', padding: 24 }}>
          <Text style={[styles.emptyText, isDarkMode && styles.textDark]}>Không tìm thấy sản phẩm</Text>
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
  productGrid: {
    padding: 12,
  },
  productCard: {
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
  productImage: {
    width: '100%',
    height: 200,
  },
  productInfo: {
    padding: 12,
    backgroundColor: '#fff',
  },
  productInfoDark: {
    backgroundColor: '#2D3748',
  },
  productName: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: '#2D3748',
  },
  productPrice: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#9F7AEA',
    marginTop: 4,
  },
  productCategory: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: '#718096',
    marginTop: 4,
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
    color: '#2D3748',
    textAlign: 'center',
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
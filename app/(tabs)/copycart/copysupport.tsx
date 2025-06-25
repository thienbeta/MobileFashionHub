import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { X } from 'lucide-react-native';
import { useTheme } from '../../context/theme';
import { Appearance } from 'react-native';
import { colors } from '../../style/themeColors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch } from '../../../src/utils/api';

interface ComboItem {
  idCombo: number;
  tenCombo: string;
  hinhAnh: string;
  soLuong: number;
  chiTietGioHangCombo: number;
  sanPhamList: {
    maSanPham: string;
    soLuong: number;
    version: number;
    hinhAnh: string;
    tenSanPham: string;
  }[];
}

interface VersionGroup {
  version: number;
  items: ComboItem['sanPhamList'];
}

const API_BASE_URL = 'http://192.168.43.163:5261/api';

const CartSupportScreen = () => {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark' || (theme === 'system' && Appearance.getColorScheme() === 'dark');
  const themeColors = isDarkMode ? colors.dark : colors.light;

  const [combo, setCombo] = useState<ComboItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchComboData = useCallback(async () => {
    if (!id || isNaN(Number(id))) {
      console.warn('Invalid idCombo:', id);
      setError('ID combo không hợp lệ');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setCombo(null);

      // Retrieve user data from AsyncStorage
      const userDataString = await AsyncStorage.getItem('user');
      if (!userDataString) {
        Alert.alert('Vui lòng đăng nhập', 'Bạn cần đăng nhập để xem giỏ hàng', [
          { text: 'OK', onPress: () => router.push('/(auth)/login') },
        ]);
        setIsLoading(false);
        return;
      }

      const userData = JSON.parse(userDataString);
      const userId = userData?.maNguoiDung;
      if (!userId) {
        Alert.alert('Lỗi', 'Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại!', [
          { text: 'OK', onPress: () => router.push('/(auth)/login') },
        ]);
        setIsLoading(false);
        return;
      }

      console.log('Fetching combo data for idCombo:', id, 'userId:', userId);
      const data = await apiFetch(`${API_BASE_URL}/Cart/GioHangByKhachHang?id=${userId}`, 'CartCombo');
      const comboData = data.ctghComboView?.find((item: any) => item.idCombo === Number(id));

      if (comboData) {
        const formattedCombo: ComboItem = {
          idCombo: comboData.idCombo,
          tenCombo: comboData.tenCombo,
          hinhAnh: comboData.hinhAnh?.startsWith('data:image')
            ? comboData.hinhAnh
            : `data:image/jpeg;base64,${comboData.hinhAnh}`,
          soLuong: comboData.soLuong,
          chiTietGioHangCombo: comboData.chiTietGioHangCombo,
          sanPhamList: comboData.sanPhamList.map((item: any) => ({
            maSanPham: item.maSanPham,
            soLuong: item.soLuong,
            version: item.version,
            hinhAnh: item.hinhAnh?.startsWith('data:image')
              ? item.hinhAnh
              : `data:image/jpeg;base64,${item.hinhAnh}`,
            tenSanPham: item.tenSanPham,
          })),
        };
        console.log('Formatted combo:', JSON.stringify(formattedCombo, null, 2));
        setCombo(formattedCombo);
      } else {
        console.warn('Combo not found for id:', id);
        setError('Không tìm thấy combo');
      }
    } catch (error) {
      console.error('Error fetching combo:', error);
      setError('Không thể tải dữ liệu combo. Vui lòng kiểm tra kết nối hoặc xác thực ngrok.');
    } finally {
      setIsLoading(false);
    }
  }, [id, router]);

  useFocusEffect(
    useCallback(() => {
      console.log('CartSupportScreen focused with id:', id);
      fetchComboData();
    }, [fetchComboData])
  );

  const groupByVersion = (sanPhamList: ComboItem['sanPhamList']): VersionGroup[] => {
    console.log('Grouping sanPhamList:', JSON.stringify(sanPhamList, null, 2));
    const grouped = sanPhamList.reduce((acc, item) => {
      if (!acc[item.version]) {
        acc[item.version] = [];
      }
      acc[item.version].push(item);
      return acc;
    }, {} as Record<number, ComboItem['sanPhamList']>);

    const result = Object.entries(grouped).map(([version, items]) => ({
      version: parseInt(version),
      items,
    }));
    console.log('Grouped versions:', JSON.stringify(result, null, 2));
    return result;
  };

  const parseProductCode = (maSanPham: string) => {
    const parts = maSanPham.split('_');
    const color = parts[1]?.slice(0, 6) || '000000';
    const size = parts[2] || 'N/A';
    return { color, size };
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: themeColors.background }]}>
        <Text style={[styles.loadingText, { color: themeColors.textPrimary }]}>Đang tải dữ liệu...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: themeColors.background }]}>
        <Text style={[styles.errorText, { color: themeColors.textPrimary }]}>{error}</Text>
        <TouchableOpacity
          style={[styles.closeButton, { borderColor: themeColors.primary }]}
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.push('/(tabs)/cart');
            }
          }}
        >
          <Text style={[styles.closeButtonText, { color: themeColors.primary }]}>Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!combo) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: themeColors.background }]}>
        <Text style={[styles.errorText, { color: themeColors.textPrimary }]}>Không tìm thấy combo</Text>
        <TouchableOpacity
          style={[styles.closeButton, { borderColor: themeColors.primary }]}
          onPress={() => router.push('/(tabs)/cart')}
        >
          <Text style={[styles.closeButtonText, { color: themeColors.primary }]}>Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const groupedVersions = groupByVersion(combo.sanPhamList);

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: themeColors.textPrimary }]}>
          Chỉnh sửa {combo.tenCombo}
        </Text>
        <TouchableOpacity onPress={() => router.back()}>
          <X size={24} color={themeColors.iconPrimary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={groupedVersions}
        keyExtractor={item => item.version.toString()}
        renderItem={({ item: versionGroup, index }) => (
          <View
            style={[
              styles.versionCard,
              { backgroundColor: themeColors.secondaryBackground },
            ]}
          >
            <Text style={[styles.versionTitle, { color: themeColors.textPrimary }]}>
              Combo {index + 1} (Version: {versionGroup.version})
            </Text>
            <FlatList
              data={versionGroup.items}
              keyExtractor={(item, idx) => `${item.maSanPham}-${idx}`}
              renderItem={({ item: product }) => {
                const { color, size } = parseProductCode(product.maSanPham);
                return (
                  <View
                    style={[styles.productCard, { backgroundColor: themeColors.background }]}
                  >
                    <Image
                      source={{ uri: product.hinhAnh }}
                      style={styles.productImage}
                    />
                    <View style={styles.productDetails}>
                      <Text
                        style={[styles.productName, { color: themeColors.textPrimary }]}
                        numberOfLines={1}
                      >
                        {product.tenSanPham}
                      </Text>
                      <View style={styles.colorContainer}>
                        <Text style={[styles.detailText, { color: themeColors.textSecondary }]}>
                          Màu:
                        </Text>
                        <View
                          style={[styles.colorBox, { backgroundColor: `#${color}` }]}
                        />
                      </View>
                      <Text style={[styles.detailText, { color: themeColors.textSecondary }]}>
                        Kích Thước: {size}
                      </Text>
                      <Text style={[styles.detailText, { color: themeColors.textSecondary }]}>
                        Số Lượng: {product.soLuong}
                      </Text>
                    </View>
                  </View>
                );
              }}
              style={styles.productList}
            />
          </View>
        )}
        contentContainerStyle={styles.versionList}
      />

      <TouchableOpacity
        style={[styles.closeButton, { borderColor: themeColors.primary }]}
        onPress={() => router.back()}
      >
        <Text style={[styles.closeButtonText, { color: themeColors.primary }]}>
          Đóng
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    paddingTop: 48,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  versionList: {
    paddingBottom: 16,
  },
  versionCard: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  versionTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  productList: {
    marginTop: 8,
  },
  productCard: {
    flexDirection: 'row',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  productDetails: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  colorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  colorBox: {
    width: 16,
    height: 16,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#ccc',
    marginLeft: 4,
  },
  detailText: {
    fontSize: 12,
    marginBottom: 4,
  },
  closeButton: {
    borderWidth: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '500',
  },
  errorText: {
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 16,
    textAlign: 'center',
  },
});

export default CartSupportScreen;
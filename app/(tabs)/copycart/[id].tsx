import React, { useState, useEffect } from 'react';
import { Link, Stack } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../context/theme';
import { Appearance } from 'react-native';
import { colors } from '../../style/themeColors';
import * as FileSystem from 'expo-file-system';
import { apiFetch } from '../../../src/utils/api';

const API_BASE_URL = 'http://192.168.43.163:5261/api';

interface CartItem {
  idSanPham: string;
  tenSanPham: string;
  mauSac: string;
  kickThuoc: string;
  soLuong: number;
  tienSanPham: number;
  hinhAnh: string;
}

interface ComboItem {
  idCombo: number;
  tenCombo: string;
  hinhAnh: string;
  soLuong: number;
  gia: number;
  sanPhamList: {
    hinhAnh: string;
    maSanPham: string;
    soLuong: number;
    tenSanPham: string;
  }[];
}

export default function CopyCartScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [comboItems, setComboItems] = useState<ComboItem[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark' || (theme === 'system' && Appearance.getColorScheme() === 'dark');
  const themeColors = isDarkMode ? colors.dark : colors.light;

  // Check authentication and get userId from user.json
  useEffect(() => {
    let isMounted = true;

    const checkUserData = async () => {
      try {
        const fileUri = FileSystem.documentDirectory + 'user.json';
        const fileInfo = await FileSystem.getInfoAsync(fileUri);
        if (!fileInfo.exists) {
          if (isMounted) {
            setIsLoading(false);
            Alert.alert('Vui lòng đăng nhập', 'Bạn cần đăng nhập để xem giỏ hàng', [
              {
                text: 'OK',
                onPress: () => setTimeout(() => router.push('/(auth)/login'), 0),
              },
            ]);
          }
          return;
        }

        const fileContent = await FileSystem.readAsStringAsync(fileUri, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        const userData = JSON.parse(fileContent);
        const maNguoiDung = userData?.user?.maNguoiDung;

        if (!maNguoiDung) {
          if (isMounted) {
            setIsLoading(false);
            Alert.alert('Lỗi', 'Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.', [
              {
                text: 'OK',
                onPress: () => setTimeout(() => router.push('/(auth)/login'), 0),
              },
            ]);
          }
          return;
        }

        if (isMounted) {
          setUserId(maNguoiDung);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error checking user data:', error);
        if (isMounted) {
          setIsLoading(false);
          Alert.alert('Lỗi', 'Không thể kiểm tra thông tin đăng nhập. Vui lòng thử lại.', [
            {
              text: 'OK',
              onPress: () => setTimeout(() => router.push('/(auth)/login'), 0),
            },
          ]);
        }
      }
    };

    checkUserData();

    return () => {
      isMounted = false;
    };
  }, [router]);

  // Fetch cart data when userId and id are available
  useEffect(() => {
    if (!userId || !id) return;

    const fetchCartData = async (cartId: string) => {
      try {
        console.log('Fetching cart for id:', cartId);
        const data = await apiFetch(`${API_BASE_URL}/Cart/GioHangByKhachHang?id=${cartId}`, 'CartData');

        if (!data || !data.ctghSanPhamView || !data.ctghComboView) {
          console.warn('Invalid or empty data structure:', data);
          Alert.alert('Lỗi', 'Dữ liệu trả về không hợp lệ hoặc rỗng');
          return;
        }

        const processedCartItems = data.ctghSanPhamView.map((item: any) => ({
          idSanPham: item.idSanPham,
          tenSanPham: item.tenSanPham,
          mauSac: item.mauSac,
          kickThuoc: item.kickThuoc,
          soLuong: item.soLuong,
          tienSanPham: item.tienSanPham,
          hinhAnh: item.hinhAnh?.startsWith('data:image')
            ? item.hinhAnh
            : `data:image/jpeg;base64,${item.hinhAnh}`,
        }));
        setCartItems(processedCartItems);

        const processedComboItems = data.ctghComboView.map((combo: any) => ({
          idCombo: combo.idCombo,
          tenCombo: combo.tenCombo,
          hinhAnh: combo.hinhAnh?.startsWith('data:image')
            ? combo.hinhAnh
            : `data:image/jpeg;base64,${combo.hinhAnh}`,
          soLuong: combo.soLuong,
          gia: combo.gia,
          sanPhamList: combo.sanPhamList.map((item: any) => ({
            hinhAnh: item.hinhAnh?.startsWith('data:image')
              ? item.hinhAnh
              : `data:image/jpeg;base64,${item.hinhAnh}`,
            maSanPham: item.maSanPham,
            soLuong: item.soLuong,
            tenSanPham: item.tenSanPham,
          })),
        }));
        setComboItems(processedComboItems);

        console.log('Processed cartItems:', processedCartItems);
        console.log('Processed comboItems:', processedComboItems);
      } catch (error) {
        console.error('Fetch error:', error);
        Alert.alert('Lỗi', 'Không thể tải dữ liệu giỏ hàng. Vui lòng kiểm tra kết nối hoặc xác thực ngrok.');
      }
    };

    fetchCartData(id);
  }, [userId, id]);

  const handleCopyCart = async () => {
    if (!userId) {
      Alert.alert('Lỗi', 'Bạn cần đăng nhập để sao chép giỏ hàng', [
        { text: 'OK', onPress: () => router.push('/(auth)/login') },
      ]);
      return;
    }

    Alert.alert(
      'Xác nhận sao chép',
      'Bạn có muốn sao chép giỏ hàng này không?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đồng ý',
          onPress: async () => {
            try {
              const result = await apiFetch(`${API_BASE_URL}/Cart/CopyGioHang`, 'CopyCart', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  userID: userId,
                  copyID: id,
                }),
              });

              console.log('Copy cart response:', result);
              Alert.alert('Thành công', 'Giỏ hàng đã được sao chép thành công!', [
                { text: 'OK', onPress: () => router.back() },
              ]);
            } catch (error) {
              console.error('Copy cart error:', error);
              Alert.alert('Lỗi', 'Không thể sao chép giỏ hàng. Vui lòng kiểm tra kết nối hoặc xác thực ngrok.');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const formatCurrency = (amount: number) => {
    return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={themeColors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <Stack.Screen options={{ title: 'Sao chép giỏ hàng' }} />
      <Text style={[styles.title, { color: themeColors.textPrimary }]}>Giỏ Hàng Bạn Muốn Sao Chép</Text>

      <ScrollView style={styles.itemsContainer}>
        {cartItems.length === 0 && comboItems.length === 0 ? (
          <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>
            Giỏ hàng bạn muốn sao chép đang trống
          </Text>
        ) : (
          <>
            {cartItems.map(item => (
              <Link href={`/products/${item.idSanPham}`} key={item.idSanPham}>
                <View style={[styles.cartItem, { borderBottomColor: themeColors.border }]}>
                  <Image source={{ uri: item.hinhAnh }} style={styles.itemImage} />
                  <View style={styles.itemDetails}>
                    <Text style={[styles.itemName, { color: themeColors.textPrimary }]}>
                      {item.tenSanPham}
                    </Text>
                    <Text style={[styles.itemInfo, { color: themeColors.textSecondary }]}>
                      Size: {item.kickThuoc} | Color: {item.mauSac}
                    </Text>
                    <Text style={[styles.itemPrice, { color: themeColors.primary }]}>
                      {formatCurrency(item.tienSanPham)} VND
                    </Text>
                    <View style={styles.quantityContainer}>
                      <Text style={[styles.quantity, { color: themeColors.textPrimary }]}>
                        <Text style={{ fontWeight: 'bold' }}>Số Lượng :</Text> {item.soLuong}
                      </Text>
                    </View>
                  </View>
                </View>
              </Link>
            ))}

            {comboItems.map(item => (
              <Link href={`/cartSupport/${item.idCombo}`} key={item.idCombo}>
                <View style={[styles.cartItem, { borderBottomColor: themeColors.border }]}>
                  <Image source={{ uri: item.hinhAnh }} style={styles.itemImage} />
                  <View style={styles.itemDetails}>
                    <Text style={[styles.itemName, { color: themeColors.textPrimary }]}>
                      {item.tenCombo}
                    </Text>
                    <Text style={[styles.itemInfo, { color: themeColors.textSecondary }]}>
                      Gồm: {item.sanPhamList.length} sản phẩm
                    </Text>
                    <Text style={[styles.itemPrice, { color: themeColors.primary }]}>
                      {formatCurrency(item.gia)} VND
                    </Text>
                  </View>
                  <View style={styles.itemActions}>
                    <Text style={[styles.quantity, { color: themeColors.textPrimary }]}>
                      {item.soLuong}
                    </Text>
                    <TouchableOpacity
                      style={[styles.editButton, { borderColor: themeColors.primary }]}
                      onPress={(event) => {
                        event.stopPropagation();
                        router.push(`/cartSupport/${item.idCombo}`);
                      }}
                    >
                      <Text style={[styles.editButtonText, { color: themeColors.primary }]}>
                        Xem
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Link>
            ))}
          </>
        )}
      </ScrollView>

      <TouchableOpacity
        style={[styles.copyButton, { backgroundColor: themeColors.primary }]}
        onPress={handleCopyCart}
      >
        <Text style={[styles.copyButtonText, { color: themeColors.background }]}>
          Sao Chép Giỏ Hàng
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 48,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    padding: 24,
  },
  itemsContainer: {
    flex: 1,
  },
  cartItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  itemDetails: {
    flex: 1,
    marginLeft: 16,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
  },
  itemInfo: {
    fontSize: 14,
    marginTop: 4,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  quantity: {
    marginHorizontal: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  editButton: {
    borderWidth: 1,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginHorizontal: 8,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
  copyButton: {
    margin: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  copyButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
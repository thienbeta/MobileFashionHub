import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Minus, Plus, Trash2, ShoppingCart } from 'lucide-react-native';
import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/theme';
import { Appearance } from 'react-native';
import { colors } from '../style/themeColors';
import { useFocusEffect } from 'expo-router';
import { WebView } from 'react-native-webview';
import { Link } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import { apiFetch } from '../../src/utils/api';
import { KeyboardTypeOptions } from 'react-native';

const API_BASE_URL = 'http://192.168.10.35:5261/api';
const VN_ADDRESS_API = 'https://provinces.open-api.vn/api/';

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

interface CheckoutForm {
  fullName: string;
  phoneNumber: string;
  address: string;
  province: string;
  district: string;
  ward: string;
}

interface Province {
  code: number;
  name: string;
}

interface District {
  code: number;
  name: string;
}

interface Ward {
  code: number;
  name: string;
}

interface ShippingData {
  [key: string]: { fee: number; time: string };
}

const shippingData: ShippingData = {
  "Hà Nội": { fee: 40000, time: "3 - 5 ngày" },
  "TP. Hồ Chí Minh": { fee: 20000, time: "2 - 3 ngày" },
  "Hải Phòng": { fee: 45000, time: "3 - 5 ngày" },
  "Đà Nẵng": { fee: 30000, time: "2 - 3 ngày" },
  "Cần Thơ": { fee: 30000, time: "2 - 4 ngày" },
  "An Giang": { fee: 35000, time: "3 - 4 ngày" },
  "Bà Rịa - Vũng Tàu": { fee: 25000, time: "2 - 3 ngày" },
  "Bắc Giang": { fee: 45000, time: "3 - 5 ngày" },
  "Bắc Kạn": { fee: 50000, time: "4 - 6 ngày" },
  "Bạc Liêu": { fee: 35000, time: "3 - 4 ngày" },
  "Bắc Ninh": { fee: 40000, time: "3 - 5 ngày" },
  "Bến Tre": { fee: 30000, time: "2 - 4 ngày" },
  "Bình Định": { fee: 25000, time: "2 - 3 ngày" },
  "Bình Dương": { fee: 20000, time: "2 - 3 ngày" },
  "Bình Phước": { fee: 20000, time: "2 - 3 ngày" },
  "Bình Thuận": { fee: 25000, time: "2 - 3 ngày" },
  "Cà Mau": { fee: 35000, time: "3 - 5 ngày" },
  "Cao Bằng": { fee: 50000, time: "4 - 6 ngày" },
  "Đắk Lắk": { fee: 0, time: "Nội tỉnh" },
  "Đắk Nông": { fee: 15000, time: "1 - 2 ngày" },
  "Điện Biên": { fee: 50000, time: "4 - 6 ngày" },
  "Đồng Nai": { fee: 20000, time: "2 - 3 ngày" },
  "Đồng Tháp": { fee: 30000, time: "3 - 4 ngày" },
  "Gia Lai": { fee: 15000, time: "1 - 2 ngày" },
  "Hà Giang": { fee: 50000, time: "4 - 6 ngày" },
  "Hà Nam": { fee: 45000, time: "3 - 5 ngày" },
  "Hà Tĩnh": { fee: 35000, time: "3 - 4 ngày" },
  "Hải Dương": { fee: 45000, time: "3 - 5 ngày" },
  "Hậu Giang": { fee: 35000, time: "3 - 4 ngày" },
  "Hòa Bình": { fee: 45000, time: "3 - 5 ngày" },
  "Hưng Yên": { fee: 40000, time: "3 - 5 ngày" },
  "Khánh Hòa": { fee: 25000, time: "2 - 3 ngày" },
  "Kiên Giang": { fee: 35000, time: "3 - 4 ngày" },
  "Kon Tum": { fee: 15000, time: "1 - 2 ngày" },
  "Lai Châu": { fee: 50000, time: "4 - 6 ngày" },
  "Lâm Đồng": { fee: 20000, time: "1 - 2 ngày" },
  "Lạng Sơn": { fee: 50000, time: "4 - 6 ngày" },
  "Lào Cai": { fee: 50000, time: "4 - 6 ngày" },
  "Long An": { fee: 30000, time: "2 - 4 ngày" },
  "Nam Định": { fee: 45000, time: "3 - 5 ngày" },
  "Nghệ An": { fee: 35000, time: "3 - 4 ngày" },
  "Ninh Bình": { fee: 45000, time: "3 - 5 ngày" },
  "Ninh Thuận": { fee: 25000, time: "2 - 3 ngày" },
  "Phú Thọ": { fee: 45000, time: "3 - 5 ngày" },
  "Phú Yên": { fee: 25000, time: "2 - 3 ngày" },
  "Quảng Bình": { fee: 35000, time: "3 - 4 ngày" },
  "Quảng Nam": { fee: 25000, time: "2 - 3 ngày" },
  "Quảng Ngãi": { fee: 25000, time: "2 - 3 ngày" },
  "Quảng Ninh": { fee: 50000, time: "4 - 6 ngày" },
  "Quảng Trị": { fee: 30000, time: "3 - 4 ngày" },
  "Sóc Trăng": { fee: 35000, time: "3 - 4 ngày" },
  "Sơn La": { fee: 50000, time: "4 - 6 ngày" },
  "Tây Ninh": { fee: 25000, time: "2 - 3 ngày" },
  "Thái Bình": { fee: 45000, time: "3 - 5 ngày" },
  "Thái Nguyên": { fee: 45000, time: "3 - 5 ngày" },
  "Thanh Hóa": { fee: 40000, time: "3 - 4 ngày" },
  "Thừa Thiên Huế": { fee: 30000, time: "2 - 3 ngày" },
  "Tiền Giang": { fee: 30000, time: "2 - 3 ngày" },
  "Trà Vinh": { fee: 30000, time: "2 - 3 ngày" },
  "Tuyên Quang": { fee: 50000, time: "4 - 6 ngày" },
  "Vĩnh Long": { fee: 30000, time: "2 - 3 ngày" },
  "Vĩnh Phúc": { fee: 45000, time: "3 - 5 ngày" },
  "Yên Bái": { fee: 50000, time: "4 - 6 ngày" },
};

const normalizeProvinceName = (name: string): string => {
  const mapping: { [key: string]: string } = {
    "Thành phố Hà Nội": "Hà Nội",
    "Thành phố Hồ Chí Minh": "TP. Hồ Chí Minh",
    "Thành phố Hải Phòng": "Hải Phòng",
    "Thành phố Đà Nẵng": "Đà Nẵng",
    "Thành phố Cần Thơ": "Cần Thơ",
  };
  return mapping[name] || name.replace(/^(Tỉnh|Thành phố) /, '');
};

const CartScreen = () => {
  const router = useRouter();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [comboItems, setComboItems] = useState<ComboItem[]>([]);
  const [cartId, setCartId] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState('');
  const [discountApplied, setDiscountApplied] = useState(false);
  const [discountValue, setDiscountValue] = useState(0);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showVNPayWebView, setShowVNPayWebView] = useState(false);
  const [vnpayUrl, setVNPayUrl] = useState('');
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark' || (theme === 'system' && (Appearance.getColorScheme() === 'dark' || Appearance.getColorScheme() === null));
  const themeColors = isDarkMode ? colors.dark : colors.light;
  const [checkoutForm, setCheckoutForm] = useState<CheckoutForm>({
    fullName: '',
    phoneNumber: '',
    address: '',
    province: '',
    district: '',
    ward: '',
  });
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'VNPay'>('COD');
  const [isLoading, setIsLoading] = useState(false);
  const [shippingFee, setShippingFee] = useState<number>(0);
  const getSafeColor = (color: string) => {
    if (!color) return '#000000';
    return color.startsWith('#') ? color : `#${color}`;
  };

  const inputFields: {
    label: string;
    field: keyof CheckoutForm;
    placeholder: string;
    keyboardType?: KeyboardTypeOptions;
  }[] = [
    { label: 'Tên người nhận', field: 'fullName', placeholder: 'Nhập tên người nhận' },
    { label: 'Số điện thoại', field: 'phoneNumber', placeholder: 'Nhập số điện thoại', keyboardType: 'numeric' },
  ];

  useEffect(() => {
    fetchCartData();
    fetchProvinces();
  }, []);

  const fetchCartData = async () => {
    try {
      const fileUri = FileSystem.documentDirectory + 'user.json';
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (!fileInfo.exists) {
        Alert.alert('Vui lòng đăng nhập', 'Bạn cần đăng nhập để xem giỏ hàng', [
          { text: 'OK', onPress: () => router.push('/(auth)/login') },
        ]);
        return;
      }

      const fileContent = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      const userData = JSON.parse(fileContent);
      const userId = userData?.user?.maNguoiDung;

      if (!userId) {
        Alert.alert('Vui lòng đăng nhập', 'Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.', [
          { text: 'OK', onPress: () => router.push('/(auth)/login') },
        ]);
        return;
      }

      const data = await apiFetch(`${API_BASE_URL}/Cart/GioHangByKhachHang?id=${userId}`, 'CartData');
      if (!data) {
        setCartItems([]);
        setComboItems([]);
        setCartId(null);
        return;
      }
      setCartId(data.id || null);

      const processedCartItems = Array.isArray(data.ctghSanPhamView)
        ? data.ctghSanPhamView.map((item: any) => ({
          ...item,
          hinhAnh: item.hinhAnh?.startsWith('data:image')
            ? item.hinhAnh
            : `data:image/jpeg;base64,${item.hinhAnh}`,
        }))
        : [];
      setCartItems(processedCartItems);

      const processedComboItems = Array.isArray(data.ctghComboView)
        ? data.ctghComboView.map((combo: any) => ({
          idCombo: combo.idCombo,
          tenCombo: combo.tenCombo,
          hinhAnh: combo.hinhAnh?.startsWith('data:image')
            ? combo.hinhAnh
            : `data:image/jpeg;base64,${combo.hinhAnh}`,
          soLuong: combo.soLuong,
          gia: combo.gia,
          sanPhamList: Array.isArray(combo.sanPhamList)
            ? combo.sanPhamList.map((item: any) => ({
              hinhAnh: item.hinhAnh?.startsWith('data:image')
                ? item.hinhAnh
                : `data:image/jpeg;base64,${item.hinhAnh}`,
              maSanPham: item.maSanPham,
              soLuong: item.soLuong,
              tenSanPham: item.tenSanPham,
            }))
            : [],
        }))
        : [];
      setComboItems(processedComboItems);
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể tải dữ liệu giỏ hàng');
      console.error('Error fetching cart:', error);
      setCartItems([]);
      setComboItems([]);
      setCartId(null);
    }
  };

  const fetchProvinces = async () => {
    try {
      const data = await apiFetch(`${VN_ADDRESS_API}p/`, 'Provinces');
      setProvinces(data);
    } catch (error) {
      console.error('Lỗi khi tải danh sách thành phố:', error);
    }
  };

  const fetchDistricts = async (provinceCode: number) => {
    try {
      const data = await apiFetch(`${VN_ADDRESS_API}p/${provinceCode}?depth=2`, 'Districts');
      setDistricts(data.districts);
      setWards([]);
      setCheckoutForm(prev => ({ ...prev, district: '', ward: '' }));
      setShippingFee(0); // Reset shipping fee when province changes
    } catch (error) {
      console.error('Lỗi khi tải danh sách quận huyện:', error);
    }
  };

  const fetchWards = async (districtCode: number) => {
    try {
      const data = await apiFetch(`${VN_ADDRESS_API}d/${districtCode}?depth=2`, 'Wards');
      setWards(data.wards);
      setCheckoutForm(prev => ({ ...prev, ward: '' }));
    } catch (error) {
      console.error('Lỗi khi tải danh sách xã phường:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchCartData();
    }, [])
  );

  const handleQuantityChange = async (idSanPham: string, change: number) => {
    try {
      const fileUri = FileSystem.documentDirectory + 'user.json';
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (!fileInfo.exists) {
        Alert.alert('Vui lòng đăng nhập', 'Bạn cần đăng nhập để xem giỏ hàng', [
          { text: 'OK', onPress: () => router.push('/(auth)/login') },
        ]);
        return;
      }

      const fileContent = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      const userData = JSON.parse(fileContent);
      const userId = userData?.user?.maNguoiDung;
      if (!userId) {
        Alert.alert('Vui lòng đăng nhập', 'Bạn cần đăng nhập để thay đổi số lượng');
        return;
      }

      const info = { MaKhachHang: userId, IDSanPham: idSanPham, IDCombo: null };
      const endpoint = change > 0 ? 'TangSoLuongSanPham' : 'GiamSoLuongSanPham';

      await apiFetch(`${API_BASE_URL}/Cart/${endpoint}`, 'UpdateQuantity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(info),
      });

      setCartItems(prevItems =>
        prevItems.map(item =>
          item.idSanPham === idSanPham
            ? { ...item, soLuong: Math.max(1, item.soLuong + change) }
            : item
        )
      );
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể cập nhật số lượng');
      console.error('Error updating quantity:', error);
    }
  };

  const handleComboQuantityChange = async (idCombo: number, change: number) => {
    try {
      const fileUri = FileSystem.documentDirectory + 'user.json';
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (!fileInfo.exists) {
        Alert.alert('Vui lòng đăng nhập', 'Bạn cần đăng nhập để xem giỏ hàng', [
          { text: 'OK', onPress: () => router.push('/(auth)/login') },
        ]);
        return;
      }

      const fileContent = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      const userData = JSON.parse(fileContent);
      const userId = userData?.user?.maNguoiDung;
      if (!userId) {
        Alert.alert('Vui lòng đăng nhập', 'Bạn cần đăng nhập để thay đổi số lượng');
        return;
      }

      const info = { MaKhachHang: userId, IDSanPham: null, IDCombo: idCombo };
      const endpoint = change > 0 ? 'TangSoLuongCombo' : 'GiamSoLuongCombo';

      await apiFetch(`${API_BASE_URL}/Cart/${endpoint}`, 'UpdateComboQuantity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(info),
      });

      setComboItems(prevItems =>
        prevItems.map(item =>
          item.idCombo === idCombo
            ? { ...item, soLuong: Math.max(1, item.soLuong + change) }
            : item
        )
      );
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể cập nhật số lượng combo');
      console.error('Error updating combo quantity:', error);
    }
  };

  const handleRemoveItem = async (idSanPham: string) => {
    try {
      const fileUri = FileSystem.documentDirectory + 'user.json';
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (!fileInfo.exists) {
        Alert.alert('Vui lòng đăng nhập', 'Bạn cần đăng nhập để xem giỏ hàng', [
          { text: 'OK', onPress: () => router.push('/(auth)/login') },
        ]);
        return;
      }

      const fileContent = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      const userData = JSON.parse(fileContent);
      const userId = userData?.user?.maNguoiDung;
      if (!userId) {
        Alert.alert('Vui lòng đăng nhập', 'Bạn cần đăng nhập để xóa sản phẩm');
        return;
      }

      Alert.alert(
        'Xác nhận',
        'Bạn có muốn xóa sản phẩm này khỏi giỏ hàng?',
        [
          { text: 'Hủy', style: 'cancel' },
          {
            text: 'Xóa',
            onPress: async () => {
              try {
                const info = { MaKhachHang: userId, IDSanPham: idSanPham, IDCombo: null };
                await apiFetch(`${API_BASE_URL}/Cart/XoaSanPham`, 'RemoveItem', {
                  method: 'DELETE',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(info),
                });

                setCartItems(prevItems => prevItems.filter(item => item.idSanPham !== idSanPham));
                Alert.alert('Thành công', 'Đã xóa sản phẩm khỏi giỏ hàng');
              } catch (error) {
                Alert.alert('Lỗi', 'Xóa sản phẩm thất bại');
                console.error('Error removing item:', error);
              }
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('Lỗi', 'Xóa sản phẩm thất bại');
      console.error('Error removing item:', error);
    }
  };

  const handleRemoveCombo = async (idCombo: number) => {
    try {
      const fileUri = FileSystem.documentDirectory + 'user.json';
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (!fileInfo.exists) {
        Alert.alert('Vui lòng đăng nhập', 'Bạn cần đăng nhập để xem giỏ hàng', [
          { text: 'OK', onPress: () => router.push('/(auth)/login') },
        ]);
        return;
      }

      const fileContent = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      const userData = JSON.parse(fileContent);
      const userId = userData?.user?.maNguoiDung;
      if (!userId) {
        Alert.alert('Vui lòng đăng nhập', 'Bạn cần đăng nhập để xóa combo');
        return;
      }

      Alert.alert(
        'Xác nhận',
        'Bạn có muốn xóa combo này khỏi giỏ hàng?',
        [
          { text: 'Hủy', style: 'cancel' },
          {
            text: 'Xóa',
            onPress: async () => {
              try {
                const info = { MaKhachHang: userId, IDSanPham: null, IDCombo: idCombo };
                await apiFetch(`${API_BASE_URL}/Cart/XoaCombo`, 'RemoveCombo', {
                  method: 'DELETE',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(info),
                });

                setComboItems(prevItems => prevItems.filter(item => item.idCombo !== idCombo));
                Alert.alert('Thành công', 'Đã xóa combo khỏi giỏ hàng');
              } catch (error) {
                Alert.alert('Lỗi', 'Xóa combo thất bại');
                console.error('Error removing combo:', error);
              }
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('Lỗi', 'Xóa combo thất bại');
      console.error('Error removing combo:', error);
    }
  };

  const handleApplyPromo = async (): Promise<void> => {
    try {
      const result = await apiFetch(
        `${API_BASE_URL}/Voucher/Validate?code=${encodeURIComponent(promoCode)}&cartId=${cartId}`,
        'ApplyPromo'
      );

      if (!result.success) {
        Alert.alert('Lỗi', result.Message || 'Mã giảm giá không hợp lệ hoặc đã bị sử dụng');
        return;
      }

      console.log('API Response:', result);
      const discountAmount = result.discountAmount || result.DiscountAmount || 0;
      setDiscountApplied(true);
      setDiscountValue(discountAmount);
      console.log('Updated discountValue:', discountAmount);
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể áp dụng mã giảm giá. Vui lòng thử lại');
      console.error('Error applying promo:', error);
    }
  };

  const calculateSubtotal = (): number => {
    const productTotal: number = cartItems.reduce((sum: number, item: CartItem) => sum + item.tienSanPham * item.soLuong, 0);
    const comboTotal: number = comboItems.reduce((sum: number, item: ComboItem) => sum + item.gia * item.soLuong, 0);
    return productTotal + comboTotal;
  };

  const calculateDiscount = (): number => {
    return discountApplied ? (discountValue || 0) : 0;
  };

  const calculateShippingFee = (): number => {
    const normalizedProvince = normalizeProvinceName(checkoutForm.province);
    console.log('Normalized Province:', normalizedProvince, 'Shipping Fee:', shippingData[normalizedProvince]?.fee || 0);
    return checkoutForm.ward && normalizedProvince ? shippingData[normalizedProvince]?.fee || 0 : 0;
  };

  const calculateVat = (): number => {
    const subtotal = calculateSubtotal();
    const discount = calculateDiscount();
    const shipping = calculateShippingFee();
    return (subtotal - discount + shipping) * 0.1;
  };

  const calculateTotal = (): number => {
    const subtotal = calculateSubtotal();
    const discount = calculateDiscount();
    const shipping = calculateShippingFee();
    const vat = calculateVat();
    return subtotal - discount + shipping + vat;
  };

  const handleCheckoutFormChange = (field: keyof CheckoutForm, value: string) => {
    setCheckoutForm(prev => ({ ...prev, [field]: value }));
    if (field === 'province' || field === 'ward') {
      setShippingFee(calculateShippingFee());
    }
  };

  const validateForm = () => {
    const requiredFields = Object.keys(checkoutForm) as (keyof CheckoutForm)[];
    const emptyFields = requiredFields.filter(field => !checkoutForm[field]);

    if (emptyFields.length > 0) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ thông tin');
      return false;
    }

    if (!/^\d{10}$/.test(checkoutForm.phoneNumber)) {
      Alert.alert('Lỗi', 'Số điện thoại không hợp lệ (cần 10 chữ số)');
      return false;
    }

    return true;
  };

  const handleSubmitCheckout = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const fileUri = FileSystem.documentDirectory + 'user.json';
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (!fileInfo.exists) {
        Alert.alert('Vui lòng đăng nhập', 'Bạn cần đăng nhập để xem giỏ hàng', [
          { text: 'OK', onPress: () => router.push('/(auth)/login') },
        ]);
        return;
      }

      const fileContent = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      const userData = JSON.parse(fileContent);
      const userId = userData?.user?.maNguoiDung;

      const paymentRequest = {
        CartId: parseInt(cartId || '0'),
        MaNguoiDung: userId,
        TenNguoiNhan: checkoutForm.fullName,
        Sdt: checkoutForm.phoneNumber,
        DiaChi: [checkoutForm.address, checkoutForm.ward, checkoutForm.district, checkoutForm.province]
          .filter(part => part)
          .join(', '),
        ShippingFee: calculateShippingFee(),
        DiscountAmount: calculateDiscount(),
        VatAmount: calculateVat(),
        FinalAmount: calculateTotal(),
        CouponCode: discountApplied ? promoCode : null,
        NgayDat: new Date().toISOString(),
        TrangThaiDonHang: 0,
        TrangThaiHang: 0,
        PaymentMethod: paymentMethod.toLowerCase(),
        ChiTietDonHangs: [
          ...cartItems.map(item => ({
            MaSanPham: item.idSanPham,
            SanPhamMaSanPham: item.idSanPham,
            SoLuong: item.soLuong,
            Gia: item.tienSanPham,
            ThanhTien: item.soLuong * item.tienSanPham,
          })),
          ...comboItems.map(combo => ({
            MaCombo: combo.idCombo,
            SoLuong: combo.soLuong,
            Gia: combo.gia,
            ThanhTien: combo.soLuong * combo.gia,
          })),
        ],
      };

      const result = await apiFetch(`${API_BASE_URL}/CheckOut/process-payment`, 'Checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentRequest),
      });

      if (!result.success) {
        throw new Error(result.Message || 'Tạo đơn hàng thất bại');
      }

      if (paymentMethod.toLowerCase() === 'vnpay') {
        const paymentUrl = result.message;
        setVNPayUrl(paymentUrl);
        setShowVNPayWebView(true);
      } else {
        Alert.alert(
          'Thành công',
          'Đặt hàng thành công! Cảm ơn bạn đã mua sắm.',
          [
            {
              text: 'OK',
              onPress: () => {
                setCartItems([]);
                setComboItems([]);
                setShowCheckout(false);
                setDiscountApplied(false);
                setDiscountValue(0);
                setPromoCode('');
                setShippingFee(0);
                setCheckoutForm({ fullName: '', phoneNumber: '', address: '', province: '', district: '', ward: '' });
                router.push('/(tabs)/products');
              },
            },
          ]
        );
      }
    } catch (error: any) {
      Alert.alert('Lỗi', 'Tạo đơn hàng thất bại. Vui lòng thử lại.');
      console.error('Checkout error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  if (cartItems.length === 0 && comboItems.length === 0 && !showCheckout) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: themeColors.background }]}>
        <ShoppingCart size={64} color={themeColors.iconSecondary} />
        <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>
          Giỏ hàng của bạn đang trống
        </Text>
        <TouchableOpacity
          style={[styles.checkoutButton, { backgroundColor: themeColors.primary }]}
          onPress={() => router.push('/(tabs)/products')}
        >
          <Text style={[styles.checkoutButtonText, { color: themeColors.textOnPrimary }]}>
            Tiếp tục mua sắm
          </Text>
        </TouchableOpacity>
      </View>
    );
  } else {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        {!showCheckout ? (
          <>
            <Text style={[styles.title, { color: themeColors.textPrimary }]}>Giỏ Hàng của bạn</Text>

            <ScrollView style={styles.itemsContainer}>
              {cartItems.map(item => (
                <View
                  key={item.idSanPham}
                  style={[styles.cartItem, { borderBottomColor: themeColors.border }]}
                >
                  <Link href={`/products/${item.idSanPham}`}>
                    <Image source={{ uri: item.hinhAnh }} style={styles.itemImage} />
                  </Link>
                  <View style={styles.itemDetails}>
                    <Text style={[styles.itemName, { color: themeColors.textPrimary }]}>
                      {item.tenSanPham}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                      <Text style={[styles.itemInfo, { color: themeColors.textSecondary }]}>
                        Kích thước: {item.kickThuoc} | Màu:
                      </Text>
                      <View
                        style={{
                          width: 14,
                          height: 14,
                          borderRadius: 7,
                          backgroundColor: `#${item.mauSac}`,
                          marginLeft: 6,
                          borderWidth: 1,
                          borderColor: '#ccc',
                        }}
                      />
                    </View>

                    <Text style={[styles.itemPrice, { color: themeColors.primary }]}>
                      {formatCurrency(item.tienSanPham)} VND
                    </Text>
                    <View style={styles.quantityContainer}>
                      <TouchableOpacity
                        style={[styles.quantityButton, { backgroundColor: themeColors.card }]}
                        onPress={() => handleQuantityChange(item.idSanPham, -1)}
                      >
                        <Minus size={16} color={themeColors.primary} />
                      </TouchableOpacity>
                      <Text style={[styles.quantity, { color: themeColors.textPrimary }]}>
                        {item.soLuong}
                      </Text>
                      <TouchableOpacity
                        style={[styles.quantityButton, { backgroundColor: themeColors.card }]}
                        onPress={() => handleQuantityChange(item.idSanPham, 1)}
                      >
                        <Plus size={16} color={themeColors.primary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleRemoveItem(item.idSanPham)}
                  >
                    <Trash2 size={20} color={themeColors.error} />
                  </TouchableOpacity>
                </View>
              ))}

              {comboItems.map(item => (
                <View
                  key={item.idCombo}
                  style={[styles.cartItem, { borderBottomColor: themeColors.border }]}
                >
                  <Link href={`/combos/${item.idCombo}`}>
                    <Image source={{ uri: item.hinhAnh }} style={styles.itemImage} />
                  </Link>
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
                      onPress={() => router.push(`/cartSupport/${item.idCombo}`)}
                    >
                      <Text style={[styles.editButtonText, { color: themeColors.primary }]}>
                        Sửa
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleRemoveCombo(item.idCombo)}
                    >
                      <Trash2 size={20} color={themeColors.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>

            <View style={[styles.footer, { borderTopColor: themeColors.border }]}>
              <View style={styles.promoContainer}>
                <TextInput
                  style={[styles.promoInput, { borderColor: themeColors.border, color: themeColors.textPrimary }]}
                  placeholder="Mã giảm giá (Nếu có)"
                  placeholderTextColor={themeColors.textSecondary}
                  value={promoCode}
                  onChangeText={setPromoCode}
                />
                <TouchableOpacity
                  style={[styles.applyButton, { backgroundColor: themeColors.primary }]}
                  onPress={handleApplyPromo}
                >
                  <Text style={[styles.applyButtonText, { color: themeColors.textOnPrimary }]}>
                    Áp dụng
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.totalContainer}>
                <Text style={[styles.totalLabel, { color: themeColors.textSecondary }]}>
                  Tổng tiền:
                </Text>
                <Text style={[styles.totalAmount, { color: themeColors.primary }]}>
                  {formatCurrency(calculateSubtotal())} VND
                </Text>
              </View>
              {discountApplied && (
                <View style={styles.totalContainer}>
                  <Text style={[styles.discountLabel, { color: themeColors.success }]}>
                    Giảm giá (Mã {promoCode}):
                  </Text>
                  <Text style={[styles.discountAmount, { color: themeColors.success }]}>
                    -{formatCurrency(calculateDiscount())} VND
                  </Text>
                </View>
              )}
              <View style={styles.totalContainer}>
                <Text style={[styles.totalLabel, { color: themeColors.textSecondary }]}>
                  Phí giao hàng:
                </Text>
                <Text style={[styles.totalAmount, { color: themeColors.primary }]}>
                  {formatCurrency(calculateShippingFee())} VND
                </Text>
              </View>
              <View style={styles.totalContainer}>
                <Text style={[styles.totalLabel, { color: themeColors.textSecondary }]}>
                  Thuế VAT (10%):
                </Text>
                <Text style={[styles.totalAmount, { color: themeColors.primary }]}>
                  {formatCurrency(calculateVat())} VND
                </Text>
              </View>
              <View style={styles.totalContainer}>
                <Text style={[styles.totalLabel, { color: themeColors.textSecondary }]}>
                  Thành tiền:
                </Text>
                <Text style={[styles.totalAmount, { color: themeColors.primary }]}>
                  {formatCurrency(calculateTotal())} VND
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.checkoutButton, { backgroundColor: themeColors.primary }]}
                onPress={() => setShowCheckout(true)}
              >
                <Text style={[styles.checkoutButtonText, { color: themeColors.textOnPrimary }]}>
                  Thanh toán
                </Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <Modal visible={showCheckout} animationType="slide">
            <ScrollView style={[styles.checkoutContainer, { backgroundColor: themeColors.background }]}>
              <Text style={[styles.title, { color: themeColors.textPrimary }]}>
                Giỏ Hàng của bạn
              </Text>

              <View style={[styles.summaryContainer, { backgroundColor: themeColors.card }]}>
                <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>
                  Tóm tắt đơn hàng
                </Text>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: themeColors.textSecondary }]}>
                    Tiền hàng
                  </Text>
                  <Text style={[styles.summaryValue, { color: themeColors.textPrimary }]}>
                    {formatCurrency(calculateSubtotal())} VND
                  </Text>
                </View>
                {discountApplied && (
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: themeColors.success }]}>
                      Giảm giá (Mã {promoCode}):
                    </Text>
                    <Text style={[styles.summaryValue, { color: themeColors.success }]}>
                      -{formatCurrency(calculateDiscount())} VND
                    </Text>
                  </View>
                )}
                {checkoutForm.ward && (
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: themeColors.textSecondary }]}>
                      Phí giao hàng ({shippingData[normalizeProvinceName(checkoutForm.province)]?.time || 'N/A'})
                    </Text>
                    <Text style={[styles.summaryValue, { color: themeColors.textPrimary }]}>
                      {formatCurrency(calculateShippingFee())} VND
                    </Text>
                  </View>
                )}
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: themeColors.textSecondary }]}>
                    Thuế VAT (10%):
                  </Text>
                  <Text style={[styles.summaryValue, { color: themeColors.textPrimary }]}>
                    {formatCurrency(calculateVat())} VND
                  </Text>
                </View>
                <View style={[styles.summaryRow, { borderTopWidth: 1, borderTopColor: themeColors.border }]}>
                  <Text style={[styles.summaryLabel, { color: themeColors.textSecondary }]}>
                    Tổng tiền
                  </Text>
                  <Text style={[styles.summaryValue, { color: themeColors.primary, fontWeight: 'bold' }]}>
                    {formatCurrency(calculateTotal())} VND
                  </Text>
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>
                  Thông tin giao hàng
                </Text>

                {inputFields.map(({ label, field, placeholder, keyboardType }) => (
                  <View key={field} style={styles.inputContainer}>
                    <Text style={[styles.inputLabel, { color: themeColors.textSecondary }]}>
                      {label}
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        { borderColor: themeColors.border, color: themeColors.textPrimary }
                      ]}
                      value={checkoutForm[field]}
                      onChangeText={value => handleCheckoutFormChange(field, value)}
                      placeholder={placeholder}
                      placeholderTextColor={themeColors.textSecondary}
                      keyboardType={keyboardType ?? 'default'}
                    />
                  </View>
                ))}

                <View style={styles.inputContainer}>
                  <Text style={[styles.inputLabel, { color: themeColors.textSecondary }]}>
                    Tỉnh/Thành phố
                  </Text>
                  <View style={[styles.pickerContainer, { borderColor: themeColors.border }]}>
                    <Picker
                      selectedValue={checkoutForm.province}
                      onValueChange={(value) => {
                        handleCheckoutFormChange('province', value);
                        const selectedProvince = provinces.find(p => p.name === value);
                        if (selectedProvince) fetchDistricts(selectedProvince.code);
                      }}
                      style={[styles.picker, { color: themeColors.textPrimary }]}
                    >
                      <Picker.Item label="Chọn tỉnh/thành phố" value="" />
                      {provinces.map(province => (
                        <Picker.Item key={province.code} label={province.name} value={province.name} />
                      ))}
                    </Picker>
                  </View>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={[styles.inputLabel, { color: themeColors.textSecondary }]}>
                    Quận/Huyện
                  </Text>
                  <View style={[styles.pickerContainer, { borderColor: themeColors.border }]}>
                    <Picker
                      selectedValue={checkoutForm.district}
                      onValueChange={(value) => {
                        handleCheckoutFormChange('district', value);
                        const selectedDistrict = districts.find(d => d.name === value);
                        if (selectedDistrict) fetchWards(selectedDistrict.code);
                      }}
                      style={[styles.picker, { color: themeColors.textPrimary }]}
                      enabled={!!checkoutForm.province}
                    >
                      <Picker.Item label="Chọn quận/huyện" value="" />
                      {districts.map(district => (
                        <Picker.Item key={district.code} label={district.name} value={district.name} />
                      ))}
                    </Picker>
                  </View>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={[styles.inputLabel, { color: themeColors.textSecondary }]}>
                    Phường/Xã
                  </Text>
                  <View style={[styles.pickerContainer, { borderColor: themeColors.border }]}>
                    <Picker
                      selectedValue={checkoutForm.ward}
                      onValueChange={(value) => handleCheckoutFormChange('ward', value)}
                      style={[styles.picker, { color: themeColors.textPrimary }]}
                      enabled={!!checkoutForm.district}
                    >
                      <Picker.Item label="Chọn phường/xã" value="" />
                      {wards.map(ward => (
                        <Picker.Item key={ward.code} label={ward.name} value={ward.name} />
                      ))}
                    </Picker>
                  </View>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={[styles.inputLabel, { color: themeColors.textSecondary }]}>
                    Địa chỉ cụ thể (Số nhà, tên đường)
                  </Text>
                  <TextInput
                    style={[styles.input, { borderColor: themeColors.border, color: themeColors.textPrimary }]}
                    value={checkoutForm.address}
                    onChangeText={value => handleCheckoutFormChange('address', value)}
                    placeholder="Nhập địa chỉ chi tiết"
                    placeholderTextColor={themeColors.textSecondary}
                  />
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>
                  Phương thức thanh toán
                </Text>
                <View style={styles.paymentOptions}>
                  <TouchableOpacity
                    style={styles.paymentOption}
                    onPress={() => setPaymentMethod('COD')}
                  >
                    <View style={[styles.radioCircle, paymentMethod === 'COD' && styles.radioCircleSelected]} />
                    <Text style={[styles.paymentLabel, { color: themeColors.primary }]}>
                      Thanh toán khi nhận hàng (COD)
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.paymentOption}
                    onPress={() => setPaymentMethod('VNPay')}
                  >
                    <View style={[styles.radioCircle, paymentMethod === 'VNPay' && styles.radioCircleSelected]} />
                    <Text style={[styles.paymentLabel, { color: themeColors.primary }]}>
                      Thanh toán qua VNPay
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.checkoutButtons}>
                <TouchableOpacity
                  style={[styles.backButton, { borderColor: themeColors.primary }]}
                  onPress={() => setShowCheckout(false)}
                >
                  <Text style={[styles.backButtonText, { color: themeColors.primary }]}>
                    Quay lại giỏ hàng
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.checkoutButton, { backgroundColor: themeColors.primary }]}
                  onPress={handleSubmitCheckout}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color={themeColors.textOnPrimary} />
                  ) : (
                    <Text style={[styles.checkoutButtonText, { color: themeColors.textOnPrimary }]}>
                      {paymentMethod === 'COD' ? 'Xác nhận thanh toán COD' : 'Thanh toán qua VNPay'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </Modal>
        )}
        {showVNPayWebView && (
          <Modal visible={showVNPayWebView} animationType="slide">
            <View style={{ flex: 1 }}>
              <WebView
                source={{ uri: vnpayUrl }}
                userAgent="Mozilla/5.0 (Linux; Android 10; SM-G960F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.105 Mobile Safari/537.36"
                onNavigationStateChange={(navState) => {
                  console.log('Navigation state:', navState.url);
                  if (navState.url.includes('PaymentSuccess')) {
                    setShowVNPayWebView(false);
                    const params = new URLSearchParams(navState.url.split('?')[1]);
                    const status = params.get('status');
                    const orderId = params.get('orderId');
                    const transactionId = params.get('transactionId');

                    if (status === 'success') {
                      Alert.alert(
                        'Thành công',
                        `Thanh toán VNPay thành công! Mã đơn hàng: ${orderId}`,
                        [
                          {
                            text: 'OK',
                            onPress: () => {
                              setCartItems([]);
                              setComboItems([]);
                              setShowCheckout(false);
                              setDiscountApplied(false);
                              setDiscountValue(0);
                              setPromoCode('');
                              setShippingFee(0);
                              setCheckoutForm({ fullName: '', phoneNumber: '', address: '', province: '', district: '', ward: '' });
                              router.push('/(tabs)/products');
                            },
                          },
                        ]
                      );
                    }
                  } else if (navState.url.includes('PaymentFail')) {
                    setShowVNPayWebView(false);
                    const params = new URLSearchParams(navState.url.split('?')[1]);
                    const status = params.get('status');
                    const message = params.get('message');

                    Alert.alert('Lỗi', message || 'Thanh toán VNPay thất bại.');
                  } else if (navState.url === 'about:blank') {
                    console.log('Không thể tải trang thanh toán VNPay, nhưng giao dịch có thể vẫn hoàn tất.');
                  }
                }}
                onError={(syntheticEvent) => {
                  const { nativeEvent } = syntheticEvent;
                  console.error('WebView error:', nativeEvent);
                }}
              />
              <TouchableOpacity
                style={[styles.closeButton, { backgroundColor: themeColors.primary }]}
                onPress={() => setShowVNPayWebView(false)}
              >
                <Text style={[styles.closeButtonText, { color: themeColors.textOnPrimary }]}>
                  Đóng
                </Text>
              </TouchableOpacity>
            </View>
          </Modal>
        )}
      </View>
    );
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 48,
  },
  checkoutContainer: {
    flex: 1,
    padding: 24,
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
  quantityButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantity: {
    marginHorizontal: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  deleteButton: {
    padding: 8,
  },
  footer: {
    padding: 24,
    borderTopWidth: 1,
  },
  promoContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  promoInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    marginRight: 8,
  },
  applyButton: {
    padding: 10,
    borderRadius: 8,
    justifyContent: 'center',
  },
  applyButtonText: {
    fontWeight: '600',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '500',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: '700',
  },
  discountLabel: {
    fontSize: 16,
  },
  discountAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  checkoutButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  checkoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '500',
    marginVertical: 16,
    textAlign: 'center',
  },
  formSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 8,
  },
  picker: {
    height: 50,
    fontSize: 16,
  },
  checkoutButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backButton: {
    flex: 1,
    borderWidth: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginRight: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
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
  summaryContainer: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 8,
  },
  summaryLabel: {
    fontSize: 16,
  },
  summaryValue: {
    fontSize: 16,
  },
  paymentOptions: {
    marginBottom: 16,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#007AFF',
    marginRight: 8,
  },
  radioCircleSelected: {
    backgroundColor: '#007AFF',
  },
  paymentLabel: {
    fontSize: 16,
  },
  closeButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    margin: 16,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CartScreen;
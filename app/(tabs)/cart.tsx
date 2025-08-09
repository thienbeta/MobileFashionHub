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
  RefreshControl,
} from 'react-native';
import { Minus, Plus, Trash2, ShoppingCart, ArrowLeft } from 'lucide-react-native';
import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/theme';
import { Appearance } from 'react-native';
import { colors } from '../style/themeColors';
import { useFocusEffect } from 'expo-router';
import { WebView } from 'react-native-webview';
import { Link } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { KeyboardTypeOptions } from 'react-native';

const API_BASE_URL = 'https://ce5e722365ab.ngrok-free.app/api';

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
  ProvinceID: number;
  ProvinceName: string;
}

interface District {
  DistrictID: number;
  DistrictName: string;
}

interface Ward {
  WardCode: string;
  WardName: string;
}

interface ShippingFeeResponse {
  total: number;
}

interface LeadTimeResponse {
  leadtime: number;
  leadtime_order: {
    from_estimate_date: string;
    to_estimate_date: string;
  };
}

const CartScreen = () => {
  const router = useRouter();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark' || (theme === 'system' && Appearance.getColorScheme() === 'dark');
  const themeColors = isDarkMode ? colors.dark : colors.light;
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [comboItems, setComboItems] = useState<ComboItem[]>([]);
  const [cartId, setCartId] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState('');
  const [discountApplied, setDiscountApplied] = useState(false);
  const [discountValue, setDiscountValue] = useState(0);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showVNPayWebView, setShowVNPayWebView] = useState(false);
  const [vnpayUrl, setVNPayUrl] = useState('');
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
  const [isLoadingProvinces, setIsLoadingProvinces] = useState(false);
  const [isLoadingDistricts, setIsLoadingDistricts] = useState(false);
  const [isLoadingWards, setIsLoadingWards] = useState(false);
  const [isLoadingShippingFee, setIsLoadingShippingFee] = useState(false);
  const [isLoadingLeadTime, setIsLoadingLeadTime] = useState(false);
  const [shippingFee, setShippingFee] = useState<number | null>(null);
  const [leadTime, setLeadTime] = useState<LeadTimeResponse | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [formErrors, setFormErrors] = useState<Partial<CheckoutForm>>({});

  const getSafeColor = (color: string) => {
    if (!color) return '#000000';
    return color.startsWith('#') ? color : `#${color}`;
  };

  const getAuthHeaders = async () => {
    const token = await AsyncStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const inputFields: {
    label: string;
    field: keyof CheckoutForm;
    placeholder: string;
    keyboardType?: KeyboardTypeOptions;
  }[] = [
      { label: 'Tên người nhận', field: 'fullName', placeholder: 'Nhập tên người nhận' },
      { label: 'Số điện thoại', field: 'phoneNumber', placeholder: 'Nhập số điện thoại', keyboardType: 'numeric' },
      { label: 'Địa chỉ cụ thể (Số nhà, tên đường)', field: 'address', placeholder: 'Nhập địa chỉ chi tiết' },
    ];

  const fetchProvinces = async () => {
    setIsLoadingProvinces(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/GHN/provinces`, {
        headers: await getAuthHeaders(),
      });
      setProvinces(response.data.map((item: any) => ({
        ProvinceID: item.provinceID,
        ProvinceName: item.provinceName,
      })));
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể tải danh sách tỉnh/thành phố');
    } finally {
      setIsLoadingProvinces(false);
    }
  };

  const fetchDistricts = async (provinceId: number) => {
    setIsLoadingDistricts(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/GHN/districts/${provinceId}`, {
        headers: await getAuthHeaders(),
      });
      setDistricts(response.data.map((item: any) => ({
        DistrictID: item.districtID,
        DistrictName: item.districtName,
      })));
      setWards([]);
      setCheckoutForm(prev => ({ ...prev, district: '', ward: '' }));
      setShippingFee(null);
      setLeadTime(null);
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể tải danh sách quận/huyện');
    } finally {
      setIsLoadingDistricts(false);
    }
  };

  const fetchWards = async (districtId: number) => {
    setIsLoadingWards(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/GHN/wards/${districtId}`, {
        headers: await getAuthHeaders(),
      });
      setWards(response.data.map((item: any) => ({
        WardCode: item.wardCode,
        WardName: item.wardName,
      })));
      setCheckoutForm(prev => ({ ...prev, ward: '' }));
      setShippingFee(null);
      setLeadTime(null);
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể tải danh sách phường/xã');
    } finally {
      setIsLoadingWards(false);
    }
  };

  const fetchShippingFee = async (districtId: number, wardCode: string) => {
    setIsLoadingShippingFee(true);
    try {
      const request = {
        service_type_id: 2,
        from_district_id: 1552, // Giả định điểm xuất phát
        from_ward_code: '400103',
        to_district_id: districtId,
        to_ward_code: wardCode,
        length: 35,
        width: 25,
        height: 10,
        weight: 1000,
        insurance_value: 0,
        coupon: null,
        items: [],
      };
      const response = await axios.post<ShippingFeeResponse>(`${API_BASE_URL}/GHN/shipping-fee`, request, {
        headers: await getAuthHeaders(),
      });
      setShippingFee(response.data.total);
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể tải phí giao hàng');
      setShippingFee(null);
    } finally {
      setIsLoadingShippingFee(false);
    }
  };

  const fetchLeadTime = async (districtId: number, wardCode: string) => {
    setIsLoadingLeadTime(true);
    try {
      const request = {
        from_district_id: 1552,
        from_ward_code: '400103',
        to_district_id: districtId,
        to_ward_code: wardCode,
        service_id: 53320,
      };
      const response = await axios.post<LeadTimeResponse>(`${API_BASE_URL}/GHN/leadtime`, request, {
        headers: await getAuthHeaders(),
      });
      setLeadTime(response.data);
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể tải thời gian giao hàng');
      setLeadTime(null);
    } finally {
      setIsLoadingLeadTime(false);
    }
  };

  const fetchCartData = async () => {
    try {
      setRefreshing(true);
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

      const response = await axios.get(`${API_BASE_URL}/Cart/GioHangByKhachHang?id=${userId}`, {
        headers: await getAuthHeaders(),
      });
      const data = response.data;
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
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể tải dữ liệu giỏ hàng');
      console.error('Error fetching cart:', error);
      setCartItems([]);
      setComboItems([]);
      setCartId(null);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCartData();
    fetchProvinces();
  }, []);

  useEffect(() => {
    const selectedProvince = provinces.find(p => p.ProvinceName === checkoutForm.province);
    if (selectedProvince) {
      fetchDistricts(selectedProvince.ProvinceID);
    }
  }, [checkoutForm.province, provinces]);

  useEffect(() => {
    const selectedDistrict = districts.find(d => d.DistrictName === checkoutForm.district);
    if (selectedDistrict) {
      fetchWards(selectedDistrict.DistrictID);
    }
  }, [checkoutForm.district, districts]);

  useEffect(() => {
    const selectedDistrict = districts.find(d => d.DistrictName === checkoutForm.district);
    const selectedWard = wards.find(w => w.WardName === checkoutForm.ward);
    if (selectedDistrict && selectedWard) {
      fetchShippingFee(selectedDistrict.DistrictID, selectedWard.WardCode);
      fetchLeadTime(selectedDistrict.DistrictID, selectedWard.WardCode);
    }
  }, [checkoutForm.district, checkoutForm.ward, districts, wards]);

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

      await axios.post(`${API_BASE_URL}/Cart/${endpoint}`, info, {
        headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
      });

      setCartItems(prevItems =>
        prevItems.map(item =>
          item.idSanPham === idSanPham
            ? { ...item, soLuong: Math.max(1, item.soLuong + change) }
            : item
        )
      );
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể cập nhật số lượng');
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

      await axios.post(`${API_BASE_URL}/Cart/${endpoint}`, info, {
        headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
      });

      setComboItems(prevItems =>
        prevItems.map(item =>
          item.idCombo === idCombo
            ? { ...item, soLuong: Math.max(1, item.soLuong + change) }
            : item
        )
      );
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể cập nhật số lượng combo');
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
                await axios.delete(`${API_BASE_URL}/Cart/XoaSanPham`, {
                  headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
                  data: info,
                });

                setCartItems(prevItems => prevItems.filter(item => item.idSanPham !== idSanPham));
                Alert.alert('Thành công', 'Đã xóa sản phẩm khỏi giỏ hàng');
              } catch (error: any) {
                Alert.alert('Lỗi', error.response?.data?.message || 'Xóa sản phẩm thất bại');
                console.error('Error removing item:', error);
              }
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Xóa sản phẩm thất bại');
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
                await axios.delete(`${API_BASE_URL}/Cart/XoaCombo`, {
                  headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
                  data: info,
                });

                setComboItems(prevItems => prevItems.filter(item => item.idCombo !== idCombo));
                Alert.alert('Thành công', 'Đã xóa combo khỏi giỏ hàng');
              } catch (error: any) {
                Alert.alert('Lỗi', error.response?.data?.message || 'Xóa combo thất bại');
                console.error('Error removing combo:', error);
              }
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Xóa combo thất bại');
      console.error('Error removing combo:', error);
    }
  };

  const handleApplyPromo = async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/Voucher/Validate?code=${encodeURIComponent(promoCode)}&cartId=${cartId}`,
        { headers: await getAuthHeaders() }
      );
      const result = response.data;

      if (!result.success) {
        Alert.alert('Lỗi', result.Message || 'Mã giảm giá không hợp lệ hoặc đã bị sử dụng');
        return;
      }

      const discountAmount = result.discountAmount || result.DiscountAmount || 0;
      setDiscountApplied(true);
      setDiscountValue(discountAmount);
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể áp dụng mã giảm giá. Vui lòng thử lại');
      console.error('Error applying promo:', error);
    }
  };

  const calculateSubtotal = () => {
    const productTotal = cartItems.reduce((sum, item) => sum + item.tienSanPham * item.soLuong, 0);
    const comboTotal = comboItems.reduce((sum, item) => sum + item.gia * item.soLuong, 0);
    return productTotal + comboTotal;
  };

  const calculateDiscount = () => {
    return discountApplied ? discountValue : 0;
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const discount = calculateDiscount();
    const shipping = shippingFee || 0;
    return subtotal - discount + shipping;
  };

  const restrictToDigits = (text: string) => {
    const digitsOnly = text.replace(/[^0-9]/g, '');
    setCheckoutForm(prev => ({ ...prev, phoneNumber: digitsOnly }));
  };

  const validateForm = () => {
    const errors: Partial<CheckoutForm> = {};
    if (!checkoutForm.fullName || checkoutForm.fullName.trim().length < 5) {
      errors.fullName = 'Họ tên phải có ít nhất 5 ký tự';
    }
    if (!checkoutForm.phoneNumber || !/^\d{10}$/.test(checkoutForm.phoneNumber)) {
      errors.phoneNumber = 'Số điện thoại phải có đúng 10 chữ số';
    }
    if (!checkoutForm.province) errors.province = 'Tỉnh/Thành phố là bắt buộc';
    if (!checkoutForm.district) errors.district = 'Quận/Huyện là bắt buộc';
    if (!checkoutForm.ward) errors.ward = 'Phường/Xã là bắt buộc';
    if (!checkoutForm.address || checkoutForm.address.trim() === '') {
      errors.address = 'Địa chỉ chi tiết là bắt buộc';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCheckoutFormChange = (field: keyof CheckoutForm, value: string) => {
    setCheckoutForm(prev => ({ ...prev, [field]: value }));
    setFormErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const handleSubmitCheckout = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const fileUri = FileSystem.documentDirectory + 'user.json';
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (!fileInfo.exists) {
        Alert.alert('Vui lòng đăng nhập', 'Bạn cần đăng nhập để thanh toán', [
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
        ShippingFee: shippingFee || 0,
        DiscountAmount: calculateDiscount(),
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

      const response = await axios.post(`${API_BASE_URL}/CheckOut/process-payment`, paymentRequest, {
        headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
      });
      const result = response.data;

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
                setShippingFee(null);
                setLeadTime(null);
                setCheckoutForm({ fullName: '', phoneNumber: '', address: '', province: '', district: '', ward: '' });
                router.push('/(tabs)/products');
              },
            },
          ]
        );
      }
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Tạo đơn hàng thất bại. Vui lòng thử lại.');
      console.error('Checkout error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const formatDate = (dateString: string) => {
    const deliveryDate = new Date(dateString);
    const day = deliveryDate.getDate();
    const month = deliveryDate.getMonth() + 1;
    const year = deliveryDate.getFullYear();
    return `Ngày ${day}, tháng ${month}, năm ${year}`;
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
  }

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      {!showCheckout ? (
        <>
          <Text style={[styles.title, { color: themeColors.textPrimary }]}>Giỏ Hàng của bạn</Text>

          <ScrollView
            style={styles.itemsContainer}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={fetchCartData}
                colors={[themeColors.primary]}
              />
            }
          >
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
                        backgroundColor: getSafeColor(item.mauSac),
                        marginLeft: 6,
                        borderWidth: 1,
                        borderColor: themeColors.border,
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
            <View style={styles.header}>
              <TouchableOpacity onPress={() => setShowCheckout(false)}>
                <ArrowLeft size={24} color={themeColors.iconPrimary} />
              </TouchableOpacity>
              <Text style={[styles.title, { color: themeColors.textPrimary }]}>Thanh toán</Text>
              <View style={{ width: 24 }} />
            </View>

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
                <View style={[styles.summaryRow, { flexDirection: 'column', alignItems: 'flex-start' }]}>
                  <Text style={[styles.summaryLabel, { color: themeColors.textSecondary }]}>
                    Phí giao hàng: {isLoadingShippingFee
                      ? 'Đang tải...'
                      : shippingFee !== null
                        ? `${formatCurrency(shippingFee)} VND`
                        : 'Không thể tải'}
                  </Text>
                  <Text style={[styles.summaryLabel, { color: themeColors.textSecondary }]}>
                    Thời gian nhận hàng: {leadTime
                      ? formatDate(leadTime.leadtime_order.to_estimate_date)
                      : 'Đang tải...'}
                  </Text>
                </View>

              )}
              <View style={[styles.summaryRow, { borderTopWidth: 1, borderTopColor: themeColors.border }]}>
                <Text style={[styles.summaryLabel, { color: themeColors.textSecondary }]}>
                  Tổng tiền
                </Text>
                <Text style={[styles.summaryValue, { color: themeColors.primary, fontWeight: 'bold' }]}>
                  {formatCurrency(calculateTotal())} VND
                </Text>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: themeColors.textSecondary }]}>
                Mã giảm giá (Nếu có)
              </Text>
              <View style={styles.promoContainer}>
                <TextInput
                  style={[styles.promoInput, { borderColor: themeColors.border, color: themeColors.textPrimary }]}
                  placeholder="Nhập mã giảm giá"
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
                      { borderColor: formErrors[field] ? 'red' : themeColors.border, color: themeColors.textPrimary },
                    ]}
                    value={checkoutForm[field]}
                    onChangeText={value => field === 'phoneNumber' ? restrictToDigits(value) : handleCheckoutFormChange(field, value)}
                    placeholder={placeholder}
                    placeholderTextColor={themeColors.textSecondary}
                    keyboardType={keyboardType ?? 'default'}
                    maxLength={field === 'phoneNumber' ? 10 : undefined}
                  />
                  {formErrors[field] && <Text style={styles.errorText}>{formErrors[field]}</Text>}
                </View>
              ))}

              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: themeColors.textSecondary }]}>
                  Tỉnh/Thành phố
                </Text>
                <View style={[styles.pickerContainer, { borderColor: formErrors.province ? 'red' : themeColors.border }]}>
                  <Picker
                    selectedValue={checkoutForm.province}
                    onValueChange={(value) => handleCheckoutFormChange('province', value)}
                    style={[styles.picker, { color: themeColors.textPrimary }]}
                    enabled={!isLoadingProvinces}
                  >
                    <Picker.Item label={isLoadingProvinces ? 'Đang tải...' : 'Chọn tỉnh/thành phố'} value="" />
                    {provinces.map(province => (
                      <Picker.Item key={province.ProvinceID} label={province.ProvinceName} value={province.ProvinceName} />
                    ))}
                  </Picker>
                </View>
                {formErrors.province && <Text style={styles.errorText}>{formErrors.province}</Text>}
              </View>

              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: themeColors.textSecondary }]}>
                  Quận/Huyện
                </Text>
                <View style={[styles.pickerContainer, { borderColor: formErrors.district ? 'red' : themeColors.border }]}>
                  <Picker
                    selectedValue={checkoutForm.district}
                    onValueChange={(value) => handleCheckoutFormChange('district', value)}
                    style={[styles.picker, { color: themeColors.textPrimary }]}
                    enabled={!!checkoutForm.province && !isLoadingDistricts}
                  >
                    <Picker.Item label={isLoadingDistricts ? 'Đang tải...' : 'Chọn quận/huyện'} value="" />
                    {districts.map(district => (
                      <Picker.Item key={district.DistrictID} label={district.DistrictName} value={district.DistrictName} />
                    ))}
                  </Picker>
                </View>
                {formErrors.district && <Text style={styles.errorText}>{formErrors.district}</Text>}
              </View>

              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: themeColors.textSecondary }]}>
                  Phường/Xã
                </Text>
                <View style={[styles.pickerContainer, { borderColor: formErrors.ward ? 'red' : themeColors.border }]}>
                  <Picker
                    selectedValue={checkoutForm.ward}
                    onValueChange={(value) => handleCheckoutFormChange('ward', value)}
                    style={[styles.picker, { color: themeColors.textPrimary }]}
                    enabled={!!checkoutForm.district && !isLoadingWards}
                  >
                    <Picker.Item label={isLoadingWards ? 'Đang tải...' : 'Chọn phường/xã'} value="" />
                    {wards.map(ward => (
                      <Picker.Item key={ward.WardCode} label={ward.WardName} value={ward.WardName} />
                    ))}
                  </Picker>
                </View>
                {formErrors.ward && <Text style={styles.errorText}>{formErrors.ward}</Text>}
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
                <ArrowLeft color={themeColors.primary} size={20} />
                <Text style={[styles.backButtonText, { color: themeColors.primary, marginLeft: 6 }]}>
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
                if (navState.url.includes('PaymentSuccess')) {
                  setShowVNPayWebView(false);
                  const params = new URLSearchParams(navState.url.split('?')[1]);
                  const status = params.get('status');
                  const orderId = params.get('orderId');

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
                            setShippingFee(null);
                            setLeadTime(null);
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
                  const message = params.get('message');
                  Alert.alert('Lỗi', message || 'Thanh toán VNPay thất bại.');
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Poppins_600SemiBold',
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
    fontFamily: 'Poppins_500Medium',
  },
  itemInfo: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    marginTop: 4,
  },
  itemPrice: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
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
    fontFamily: 'Poppins_500Medium',
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
    fontFamily: 'Poppins_400Regular',
  },
  applyButton: {
    padding: 10,
    borderRadius: 8,
    justifyContent: 'center',
  },
  applyButtonText: {
    fontFamily: 'Poppins_600SemiBold',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 18,
    fontFamily: 'Poppins_500Medium',
  },
  totalAmount: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
  },
  discountLabel: {
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
  },
  discountAmount: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
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
    fontFamily: 'Poppins_600SemiBold',
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
    fontFamily: 'Poppins_500Medium',
    marginVertical: 16,
    textAlign: 'center',
  },
  formSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Poppins_600SemiBold',
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
  },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 8,
  },
  picker: {
    height: 50,
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    marginTop: 4,
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
    flexDirection: 'row',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
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
    fontFamily: 'Poppins_500Medium',
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
    fontFamily: 'Poppins_400Regular',
  },
  summaryValue: {
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
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
    fontFamily: 'Poppins_400Regular',
  },
  closeButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    margin: 16,
  },
  closeButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
  },
});

export default CartScreen;
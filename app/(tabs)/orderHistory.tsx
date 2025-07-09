import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  TextInput,
  FlatList,
  Alert,
  Modal,
  ActivityIndicator,
  StyleSheet,
  Appearance,
  TextStyle,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { useRouter } from "expo-router";
import { ClipboardList, Package, Truck, CheckCircle, Eye, ChevronDown, ChevronUp, X } from "lucide-react-native";
import * as FileSystem from 'expo-file-system';
import { apiFetch } from '../../src/utils/api';
import { useTheme } from '../context/theme';
import { colors } from '../style/themeColors';

const API_BASE_URL = "http://192.168.10.32:5261/api";

const orderStatuses = {
  pending: { color: "#fbbf24", icon: ClipboardList, label: "Chờ xác nhận" },
  processing: { color: "#3b82f6", icon: Package, label: "Đang xử lý" },
  shipping: { color: "#8b5cf6", icon: Truck, label: "Đang giao hàng" },
  completed: { color: "#22c55e", icon: CheckCircle, label: "Đã hoàn thành" },
  canceled: { color: "#ef4444", icon: CheckCircle, label: "Đã hủy" },
};

type OrderStatus = keyof typeof orderStatuses;

interface Order {
  id: string;
  date: string;
  status: OrderStatus;
  total: number;
  tongTien: number;
  items: Array<{
    id: number;
    name: string;
    quantity: number;
    price: number;
    image: string;
  }>;
  tenNguoiNhan: string;
  hinhThucThanhToan: string;
  lyDoHuy?: string;
  sdt: string;
}

interface OrderItemProps {
  order: Order;
  onCancel: (orderId: string) => void;
}

const OrderItem = ({ order, onCancel }: OrderItemProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const statusInfo = orderStatuses[order.status] || orderStatuses.pending;
  const StatusIcon = statusInfo.icon;
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark' || (theme === 'system' && Appearance.getColorScheme() === 'dark');
  const themeColors = isDarkMode ? colors.dark : colors.light;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);
  };

  return (
    <View style={[styles.orderItemContainer, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
      <View style={[styles.orderItemHeader, { backgroundColor: themeColors.background }]}>
        <View style={styles.orderDetails}>
          <Text style={[styles.orderId, { color: themeColors.textPrimary } as TextStyle]}>
            Mã đơn hàng: {order.id || "N/A"}
          </Text>
          <Text style={[styles.orderInfo, { color: themeColors.textSecondary } as TextStyle]}>
            Người nhận: {order.tenNguoiNhan || "N/A"}
          </Text>
          <Text style={[styles.orderInfo, { color: themeColors.textSecondary } as TextStyle]}>
            Ngày đặt: {order.date || "N/A"}
          </Text>
          <Text style={[styles.orderInfo, { color: themeColors.textSecondary } as TextStyle]}>
            SĐT: {order.sdt || "N/A"}
          </Text>
          <Text style={[styles.orderInfo, { color: themeColors.textSecondary } as TextStyle]}>
            Phương thức thanh toán: {order.hinhThucThanhToan || "N/A"}
          </Text>
        </View>
        <View style={styles.statusContainer}>
          <View style={[styles.statusDot, { backgroundColor: statusInfo.color }]} />
          <View style={styles.statusLabelContainer}>
            <StatusIcon color={statusInfo.color} size={16} />
            <Text style={[styles.statusLabel, { color: themeColors.textPrimary } as TextStyle]}>
              {statusInfo.label}
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.orderFooter}>
        <View style={styles.orderTotal}>
          <Text style={[styles.orderTotalText, { color: themeColors.textPrimary } as TextStyle]}>
            {formatCurrency(order.tongTien || 0)}
          </Text>
          <Text style={[styles.orderItemsCount, { color: themeColors.textSecondary } as TextStyle]}>
            {order.items?.length || 0} sản phẩm
          </Text>
        </View>
        <View style={styles.orderActions}>
          <TouchableOpacity
            style={[styles.actionButton, { borderColor: themeColors.border }]}
            onPress={() => setIsExpanded(!isExpanded)}
          >
            <View style={styles.actionButtonContent}>
              {isExpanded ? (
                <>
                  <ChevronUp color={themeColors.textPrimary} size={16} />
                  <Text style={[styles.actionText, { color: themeColors.textPrimary } as TextStyle]}>Thu gọn</Text>
                </>
              ) : (
                <>
                  <ChevronDown color={themeColors.textPrimary} size={16} />
                  <Text style={[styles.actionText, { color: themeColors.textPrimary } as TextStyle]}>Chi tiết</Text>
                </>
              )}
            </View>
          </TouchableOpacity>
          {(order.status === "pending" || order.status === "processing") && (
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton, { borderColor: themeColors.error }]}
              onPress={() => onCancel(order.id)}
            >
              <Text style={[styles.cancelButtonText, { color: themeColors.error } as TextStyle]}>Hủy đơn</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      {isExpanded && (
        <View style={[styles.orderDetailsExpanded, { borderTopColor: themeColors.border }]}>
          <View style={styles.orderItems}>
            {(order.items || []).map((item) => (
              <View key={item.id} style={styles.orderItem}>
                <View style={styles.orderItemImageContainer}>
                  <Image
                    source={{ uri: item.image }}
                    style={styles.orderItemImage}
                    onError={() => console.log(`Không tải được hình ảnh cho ${item.name}: ${item.image}`)}
                  />
                </View>
                <View style={styles.orderItemInfo}>
                  <Text style={[styles.orderItemName, { color: themeColors.textPrimary } as TextStyle]}>
                    {item.name || "N/A"}
                  </Text>
                  <Text style={[styles.orderItemQuantity, { color: themeColors.textSecondary } as TextStyle]}>
                    Số lượng: {item.quantity || 0} x {formatCurrency(item.price || 0)}
                  </Text>
                </View>
                <Text style={[styles.orderItemTotal, { color: themeColors.textPrimary } as TextStyle]}>
                  {formatCurrency((item.quantity || 0) * (item.price || 0))}
                </Text>
              </View>
            ))}
          </View>
          <View style={[styles.orderSummary, { borderTopColor: themeColors.border }]}>
            <View style={styles.orderSummaryRow}>
              <Text style={[styles.orderSummaryLabel, { color: themeColors.textSecondary } as TextStyle]}>
                Tổng trước giảm giá:
              </Text>
              <Text style={[styles.orderSummaryValue, { color: themeColors.textPrimary } as TextStyle]}>
                {formatCurrency(order.total || 0)}
              </Text>
            </View>
            <View style={styles.orderSummaryRow}>
              <Text style={[styles.orderSummaryLabel, { color: themeColors.textSecondary } as TextStyle]}>
                Tổng thanh toán:
              </Text>
              <Text style={[styles.orderSummaryTotal, { color: themeColors.primary } as TextStyle]}>
                {formatCurrency(order.tongTien || 0)}
              </Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const OrderHistory = () => {
  const router = useRouter();
  const [filterStatus, setFilterStatus] = useState("all");
  const [orders, setOrders] = useState<Order[]>([]);
  const [originalOrders, setOriginalOrders] = useState<Order[]>([]);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark' || (theme === 'system' && Appearance.getColorScheme() === 'dark');
  const themeColors = isDarkMode ? colors.dark : colors.light;

  const cancelReasonsSuggestions = [
    "Không muốn mua nữa",
    "Hết hàng",
    "Sai thông tin đơn hàng",
    "Khác",
  ];

  const mapStatus = (status: number): OrderStatus => {
    switch (status) {
      case 0: return "pending";
      case 1: return "processing";
      case 2: return "shipping";
      case 3: return "completed";
      case 4: return "canceled";
      default: return "pending";
    }
  };

  const fetchOrdersByUserId = async () => {
    try {
      setLoading(true);
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
      if (!userId || userId === "null" || userId === "undefined") {
        Alert.alert("Vui lòng đăng nhập", "Bạn cần đăng nhập để xem lịch sử đơn hàng", [
          { text: "OK", onPress: () => router.push("/login") },
        ]);
        return;
      }

      const rawOrders = await apiFetch(`${API_BASE_URL}/orders/${userId}`, 'Orders');
      if (!Array.isArray(rawOrders)) {
        console.error("API did not return an array:", rawOrders);
        setOrders([]);
        setOriginalOrders([]);
        return;
      }

      const mappedOrders = rawOrders.map((rawOrder: any) => {
        let formattedDate = "";
        if (rawOrder.ngayDat && typeof rawOrder.ngayDat === "string") {
          const [day, month, year] = rawOrder.ngayDat.split("/");
          formattedDate = `${year}-${month}-${day}`;
        }

        return {
          id: rawOrder.maDonHang.toString(),
          date: formattedDate,
          status: mapStatus(rawOrder.trangThaiDonHang),
          total: rawOrder.tongTien,
          tongTien: rawOrder.tongTien,
          items: rawOrder.sanPhams.map((item: any) => {
            const imageUrl = item.hinhAnh
              ? item.hinhAnh.startsWith("http")
                ? item.hinhAnh
                : `${API_BASE_URL}${item.hinhAnh}`
              : "https://tronhouse.com/assets/data/editor/source/meo-chup-anh-san-pham-quan-ao-de-kinh-doanh-online-hieu-qua/chup-anh-quan-ao-2.jpg";
            return {
              id: item.maChiTietDh,
              name: item.tenSanPham,
              quantity: item.soLuong,
              price: item.gia,
              image: imageUrl,
            };
          }),
          tenNguoiNhan: rawOrder.tenNguoiNhan,
          hinhThucThanhToan: rawOrder.hinhThucThanhToan,
          sdt: rawOrder.thongTinNguoiDung.sdt,
          lyDoHuy: rawOrder.lyDoHuy,
        };
      });

      setOrders(mappedOrders);
      setOriginalOrders(mappedOrders);
    } catch (error: any) {
      console.error("Error fetching orders:", error);
      Alert.alert("Lỗi", error.message || "Đã xảy ra lỗi khi tải lịch sử đơn hàng!");
      setOrders([]);
      setOriginalOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const searchOrders = async (query: string) => {
    try {
      setLoading(true);
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
        Alert.alert("Vui lòng đăng nhập", "Bạn cần đăng nhập để tra cứu đơn hàng!", [
          { text: "OK", onPress: () => router.push("/login") },
        ]);
        return;
      }

      const rawOrders = await apiFetch(
        `${API_BASE_URL}/orders/${userId}/search?query=${encodeURIComponent(query)}`,
        'SearchOrders'
      );

      if (!Array.isArray(rawOrders)) {
        console.error("API did not return an array:", rawOrders);
        setOrders([]);
        return;
      }

      const mappedOrders = rawOrders.map((rawOrder: any) => ({
        id: rawOrder.maDonHang.toString(),
        date: rawOrder.ngayDat,
        status: mapStatus(rawOrder.trangThaiDonHang),
        total: rawOrder.tongTien,
        tongTien: rawOrder.tongTien,
        items: rawOrder.items.map((item: any) => ({
          id: item.maChiTietDh,
          name: item.tenSanPham,
          quantity: item.soLuong,
          price: item.gia,
          image: item.hinhAnh
            ? item.hinhAnh.startsWith("http")
              ? item.hinhAnh
              : `${API_BASE_URL}${item.hinhAnh}`
            : "https://tronhouse.com/assets/data/editor/source/meo-chup-anh-san-pham-quan-ao-de-kinh-doanh-online-hieu-qua/chup-anh-quan-ao-2.jpg",
        })),
        tenNguoiNhan: rawOrder.tenNguoiNhan,
        hinhThucThanhToan: rawOrder.hinhThucThanhToan,
        sdt: rawOrder.sdt,
        lyDoHuy: rawOrder.lyDoHuy,
      }));

      setOrders(mappedOrders);
    } catch (error: any) {
      console.error("Error searching orders:", error);
      Alert.alert("Lỗi", error.message || "Đã xảy ra lỗi khi tra cứu đơn hàng!");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrdersByUserId();
  }, []);

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      Alert.alert("Thông báo", "Vui lòng nhập mã đơn hàng để tìm kiếm!");
      return;
    }
    searchOrders(searchQuery);
  };

  const handleResetSearch = () => {
    setSearchQuery("");
    setOrders(originalOrders);
  };

  const filteredOrders = filterStatus === "all"
    ? orders
    : orders.filter(order => order.status === filterStatus);

  const handleCancelClick = (orderId: string) => {
    setCancelOrderId(orderId);
    setCancelReason("");
    setShowCancelModal(true);
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      Alert.alert("Thông báo", "Vui lòng nhập lý do hủy!");
      return;
    }
    if (cancelOrderId === null) return;

    try {
      const orderIdNumber = parseInt(cancelOrderId);
      await apiFetch(
        `${API_BASE_URL}/orders/cancel/${orderIdNumber}`,
        'CancelOrder',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cancelReason),
        }
      );
      Alert.alert("Thành công", "Hủy đơn hàng thành công!");
      setShowCancelModal(false);
      setCancelReason("");
      setCancelOrderId(null);
      fetchOrdersByUserId();
    } catch (error: any) {
      console.error("Error canceling order:", error);
      Alert.alert("Lỗi", error.message || "Có lỗi xảy ra khi hủy đơn hàng.");
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View style={[styles.header, { backgroundColor: themeColors.card, borderBottomColor: themeColors.border }]}>
        <View style={styles.maxWidth}>
          <View style={styles.titleContainer}>
            <Text style={[styles.title, { color: themeColors.textPrimary } as TextStyle]}>Lịch sử đơn hàng</Text>
            <Text style={[styles.subtitle, { color: themeColors.textSecondary } as TextStyle]}>
              Xem và quản lý các đơn hàng của bạn
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.content}>
        <View style={[styles.filterContainer, { backgroundColor: themeColors.card }]}>
          <View style={styles.filterRow}>
            <Text style={[styles.filterLabel, { color: themeColors.textPrimary } as TextStyle]}>Đơn hàng của bạn</Text>
            <View style={[styles.pickerContainer, { borderColor: themeColors.border }]}>
              <Picker
                selectedValue={filterStatus}
                onValueChange={(itemValue) => setFilterStatus(itemValue)}
                style={styles.picker}
              >
                <Picker.Item label="Tất cả trạng thái" value="all" />
                <Picker.Item label="Chờ xác nhận" value="pending" />
                <Picker.Item label="Đang xử lý" value="processing" />
                <Picker.Item label="Đang giao hàng" value="shipping" />
                <Picker.Item label="Đã hoàn thành" value="completed" />
                <Picker.Item label="Đã hủy" value="canceled" />
              </Picker>
            </View>
          </View>

          <View style={styles.searchContainer}>
            <Text style={[styles.searchLabel, { color: themeColors.textPrimary } as TextStyle]}>Tra cứu đơn hàng</Text>
            <View style={styles.searchRow}>
              <View style={[styles.searchInputContainer, { borderColor: themeColors.border }]}>
                <TextInput
                  style={[styles.searchInput, { color: themeColors.textPrimary } as TextStyle]}
                  placeholder="Nhập mã đơn hàng của bạn"
                  placeholderTextColor={themeColors.textSecondary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  onSubmitEditing={handleSearch}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity style={styles.clearSearchButton} onPress={handleResetSearch}>
                    <X color={themeColors.textSecondary} size={20} />
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity
                style={[styles.searchButton, { backgroundColor: themeColors.primary }]}
                onPress={handleSearch}
              >
                <View style={styles.searchButtonContent}>
                  <Eye color={themeColors.textOnPrimary} size={20} style={styles.searchIcon} />
                  <Text style={[styles.searchButtonText, { color: themeColors.textOnPrimary } as TextStyle]}>
                    Kiểm tra
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={themeColors.primary} style={styles.loading} />
        ) : filteredOrders.length > 0 ? (
          <FlatList
            data={filteredOrders}
            renderItem={({ item }) => <OrderItem order={item} onCancel={handleCancelClick} />}
            keyExtractor={(item) => item.id}
          />
        ) : (
          <View style={[styles.emptyContainer, { borderColor: themeColors.border }]}>
            <ClipboardList color={themeColors.textSecondary} size={48} style={styles.emptyIcon} />
            <Text style={[styles.emptyText, { color: themeColors.textPrimary } as TextStyle]}>
              Không có đơn hàng nào
            </Text>
            <Text style={[styles.emptySubText, { color: themeColors.textSecondary } as TextStyle]}>
              Bạn chưa có đơn hàng nào trong trạng thái này
            </Text>
          </View>
        )}
      </View>

      <Modal visible={showCancelModal} animationType="slide">
        <View style={[styles.modalContainer, { backgroundColor: themeColors.background }]}>
          <Text style={[styles.modalTitle, { color: themeColors.textPrimary } as TextStyle]}>
            Nhập lý do hủy đơn hàng
          </Text>
          <TextInput
            style={[styles.modalInput, { borderColor: themeColors.border, color: themeColors.textPrimary } as TextStyle]}
            placeholder="Lý do hủy"
            placeholderTextColor={themeColors.textSecondary}
            value={cancelReason}
            onChangeText={setCancelReason}
          />
          <Text style={[styles.modalLabel, { color: themeColors.textSecondary } as TextStyle]}>Chọn lý do gợi ý:</Text>
          <View style={styles.modalSuggestions}>
            {cancelReasonsSuggestions.map((reason, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.modalSuggestionButton,
                  { borderColor: themeColors.border },
                  cancelReason === reason && { backgroundColor: themeColors.card },
                ]}
                onPress={() => setCancelReason(reason)}
              >
                <Text style={[styles.modalSuggestionText, { color: themeColors.textPrimary } as TextStyle]}>
                  {reason}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalCloseButton, { borderColor: themeColors.border }]}
              onPress={() => setShowCancelModal(false)}
            >
              <Text style={[styles.modalCloseText, { color: themeColors.textPrimary } as TextStyle]}>Đóng</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalConfirmButton, { backgroundColor: themeColors.error }]}
              onPress={handleCancel}
            >
              <Text style={[styles.modalConfirmText, { color: themeColors.textOnPrimary } as TextStyle]}>
                Xác nhận hủy
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  maxWidth: { maxWidth: 960, marginHorizontal: 'auto' },
  titleContainer: { alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 28, fontWeight: 'bold' },
  subtitle: { fontSize: 16, marginTop: 4 },
  content: { flex: 1, paddingHorizontal: 16, paddingVertical: 12 },
  filterContainer: {
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  filterLabel: { fontSize: 18, fontWeight: '600' },
  pickerContainer: { width: 200, borderWidth: 1, borderRadius: 4 },
  picker: { height: 50, width: '100%' },
  searchContainer: { marginBottom: 16 },
  searchLabel: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
  searchRow: { flexDirection: 'row', gap: 16 },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
  },
  searchInput: { flex: 1, padding: 8, fontSize: 16 },
  clearSearchButton: { padding: 4 },
  searchButton: { borderRadius: 4, padding: 10 },
  searchButtonContent: { flexDirection: 'row', alignItems: 'center' },
  searchIcon: { marginRight: 8 },
  searchButtonText: { fontSize: 16, fontWeight: '500' },
  orderItemContainer: { borderWidth: 1, borderRadius: 8, overflow: 'hidden', marginBottom: 16 },
  orderItemHeader: { padding: 16, flexDirection: 'row', justifyContent: 'space-between' },
  orderDetails: { flex: 1, gap: 4 },
  orderId: { fontSize: 16, fontWeight: '600' },
  orderInfo: { fontSize: 14 },
  statusContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  statusLabelContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statusLabel: { fontSize: 14, fontWeight: '500' },
  orderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  orderTotal: { alignItems: 'flex-end' },
  orderTotalText: { fontSize: 16, fontWeight: '600' },
  orderItemsCount: { fontSize: 14 },
  orderActions: { flexDirection: 'row', gap: 8 },
  actionButton: { borderWidth: 1, borderRadius: 4, paddingVertical: 6, paddingHorizontal: 12 },
  actionButtonContent: { flexDirection: 'row', alignItems: 'center' },
  actionText: { fontSize: 14 },
  cancelButton: {},
  cancelButtonText: { fontSize: 14 },
  orderDetailsExpanded: { padding: 16, borderTopWidth: 1 },
  orderItems: { gap: 16 },
  orderItem: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  orderItemImageContainer: {
    height: 64,
    width: 64,
    borderRadius: 4,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderItemImage: { height: '100%', width: '100%', objectFit: 'cover' },
  orderItemInfo: { flex: 1 },
  orderItemName: { fontSize: 16, fontWeight: '500' },
  orderItemQuantity: { fontSize: 14 },
  orderItemTotal: { fontSize: 16, fontWeight: '600' },
  orderSummary: { marginTop: 16, paddingTop: 16, borderTopWidth: 1 },
  orderSummaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  orderSummaryLabel: { fontSize: 16 },
  orderSummaryValue: { fontSize: 16, fontWeight: '600' },
  orderSummaryTotal: { fontSize: 18, fontWeight: 'bold' },
  loading: { marginTop: 20 },
  emptyContainer: { alignItems: 'center', paddingVertical: 48, borderWidth: 1, borderRadius: 8 },
  emptyIcon: { marginBottom: 16 },
  emptyText: { fontSize: 18, fontWeight: '600' },
  emptySubText: { fontSize: 14 },
  modalContainer: { flex: 1, padding: 16 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  modalInput: { borderWidth: 1, borderRadius: 4, padding: 8, fontSize: 16, marginBottom: 16 },
  modalLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  modalSuggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  modalSuggestionButton: { borderWidth: 1, borderRadius: 4, paddingVertical: 6, paddingHorizontal: 12 },
  modalSuggestionText: { fontSize: 14 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  modalCloseButton: { borderWidth: 1, borderRadius: 4, paddingVertical: 8, paddingHorizontal: 16 },
  modalCloseText: { fontSize: 16 },
  modalConfirmButton: { borderRadius: 4, paddingVertical: 8, paddingHorizontal: 16 },
  modalConfirmText: { fontSize: 16 },
});

export default OrderHistory;
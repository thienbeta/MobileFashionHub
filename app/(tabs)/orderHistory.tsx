import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  TextInput,
  FlatList,
  ScrollView,
  RefreshControl,
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

const API_BASE_URL = "https://ce5e722365ab.ngrok-free.app/api";

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
  paymentStatusText?: string;
}

interface PaginationInfo {
  currentPage: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface OrderItemProps {
  order: Order;
  onCancel: (orderId: string) => void;
}

interface Notification {
  message: string;
  type: "success" | "error";
  duration?: number;
}

// Notification Component
const NotificationComponent = ({
  notification,
  onClose,
}: {
  notification: Notification | null;
  onClose: () => void;
}) => {
  useEffect(() => {
    if (notification) {
      const duration = notification.duration || (notification.type === 'success' ? 3000 : 5000);
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [notification, onClose]);

  const { theme } = useTheme();
  const isDarkMode = theme === 'dark' || (theme === 'system' && Appearance.getColorScheme() === 'dark');
  const themeColors = isDarkMode ? colors.dark : colors.light;

  if (!notification) return null;

  return (
    <View
      style={[
        styles.notificationContainer,
        {
          backgroundColor: notification.type === 'success' ? themeColors.success : themeColors.error,
          borderColor: notification.type === 'success' ? themeColors.success : themeColors.error,
        },
      ]}
    >
      <Text style={[styles.notificationText, { color: themeColors.textOnPrimary } as TextStyle]}>
        {notification.message}
      </Text>
      <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
        <X color={themeColors.textOnPrimary} size={16} />
      </TouchableOpacity>
    </View>
  );
};

// OrderTrackingTimeline Component
const OrderTrackingTimeline = ({ order }: { order: Order }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark' || (theme === 'system' && Appearance.getColorScheme() === 'dark');
  const themeColors = isDarkMode ? colors.dark : colors.light;
  const router = useRouter();

  const checkToken = async () => {
    const fileUri = FileSystem.documentDirectory + 'user.json';
    const fileInfo = await FileSystem.getInfoAsync(fileUri);
    if (!fileInfo.exists) {
      return false;
    }
    const fileContent = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.UTF8 });
    const userData = JSON.parse(fileContent);
    return !!userData?.token;
  };

  const handleExpand = async () => {
    const isTokenValid = await checkToken();
    if (!isTokenValid) {
      setNotification({ message: 'Phiên đăng nhập hết hạn, vui lòng đăng nhập lại', type: 'error' });
      setTimeout(() => router.push('/(auth)/login'), 2000);
      return;
    }
    setIsExpanded(!isExpanded);
  };

  const trackingSteps = [
    {
      status: 'pending',
      label: 'Chưa xác nhận',
      bgColor: '#f3f4f6',
      textColor: '#1f2937',
      dotColor: '#6b7280',
      borderColor: '#d1d5db',
      description: 'Đơn hàng đã được tạo và đang chờ xác nhận',
    },
    {
      status: 'processing',
      label: 'Đang chuẩn bị hàng',
      bgColor: '#fef3c7',
      textColor: '#713f12',
      dotColor: '#f59e0b',
      borderColor: '#fde68a',
      description: 'Đơn hàng đã được xác nhận và đang chuẩn bị',
    },
    {
      status: 'shipping',
      label: 'Đang giao hàng',
      bgColor: '#dbeafe',
      textColor: '#1e40af',
      dotColor: '#3b82f6',
      borderColor: '#93c5fd',
      description: 'Đơn hàng đang được vận chuyển đến bạn',
    },
    {
      status: 'completed',
      label: 'Đã giao hàng',
      bgColor: '#d1fae5',
      textColor: '#065f46',
      dotColor: '#10b981',
      borderColor: '#6ee7b7',
      description: 'Đơn hàng đã được giao thành công',
    },
    {
      status: 'canceled',
      label: 'Đã hủy',
      bgColor: '#fee2e2',
      textColor: '#991b1b',
      dotColor: '#ef4444',
      borderColor: '#fca5a5',
      description: 'Đơn hàng đã bị hủy',
    },
  ];

  const getStepState = (stepStatus: string, index: number) => {
    if (order.status === 'canceled') {
      return stepStatus === 'canceled' ? 'active' : 'inactive';
    }
    const currentIndex = trackingSteps.findIndex(step => step.status === order.status);
    if (index <= currentIndex) {
      return stepStatus === order.status ? 'active' : 'completed';
    }
    return 'inactive';
  };

  const visibleSteps = order.status === 'canceled' ? [trackingSteps[4]] : trackingSteps.slice(0, 4);
  const currentStep = trackingSteps.find(step => step.status === order.status) || trackingSteps[0];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);
  };

  return (
    <View style={[styles.trackingContainer, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
      <TouchableOpacity
        style={styles.trackingHeader}
        onPress={handleExpand}
        activeOpacity={0.7}
      >
        <View style={styles.trackingTitleContainer}>
          <View style={[styles.trackingStatusBadge, { backgroundColor: currentStep.bgColor, borderColor: currentStep.borderColor }]}>
            <View style={[styles.trackingStatusDot, { backgroundColor: currentStep.dotColor }]} />
            <Text style={[styles.trackingStatusLabel, { color: currentStep.textColor } as TextStyle]}>
              {currentStep.label}
            </Text>
          </View>
          <Text style={[styles.trackingOrderId, { color: themeColors.textPrimary } as TextStyle]}>
            Đơn hàng #{order.id}
          </Text>
          <Text style={[styles.trackingOrderInfo, { color: themeColors.textSecondary } as TextStyle]}>
            {order.date} • {order.tenNguoiNhan}
          </Text>
        </View>
        <View style={styles.trackingRight}>
          <Text style={[styles.trackingTotal, { color: themeColors.primary } as TextStyle]}>
            {formatCurrency(order.tongTien || 0)}
          </Text>
          {isExpanded ? (
            <ChevronUp color={themeColors.textPrimary} size={16} />
          ) : (
            <ChevronDown color={themeColors.textPrimary} size={16} />
          )}
        </View>
      </TouchableOpacity>

      {isExpanded && (
        <View style={[styles.trackingDetails, { borderTopColor: themeColors.border }]}>
          <Text style={[styles.trackingSectionTitle, { color: themeColors.textPrimary } as TextStyle]}>
            Trạng thái vận chuyển
          </Text>
          <View style={styles.trackingTimeline}>
            <View style={[styles.trackingProgressLine, { backgroundColor: themeColors.border }]} />
            <View
              style={[
                styles.trackingProgressLine,
                {
                  backgroundColor: '#3b82f6',
                  width: `${Math.max(0, Math.min(100, ((trackingSteps.findIndex(step => step.status === order.status) + 1) / visibleSteps.length) * 100))}%`,
                },
              ]}
            />
            <View style={styles.trackingSteps}>
              {visibleSteps.map((step, index) => {
                const stepState = getStepState(step.status, index);
                const isActive = stepState === 'active';
                const isCompleted = stepState === 'completed';
                const isInactive = stepState === 'inactive';

                return (
                  <View key={step.status} style={styles.trackingStep}>
                    <View
                      style={[
                        styles.trackingStepDot,
                        {
                          backgroundColor: isActive ? step.dotColor : isCompleted ? '#3b82f6' : '#d1d5db',
                          borderColor: isActive ? step.borderColor : isCompleted ? '#3b82f6' : '#d1d5db',
                        },
                      ]}
                    >
                      {isActive && <View style={[styles.trackingStepDotInner, { backgroundColor: step.dotColor }]} />}
                      {isCompleted && <CheckCircle color="#ffffff" size={12} />}
                      {isInactive && <View style={styles.trackingStepDotInner} />}
                    </View>
                    <Text style={[styles.trackingStepLabel, { color: isActive ? step.textColor : isCompleted ? '#3b82f6' : themeColors.textSecondary } as TextStyle]}>
                      {step.label}
                    </Text>
                    {isActive && (
                      <Text style={[styles.trackingStepDescription, { color: themeColors.textSecondary } as TextStyle]}>
                        {step.description}
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          </View>

          <View style={[styles.trackingInfo, { backgroundColor: themeColors.background, borderColor: themeColors.border }]}>
            <Text style={[styles.trackingInfoTitle, { color: themeColors.textPrimary } as TextStyle]}>
              Thông tin đơn hàng
            </Text>
            <View style={styles.trackingInfoRow}>
              <Text style={[styles.trackingInfoLabel, { color: themeColors.textSecondary } as TextStyle]}>
                Người nhận:
              </Text>
              <Text style={[styles.trackingInfoValue, { color: themeColors.textPrimary } as TextStyle]}>
                {order.tenNguoiNhan || 'N/A'}
              </Text>
            </View>
            <View style={styles.trackingInfoRow}>
              <Text style={[styles.trackingInfoLabel, { color: themeColors.textSecondary } as TextStyle]}>
                Thanh toán:
              </Text>
              <Text style={[styles.trackingInfoValue, { color: themeColors.textPrimary } as TextStyle]}>
                {order.hinhThucThanhToan || 'COD'}
              </Text>
            </View>
            <View style={styles.trackingInfoRow}>
              <Text style={[styles.trackingInfoLabel, { color: themeColors.textSecondary } as TextStyle]}>
                Trạng thái:
              </Text>
              <Text style={[styles.trackingInfoValue, { color: order.paymentStatusText === 'Đã thanh toán' ? themeColors.success : themeColors.error } as TextStyle]}>
                {order.paymentStatusText || (order.hinhThucThanhToan === 'VNPay' ? 'Đã thanh toán' : order.status === 'completed' ? 'Đã thanh toán' : 'Chưa thanh toán')}
              </Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

// OrderItem Component
const OrderItem = ({ order, onCancel }: OrderItemProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const statusInfo = orderStatuses[order.status] || orderStatuses.pending;
  const StatusIcon = statusInfo.icon;
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark' || (theme === 'system' && Appearance.getColorScheme() === 'dark');
  const themeColors = isDarkMode ? colors.dark : colors.light;
  const router = useRouter();

  const checkToken = async () => {
    const fileUri = FileSystem.documentDirectory + 'user.json';
    const fileInfo = await FileSystem.getInfoAsync(fileUri);
    if (!fileInfo.exists) {
      return false;
    }
    const fileContent = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.UTF8 });
    const userData = JSON.parse(fileContent);
    return !!userData?.token;
  };

  const handleExpand = async () => {
    const isTokenValid = await checkToken();
    if (!isTokenValid) {
      setNotification({ message: 'Phiên đăng nhập hết hạn, vui lòng đăng nhập lại', type: 'error' });
      setTimeout(() => router.push('/(auth)/login'), 2000);
      return;
    }
    setIsExpanded(!isExpanded);
  };

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
            <StatusIcon color={statusInfo.color} size={14} />
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
            onPress={handleExpand}
            activeOpacity={0.7}
          >
            <View style={styles.actionButtonContent}>
              {isExpanded ? (
                <>
                  <ChevronUp color={themeColors.textPrimary} size={14} />
                  <Text style={[styles.actionText, { color: themeColors.textPrimary } as TextStyle]}>Thu gọn</Text>
                </>
              ) : (
                <>
                  <ChevronDown color={themeColors.textPrimary} size={14} />
                  <Text style={[styles.actionText, { color: themeColors.textPrimary } as TextStyle]}>Chi tiết</Text>
                </>
              )}
            </View>
          </TouchableOpacity>
          {(order.status === "pending" || order.status === "processing") && (
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton, { borderColor: themeColors.error }]}
              onPress={() => onCancel(order.id)}
              activeOpacity={0.7}
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
                    source={{ uri: item.image.startsWith('data:image') ? item.image : `data:image/jpeg;base64,${item.image}` }}
                    style={styles.orderItemImage}
                    resizeMode="contain"
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

// OrderHistory Component
const OrderHistory = () => {
  const router = useRouter();
  const [filterStatus, setFilterStatus] = useState("all");
  const [orders, setOrders] = useState<Order[]>([]);
  const [originalOrders, setOriginalOrders] = useState<Order[]>([]);
  const [trackingOrders, setTrackingOrders] = useState<Order[]>([]);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [trackingSearch, setTrackingSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [allOrdersPagination, setAllOrdersPagination] = useState<PaginationInfo>({
    currentPage: 1,
    pageSize: 10,
    totalRecords: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark' || (theme === 'system' && Appearance.getColorScheme() === 'dark');
  const themeColors = isDarkMode ? colors.dark : colors.light;

  const cancelReasonsSuggestions = [
    "Đổi ý không muốn mua nữa",
    "Tìm được giá rẻ hơn ở nơi khác",
    "Đặt nhầm sản phẩm",
    "Thay đổi địa chỉ giao hàng",
    "Cần gấp nhưng giao hàng chậm",
    "Lý do khác",
  ];

  const mapStatus = (status: number): OrderStatus => {
    const statusMap = {
      0: "pending",
      1: "processing",
      2: "shipping",
      3: "completed",
      4: "canceled",
    };
    return (statusMap[status as keyof typeof statusMap] || "pending") as OrderStatus;
  };

  const fetchOrdersByUserId = async (page: number = 1, isRefresh: boolean = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const fileUri = FileSystem.documentDirectory + 'user.json';
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (!fileInfo.exists) {
        setNotification({ message: 'Vui lòng đăng nhập để xem lịch sử đơn hàng', type: 'error' });
        router.push('/(auth)/login');
        return;
      }

      const fileContent = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.UTF8 });
      const userData = JSON.parse(fileContent);
      const userId = userData?.user?.maNguoiDung;
      const token = userData?.token;

      if (!userId || !token) {
        setNotification({ message: 'Vui lòng đăng nhập để xem lịch sử đơn hàng', type: 'error' });
        router.push('/(auth)/login');
        return;
      }

      const rawOrders = await apiFetch(`${API_BASE_URL}/user/orders/${userId}`, 'Orders', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!Array.isArray(rawOrders)) {
        setNotification({ message: 'Dữ liệu đơn hàng không hợp lệ', type: 'error' });
        setOrders([]);
        setOriginalOrders([]);
        setTrackingOrders([]);
        return;
      }

      const mappedOrders = rawOrders.map((rawOrder: any) => {
        let formattedDate = "";
        if (rawOrder.ngayDat && typeof rawOrder.ngayDat === "string") {
          const date = new Date(rawOrder.ngayDat);
          formattedDate = date.toLocaleDateString('vi-VN');
        }

        return {
          id: rawOrder.maDonHang.toString(),
          date: formattedDate,
          status: mapStatus(rawOrder.trangThaiDonHang),
          total: rawOrder.tongTien,
          tongTien: rawOrder.thongTinDonHang?.thanhTienCuoiCung || rawOrder.tongTien,
          items: rawOrder.sanPhams.map((item: any) => ({
            id: item.maChiTietDh,
            name: item.tenSanPham,
            quantity: item.soLuong,
            price: item.gia,
            image: item.hinhAnh || "https://tronhouse.com/assets/data/editor/source/meo-chup-anh-san-pham-quan-ao-de-kinh-doanh-online-hieu-qua/chup-anh-quan-ao-2.jpg",
          })),
          tenNguoiNhan: rawOrder.tenNguoiNhan,
          hinhThucThanhToan: rawOrder.hinhThucThanhToan,
          sdt: rawOrder.thongTinNguoiDung?.sdt,
          lyDoHuy: rawOrder.lyDoHuy,
          paymentStatusText: rawOrder.paymentStatusText || (rawOrder.hinhThucThanhToan === 'VNPay' ? 'Đã thanh toán' : rawOrder.trangThaiDonHang === 3 ? 'Đã thanh toán' : 'Chưa thanh toán'),
        };
      });

      const pageSize = 10;
      const totalRecords = mappedOrders.length;
      const totalPages = Math.ceil(totalRecords / pageSize);
      const startIndex = (page - 1) * pageSize;
      const paginatedOrders = mappedOrders.slice(startIndex, startIndex + pageSize);

      setOrders(paginatedOrders);
      setOriginalOrders(mappedOrders);
      setTrackingOrders(mappedOrders);
      setAllOrdersPagination({
        currentPage: page,
        pageSize,
        totalRecords,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      });
    } catch (error: any) {
      console.error("Error fetching orders:", error);
      setNotification({ message: error.message || 'Đã xảy ra lỗi khi tải lịch sử đơn hàng', type: 'error' });
      setOrders([]);
      setOriginalOrders([]);
      setTrackingOrders([]);
    } finally {
      if (isRefresh) setRefreshing(false);
      else setLoading(false);
    }
  };

  const searchOrders = async (query: string, page: number = 1, isRefresh: boolean = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const fileUri = FileSystem.documentDirectory + 'user.json';
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (!fileInfo.exists) {
        setNotification({ message: 'Vui lòng đăng nhập để tra cứu đơn hàng', type: 'error' });
        router.push('/(auth)/login');
        return;
      }

      const fileContent = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.UTF8 });
      const userData = JSON.parse(fileContent);
      const userId = userData?.user?.maNguoiDung;
      const token = userData?.token;

      if (!userId || !token) {
        setNotification({ message: 'Vui lòng đăng nhập để tra cứu đơn hàng', type: 'error' });
        router.push('/(auth)/login');
        return;
      }

      if (!query.trim()) {
        await fetchOrdersByUserId(1, isRefresh);
        return;
      }

      const rawOrders = await apiFetch(`${API_BASE_URL}/user/orders/search?maDonHang=${encodeURIComponent(query)}&tenNguoiNhan=${encodeURIComponent(query)}`, 'SearchOrders', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!Array.isArray(rawOrders)) {
        setNotification({ message: 'Dữ liệu đơn hàng không hợp lệ', type: 'error' });
        setOrders([]);
        return;
      }

      const mappedOrders = rawOrders.map((rawOrder: any) => ({
        id: rawOrder.maDonHang.toString(),
        date: rawOrder.ngayDat ? new Date(rawOrder.ngayDat).toLocaleDateString('vi-VN') : 'N/A',
        status: mapStatus(rawOrder.trangThaiDonHang),
        total: rawOrder.tongTien,
        tongTien: rawOrder.thongTinDonHang?.thanhTienCuoiCung || rawOrder.tongTien,
        items: rawOrder.sanPhams.map((item: any) => ({
          id: item.maChiTietDh,
          name: item.tenSanPham,
          quantity: item.soLuong,
          price: item.gia,
          image: item.hinhAnh || "https://tronhouse.com/assets/data/editor/source/meo-chup-anh-san-pham-quan-ao-de-kinh-doanh-online-hieu-qua/chup-anh-quan-ao-2.jpg",
        })),
        tenNguoiNhan: rawOrder.tenNguoiNhan,
        hinhThucThanhToan: rawOrder.hinhThucThanhToan,
        sdt: rawOrder.thongTinNguoiDung?.sdt,
        lyDoHuy: rawOrder.lyDoHuy,
        paymentStatusText: rawOrder.paymentStatusText || (rawOrder.hinhThucThanhToan === 'VNPay' ? 'Đã thanh toán' : rawOrder.trangThaiDonHang === 3 ? 'Đã thanh toán' : 'Chưa thanh toán'),
      }));

      const pageSize = 10;
      const totalRecords = mappedOrders.length;
      const totalPages = Math.ceil(totalRecords / pageSize);
      const startIndex = (page - 1) * pageSize;
      const paginatedOrders = mappedOrders.slice(startIndex, startIndex + pageSize);

      setOrders(paginatedOrders);
      setAllOrdersPagination({
        currentPage: page,
        pageSize,
        totalRecords,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      });
    } catch (error: any) {
      console.error("Error searching orders:", error);
      setNotification({ message: error.message || 'Đã xảy ra lỗi khi tra cứu đơn hàng', type: 'error' });
      setOrders([]);
    } finally {
      if (isRefresh) setRefreshing(false);
      else setLoading(false);
    }
  };

  const searchTrackingOrders = async (query: string, isRefresh: boolean = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const fileUri = FileSystem.documentDirectory + 'user.json';
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (!fileInfo.exists) {
        setNotification({ message: 'Vui lòng đăng nhập để tra cứu đơn hàng', type: 'error' });
        router.push('/(auth)/login');
        return;
      }

      const fileContent = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.UTF8 });
      const userData = JSON.parse(fileContent);
      const userId = userData?.user?.maNguoiDung;
      const token = userData?.token;

      if (!userId || !token) {
        setNotification({ message: 'Vui lòng đăng nhập để tra cứu đơn hàng', type: 'error' });
        router.push('/(auth)/login');
        return;
      }

      if (!query.trim()) {
        setTrackingOrders(originalOrders);
        return;
      }

      const rawOrders = await apiFetch(`${API_BASE_URL}/user/orders/search?maDonHang=${encodeURIComponent(query)}&tenNguoiNhan=${encodeURIComponent(query)}`, 'SearchOrders', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!Array.isArray(rawOrders)) {
        setNotification({ message: 'Dữ liệu đơn hàng không hợp lệ', type: 'error' });
        setTrackingOrders([]);
        return;
      }

      const mappedOrders = rawOrders.map((rawOrder: any) => ({
        id: rawOrder.maDonHang.toString(),
        date: rawOrder.ngayDat ? new Date(rawOrder.ngayDat).toLocaleDateString('vi-VN') : 'N/A',
        status: mapStatus(rawOrder.trangThaiDonHang),
        total: rawOrder.tongTien,
        tongTien: rawOrder.thongTinDonHang?.thanhTienCuoiCung || rawOrder.tongTien,
        items: rawOrder.sanPhams.map((item: any) => ({
          id: item.maChiTietDh,
          name: item.tenSanPham,
          quantity: item.soLuong,
          price: item.gia,
          image: item.hinhAnh || "https://tronhouse.com/assets/data/editor/source/meo-chup-anh-san-pham-quan-ao-de-kinh-doanh-online-hieu-qua/chup-anh-quan-ao-2.jpg",
        })),
        tenNguoiNhan: rawOrder.tenNguoiNhan,
        hinhThucThanhToan: rawOrder.hinhThucThanhToan,
        sdt: rawOrder.thongTinNguoiDung?.sdt,
        lyDoHuy: rawOrder.lyDoHuy,
        paymentStatusText: rawOrder.paymentStatusText || (rawOrder.hinhThucThanhToan === 'VNPay' ? 'Đã thanh toán' : rawOrder.trangThaiDonHang === 3 ? 'Đã thanh toán' : 'Chưa thanh toán'),
      }));

      setTrackingOrders(mappedOrders);
    } catch (error: any) {
      console.error("Error searching tracking orders:", error);
      setNotification({ message: error.message || 'Đã xảy ra lỗi khi tra cứu đơn hàng', type: 'error' });
      setTrackingOrders([]);
    } finally {
      if (isRefresh) setRefreshing(false);
      else setLoading(false);
    }
  };

  const handleCancelClick = (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) {
      setNotification({ message: 'Đơn hàng không tồn tại', type: 'error' });
      return;
    }
    if (order.status !== 'pending' && order.status !== 'processing') {
      setNotification({ message: 'Chỉ có thể hủy đơn hàng khi chưa xác nhận hoặc đang xử lý', type: 'error' });
      return;
    }
    setCancelOrderId(orderId);
    setCancelReason("");
    setShowCancelModal(true);
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      setNotification({ message: 'Vui lòng nhập lý do hủy', type: 'error' });
      return;
    }
    if (cancelOrderId === null) return;

    try {
      setLoading(true);
      const fileUri = FileSystem.documentDirectory + 'user.json';
      const fileContent = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.UTF8 });
      const userData = JSON.parse(fileContent);
      const token = userData?.token;

      if (!token) {
        setNotification({ message: 'Vui lòng đăng nhập để hủy đơn hàng', type: 'error' });
        router.push('/(auth)/login');
        return;
      }

      const orderIdNumber = parseInt(cancelOrderId);
      const response = await apiFetch(`${API_BASE_URL}/user/orders/cancel/${orderIdNumber}`, 'CancelOrder', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ lyDoHuy: cancelReason }),
      });

      setShowCancelModal(false);
      setCancelReason("");
      setCancelOrderId(null);

      if (response.isAccountLocked) {
        setNotification({ message: response.lockoutMessage || 'Tài khoản của bạn đã bị khóa do hủy đơn hàng quá nhiều lần', type: 'error' });
        setTimeout(() => {
          FileSystem.deleteAsync(fileUri);
          router.push('/(auth)/login');
        }, 3000);
      } else {
        setNotification({ message: response.message || 'Hủy đơn hàng thành công', type: 'success' });
        await fetchOrdersByUserId();
      }
    } catch (error: any) {
      console.error("Error canceling order:", error);
      setNotification({ message: error.message || 'Có lỗi xảy ra khi hủy đơn hàng', type: 'error' });
      setShowCancelModal(false);
      setCancelReason("");
      setCancelOrderId(null);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= allOrdersPagination.totalPages) {
      if (searchQuery.trim()) {
        searchOrders(searchQuery, page);
      } else {
        fetchOrdersByUserId(page);
      }
    }
  };

  const onRefresh = async () => {
    if (activeTab === 'tracking') {
      await searchTrackingOrders(trackingSearch, true);
    } else if (searchQuery.trim()) {
      await searchOrders(searchQuery, 1, true);
    } else {
      await fetchOrdersByUserId(1, true);
    }
  };

  useEffect(() => {
    fetchOrdersByUserId();
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (activeTab === 'tracking') {
        searchTrackingOrders(trackingSearch);
      } else {
        searchOrders(searchQuery);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, trackingSearch, activeTab]);

  const getOrderCountByStatus = (status: OrderStatus | "all") => {
    if (status === "all") return originalOrders.length;
    return originalOrders.filter(order => order.status === status).length;
  };

  const renderTabContent = (tab: string) => {
    const filteredOrders = tab === 'tracking' ? trackingOrders : filterStatus === 'all' ? orders : orders.filter(order => order.status === filterStatus);

    if (filteredOrders.length === 0) {
      return (
        <View style={[styles.emptyContainer, { borderColor: themeColors.border }]}>
          <ClipboardList color={themeColors.textSecondary} size={40} style={styles.emptyIcon} />
          <Text style={[styles.emptyText, { color: themeColors.textPrimary } as TextStyle]}>
            Không có đơn hàng nào
          </Text>
          <Text style={[styles.emptySubText, { color: themeColors.textSecondary } as TextStyle]}>
            {tab === 'tracking' && trackingSearch.trim()
              ? "Không tìm thấy đơn hàng nào phù hợp với từ khóa tìm kiếm."
              : "Bạn chưa có đơn hàng nào trong trạng thái này."}
          </Text>
        </View>
      );
    }

    return (
      <FlatList
        data={filteredOrders}
        renderItem={({ item }) => (
          tab === 'tracking' ? (
            <OrderTrackingTimeline order={item} />
          ) : (
            <OrderItem order={item} onCancel={handleCancelClick} />
          )
        )}
        keyExtractor={(item) => item.id}
        style={{ marginBottom: 12 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[themeColors.primary]}
            tintColor={themeColors.primary}
          />
        }
      />
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <NotificationComponent notification={notification} onClose={() => setNotification(null)} />
      <View style={[styles.header, { backgroundColor: themeColors.card, borderBottomColor: themeColors.border }]}>
        <View style={styles.maxWidth}>
          <View style={styles.titleContainer}>
            <Text style={[styles.title, { color: themeColors.textPrimary } as TextStyle]}>Lịch sử đơn hàng</Text>
          </View>
        </View>
      </View>

      <View style={styles.content}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabContainer}
        >
          {[
            { value: "all", label: "Tất cả", icon: ClipboardList },
            { value: "pending", label: "Chờ xác nhận", icon: ClipboardList },
            { value: "processing", label: "Đang xử lý", icon: Package },
            { value: "shipping", label: "Đang giao", icon: Truck },
            { value: "completed", label: "Hoàn thành", icon: CheckCircle },
            { value: "tracking", label: "Theo dõi", icon: Package },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.value}
              style={[
                styles.tabButton,
                activeTab === tab.value
                  ? { backgroundColor: themeColors.primary, paddingVertical: 6 }
                  : { paddingVertical: 10 },
              ]}
              onPress={() => setActiveTab(tab.value)}
              activeOpacity={0.7}
            >
              <tab.icon color={activeTab === tab.value ? themeColors.textOnPrimary : themeColors.textPrimary} size={40} />
              <Text style={[styles.tabText, { color: activeTab === tab.value ? themeColors.textOnPrimary : themeColors.textPrimary } as TextStyle]}>
                {tab.label} ({tab.value === 'tracking' ? trackingOrders.length : getOrderCountByStatus(tab.value as OrderStatus | "all")})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={[styles.filterContainer, { backgroundColor: themeColors.card }]}>
          {activeTab !== 'tracking' && (
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
          )}

          <View style={styles.searchContainer}>
            <Text style={[styles.searchLabel, { color: themeColors.textPrimary } as TextStyle]}>
              {activeTab === 'tracking' ? 'Tra cứu đơn hàng theo dõi' : 'Tra cứu đơn hàng'}
            </Text>
            <View style={styles.searchRow}>
              <View style={[styles.searchInputContainer, { borderColor: themeColors.border }]}>
                <TextInput
                  style={[styles.searchInput, { color: themeColors.textPrimary } as TextStyle]}
                  placeholder={activeTab === 'tracking' ? "Tìm kiếm theo mã đơn hoặc người nhận..." : "Tìm kiếm theo mã đơn hoặc người nhận..."}
                  placeholderTextColor={themeColors.textSecondary}
                  value={activeTab === 'tracking' ? trackingSearch : searchQuery}
                  onChangeText={activeTab === 'tracking' ? setTrackingSearch : setSearchQuery}
                  onSubmitEditing={() => activeTab === 'tracking' ? searchTrackingOrders(trackingSearch) : searchOrders(searchQuery)}
                />
                {(activeTab === 'tracking' ? trackingSearch : searchQuery).length > 0 && (
                  <TouchableOpacity
                    style={styles.clearSearchButton}
                    onPress={() => {
                      if (activeTab === 'tracking') {
                        setTrackingSearch("");
                        setTrackingOrders(originalOrders);
                      } else {
                        setSearchQuery("");
                        fetchOrdersByUserId();
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <X color={themeColors.textSecondary} size={16} />
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity
                style={[styles.searchButton, { backgroundColor: themeColors.primary }]}
                onPress={() => activeTab === 'tracking' ? searchTrackingOrders(trackingSearch) : searchOrders(searchQuery)}
                activeOpacity={0.7}
              >
                <View style={styles.searchButtonContent}>
                  <Eye color={themeColors.textOnPrimary} size={16} style={styles.searchIcon} />
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
        ) : (
          <>
            {renderTabContent(activeTab)}
            {activeTab !== 'tracking' && allOrdersPagination.totalPages > 1 && (
              <View style={styles.paginationContainer}>
                <TouchableOpacity
                  style={[styles.paginationButton, { borderColor: themeColors.border }, !allOrdersPagination.hasPreviousPage && styles.disabledButton]}
                  onPress={() => handlePageChange(allOrdersPagination.currentPage - 1)}
                  disabled={!allOrdersPagination.hasPreviousPage}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.paginationButtonText, { color: themeColors.textPrimary } as TextStyle]}>Trước</Text>
                </TouchableOpacity>
                <Text style={[styles.paginationText, { color: themeColors.textPrimary } as TextStyle]}>
                  Trang {allOrdersPagination.currentPage} / {allOrdersPagination.totalPages}
                </Text>
                <TouchableOpacity
                  style={[styles.paginationButton, { borderColor: themeColors.border }, !allOrdersPagination.hasNextPage && styles.disabledButton]}
                  onPress={() => handlePageChange(allOrdersPagination.currentPage + 1)}
                  disabled={!allOrdersPagination.hasNextPage}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.paginationButtonText, { color: themeColors.textPrimary } as TextStyle]}>Sau</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </View>

      <Modal visible={showCancelModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: themeColors.card }]}>
            <Text style={[styles.modalTitle, { color: themeColors.textPrimary } as TextStyle]}>
              Hủy đơn hàng #{cancelOrderId}
            </Text>
            <TextInput
              style={[styles.modalInput, { borderColor: themeColors.border, color: themeColors.textPrimary } as TextStyle]}
              placeholder="Lý do hủy"
              placeholderTextColor={themeColors.textSecondary}
              value={cancelReason}
              onChangeText={setCancelReason}
            />
            <Text style={[styles.modalLabel, { color: themeColors.textSecondary } as TextStyle]}>Chọn lý do gợi ý:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.modalSuggestions}>
              {cancelReasonsSuggestions.map((reason, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.modalSuggestionButton,
                    { borderColor: themeColors.border },
                    cancelReason === reason && { backgroundColor: themeColors.background },
                  ]}
                  onPress={() => setCancelReason(reason)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.modalSuggestionText, { color: themeColors.textPrimary } as TextStyle]}>
                    {reason}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalCloseButton, { borderColor: themeColors.border }]}
                onPress={() => {
                  setShowCancelModal(false);
                  setCancelReason("");
                  setCancelOrderId(null);
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.modalCloseText, { color: themeColors.textPrimary } as TextStyle]}>Đóng</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmButton, { backgroundColor: themeColors.error }]}
                onPress={handleCancel}
                activeOpacity={0.7}
              >
                <Text style={[styles.modalConfirmText, { color: themeColors.textOnPrimary } as TextStyle]}>
                  Xác nhận hủy
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  maxWidth: { width: '100%' },
  titleContainer: { alignItems: 'center', marginBottom: 6 },
  title: { fontSize: 24, fontWeight: '700' },
  subtitle: { fontSize: 14, marginTop: 4 },
  content: { flex: 1, paddingHorizontal: 12, paddingVertical: 10 },
  tabContainer: {
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    borderRadius: 6,
    marginRight: 8,
  },
  tabText: { fontSize: 12, marginLeft: 4 },
  filterContainer: {
    padding: 12,
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    marginBottom: 10,
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  filterLabel: { fontSize: 16, fontWeight: '600' },
  pickerContainer: { width: 160, borderWidth: 1, borderRadius: 4 },
  picker: { height: 40, width: '100%' },
  searchContainer: { marginBottom: 12 },
  searchLabel: { fontSize: 16, fontWeight: '600', marginBottom: 6 },
  searchRow: { flexDirection: 'row', gap: 12 },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
  },
  searchInput: { flex: 1, padding: 6, fontSize: 14 },
  clearSearchButton: { padding: 4 },
  searchButton: { borderRadius: 4, padding: 8 },
  searchButtonContent: { flexDirection: 'row', alignItems: 'center' },
  searchIcon: { marginRight: 6 },
  searchButtonText: { fontSize: 14, fontWeight: '500' },
  orderItemContainer: { borderWidth: 1, borderRadius: 6, overflow: 'hidden', marginBottom: 12 },
  orderItemHeader: { padding: 12, flexDirection: 'row', justifyContent: 'space-between' },
  orderDetails: { flex: 1, gap: 3 },
  orderId: { fontSize: 14, fontWeight: '600' },
  orderInfo: { fontSize: 12 },
  statusContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusLabelContainer: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  statusLabel: { fontSize: 12, fontWeight: '500' },
  orderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12 },
  orderTotal: { alignItems: 'flex-end' },
  orderTotalText: { fontSize: 14, fontWeight: '600' },
  orderItemsCount: { fontSize: 12 },
  orderActions: { flexDirection: 'row', gap: 6 },
  actionButton: { borderWidth: 1, borderRadius: 4, paddingVertical: 5, paddingHorizontal: 10 },
  actionButtonContent: { flexDirection: 'row', alignItems: 'center' },
  actionText: { fontSize: 12 },
  cancelButton: {},
  cancelButtonText: { fontSize: 12 },
  orderDetailsExpanded: { padding: 12, borderTopWidth: 1 },
  orderItems: { gap: 12 },
  orderItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  orderItemImageContainer: {
    height: 48,
    width: 48,
    borderRadius: 4,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderItemImage: { height: '100%', width: '100%' },
  orderItemInfo: { flex: 1 },
  orderItemName: { fontSize: 14, fontWeight: '500' },
  orderItemQuantity: { fontSize: 12 },
  orderItemTotal: { fontSize: 14, fontWeight: '600' },
  orderSummary: { marginTop: 12, paddingTop: 12, borderTopWidth: 1 },
  orderSummaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  orderSummaryLabel: { fontSize: 14 },
  orderSummaryValue: { fontSize: 14, fontWeight: '600' },
  orderSummaryTotal: { fontSize: 16, fontWeight: '700' },
  loading: { marginTop: 16 },
  emptyContainer: { alignItems: 'center', paddingVertical: 40, borderWidth: 1, borderRadius: 6 },
  emptyIcon: { marginBottom: 12 },
  emptyText: { fontSize: 16, fontWeight: '600' },
  emptySubText: { fontSize: 12, textAlign: 'center', marginTop: 4 },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  modalContainer: { width: '90%', maxWidth: 320, padding: 12, borderRadius: 8 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  modalInput: { borderWidth: 1, borderRadius: 4, padding: 8, fontSize: 14, marginBottom: 12 },
  modalLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  modalSuggestions: { flexDirection: 'row', marginBottom: 12 },
  modalSuggestionButton: { borderWidth: 1, borderRadius: 4, paddingVertical: 5, paddingHorizontal: 10, marginRight: 8 },
  modalSuggestionText: { fontSize: 12 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 6 },
  modalCloseButton: { borderWidth: 1, borderRadius: 4, paddingVertical: 6, paddingHorizontal: 12 },
  modalCloseText: { fontSize: 14 },
  modalConfirmButton: { borderRadius: 4, paddingVertical: 6, paddingHorizontal: 12 },
  modalConfirmText: { fontSize: 14 },
  notificationContainer: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 10,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 1000,
    width: '85%',
    borderWidth: 1,
  },
  notificationText: { fontSize: 12, flex: 1, marginRight: 6 },
  trackingContainer: { borderWidth: 1, borderRadius: 6, marginBottom: 12 },
  trackingHeader: { padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  trackingTitleContainer: { flex: 1 },
  trackingStatusBadge: { flexDirection: 'row', alignItems: 'center', padding: 6, borderWidth: 1, borderRadius: 4, marginBottom: 6 },
  trackingStatusDot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  trackingStatusLabel: { fontSize: 12, fontWeight: '500' },
  trackingOrderId: { fontSize: 14, fontWeight: '600' },
  trackingOrderInfo: { fontSize: 12 },
  trackingRight: { alignItems: 'flex-end', gap: 3 },
  trackingTotal: { fontSize: 14, fontWeight: '600' },
  trackingDetails: { padding: 12, borderTopWidth: 1 },
  trackingSectionTitle: { fontSize: 14, fontWeight: '600', marginBottom: 10 },
  trackingTimeline: { position: 'relative', marginVertical: 10 },
  trackingProgressLine: { position: 'absolute', top: 14, left: 0, right: 0, height: 3, borderRadius: 1.5 },
  trackingSteps: { flexDirection: 'row', justifyContent: 'space-between' },
  trackingStep: { flex: 1, alignItems: 'center' },
  trackingStepDot: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  trackingStepDotInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#d1d5db' },
  trackingStepLabel: { fontSize: 10, marginTop: 3, textAlign: 'center' },
  trackingStepDescription: { fontSize: 8, marginTop: 3, textAlign: 'center' },
  trackingInfo: { padding: 10, borderWidth: 1, borderRadius: 6, marginTop: 10 },
  trackingInfoTitle: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  trackingInfoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  trackingInfoLabel: { fontSize: 12 },
  trackingInfoValue: { fontSize: 12, fontWeight: '500' },
  paginationContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  paginationButton: { borderWidth: 1, borderRadius: 4, paddingVertical: 6, paddingHorizontal: 12 },
  paginationButtonText: { fontSize: 12 },
  paginationText: { fontSize: 12 },
  disabledButton: { opacity: 0.5 },
});

export default OrderHistory;
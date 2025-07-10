import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../../context/theme';
import { Appearance } from 'react-native';
import { ArrowLeft, Heart, ShoppingBag, Star, Trash2, Send } from 'lucide-react-native';
import { colors } from '../../style/themeColors';
import * as FileSystem from 'expo-file-system';
import { apiFetch } from '../../../src/utils/api';
import axios from 'axios';

interface NguoiDung {
  maNguoiDung: string;
  hoTen: string;
  vaiTro: string;
  hinhAnh: string | null;
}

interface ProductFromAPI {
  id: string;
  tenSanPham: string;
  maThuongHieu: string;
  loaiSanPham: string;
  details: { kichThuoc: string; soLuong: number; gia: number }[];
  moTa: string | null;
  chatLieu: string;
  mauSac: string;
  hinhAnhs: string[];
  ngayTao: string;
  trangThai: number;
}

interface Comment {
  maBinhLuan: string;
  maSanPham: string;
  maNguoiDung: string;
  hoTen: string;
  noiDungBinhLuan: string;
  danhGia: number;
  ngayBinhLuan: string;
  trangThai: number;
  hinhAnh: string | null;
}

interface Product {
  id: string;
  baseId: string;
  colorCode: string;
  name: string;
  price: number;
  images: string[];
  productType: string;
  description: string | null;
  sizes: { size: string; quantity: number; price: number }[];
  material: string;
  brand: string;
  color: string;
  rating: number;
}

const API_BASE_URL = 'http://192.168.10.35:5261/api';

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark' || (theme === 'system' && Appearance.getColorScheme() === 'dark');
  const themeColors = isDarkMode ? colors.dark : colors.light;

  const [products, setProducts] = useState<Product[]>([]);
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);
  const [selectedSizeIndex, setSelectedSizeIndex] = useState<number | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [likedId, setLikedId] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [rating, setRating] = useState(0);
  const [userData, setUserData] = useState<NguoiDung | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const fileUri = FileSystem.documentDirectory + 'user.json';
        const fileInfo = await FileSystem.getInfoAsync(fileUri);
        if (fileInfo.exists) {
          const fileContent = await FileSystem.readAsStringAsync(fileUri);
          const parsedUserData = JSON.parse(fileContent);
          setUserData(parsedUserData.user || null);
          setAuthToken(parsedUserData.token || null);
        }
      } catch (error) {
        console.error('Error loading user data from FileSystem:', error);
        setError('Không thể tải thông tin người dùng.');
      }
    };
    loadUserData();
  }, []);

  useEffect(() => {
    const fetchProductAndComments = async () => {
      try {
        setLoading(true);
        setError(null);
        const baseProductId = Array.isArray(id) ? id[0] : id?.split('_')[0] || id;

        if (!baseProductId) {
          throw new Error('ID sản phẩm không hợp lệ');
        }

        const productData = await apiFetch(
          `${API_BASE_URL}/SanPham/SanPhamByIDSorted?id=${baseProductId}`,
          'ProductDetail'
        );
        const productArray = Array.isArray(productData) ? productData : [productData];

        const formattedProducts: Product[] = productArray.map((product: ProductFromAPI) => {
          const [baseId, colorCode] = product.id.split('_');
          return {
            id: product.id,
            baseId,
            colorCode,
            name: product.tenSanPham,
            description: product.moTa || 'Không có mô tả',
            price: product.details[0]?.gia || 0,
            rating: 0,
            color: `#${product.mauSac || colorCode}`,
            sizes: product.details.map(detail => ({
              size: detail.kichThuoc.trim(),
              quantity: detail.soLuong,
              price: detail.gia,
            })),
            material: product.chatLieu,
            brand: product.maThuongHieu,
            productType: product.loaiSanPham,
            images: product.hinhAnhs?.map(base64 => `data:image/jpeg;base64,${base64}`) || [],
          };
        });

        const commentData = await apiFetch(`${API_BASE_URL}/Comment/list`, 'Comments');
        const productComments = commentData.filter(
          (comment: Comment) => comment.maSanPham === baseProductId && comment.trangThai === 1
        );

        let enrichedComments = productComments;
        if (userData?.maNguoiDung && authToken) {
          const nguoiDungData = await apiFetch(`${API_BASE_URL}/NguoiDung/${userData.maNguoiDung}`, 'User');
          enrichedComments = productComments.map((comment: Comment) => ({
            ...comment,
            hoTen: comment.maNguoiDung === userData.maNguoiDung ? userData?.hoTen : comment.hoTen,
            hinhAnh: comment.maNguoiDung === userData.maNguoiDung ? nguoiDungData.hinhAnh : comment.hinhAnh,
          }));

          const yeuThichData = await apiFetch(`${API_BASE_URL}/YeuThich`, 'Favorites');
          const userFavorite = yeuThichData.find(
            (yeuThich: any) => yeuThich.maSanPham === baseProductId && yeuThich.maNguoiDung === userData.maNguoiDung
          );
          if (userFavorite) {
            setIsLiked(true);
            setLikedId(userFavorite.maYeuThich);
          }
        }

        const totalRating = enrichedComments.reduce((sum: number, comment: Comment) => sum + comment.danhGia, 0);
        const averageRating = enrichedComments.length > 0 ? totalRating / enrichedComments.length : 0;
        const roundedAverageRating = Number(averageRating.toFixed(1));

        formattedProducts.forEach((product: Product) => {
          product.rating = roundedAverageRating;
        });

        setProducts(formattedProducts);
        setComments(enrichedComments);
      } catch (err) {
        console.error('Error fetching product/comments:', err);
        setError((err as Error).message || 'Không thể tải chi tiết sản phẩm.');
      } finally {
        setLoading(false);
      }
    };

    fetchProductAndComments();
  }, [id, userData, authToken]);

  const handleToggleLike = async () => {
    try {
      if (!userData?.maNguoiDung || !authToken) {
        Alert.alert('Lỗi', 'Vui lòng đăng nhập để thêm sản phẩm vào danh sách yêu thích!', [
          { text: 'OK', onPress: () => router.push('/(auth)/login') },
        ]);
        return;
      }

      if (!id || Array.isArray(id)) {
        Alert.alert('Lỗi', 'ID sản phẩm không hợp lệ!');
        return;
      }

      const baseProductId = id.split('_')[0] || id;
      const tenSanPham = products[0]?.name;

      if (isLiked) {
        await apiFetch(`${API_BASE_URL}/YeuThich/${likedId}`, 'RemoveFavorite', {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${authToken}` },
        });
        setIsLiked(false);
        setLikedId(null);
        Alert.alert('Thành công', 'Đã xóa sản phẩm khỏi danh sách yêu thích!');
      } else {
        const yeuThichData = {
          maSanPham: baseProductId,
          tenSanPham,
          maNguoiDung: userData.maNguoiDung,
          hoTen: userData?.hoTen,
          soLuongYeuThich: 1,
          ngayYeuThich: new Date().toISOString(),
        };

        const addedFavorite = await apiFetch(`${API_BASE_URL}/YeuThich`, 'AddFavorite', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(yeuThichData),
        });
        setIsLiked(true);
        setLikedId(addedFavorite.maYeuThich);
        Alert.alert('Thành công', 'Đã thêm sản phẩm vào danh sách yêu thích!');
      }
    } catch (error) {
      console.error('Error in handleToggleLike:', error);
      Alert.alert('Lỗi', 'Có lỗi xảy ra khi thao tác với yêu thích!');
    }
  };

  const handleAddToCart = async () => {
    try {
      const fileUri = FileSystem.documentDirectory + 'user.json';
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      let userDataFromFile = null;
      let token = null;

      if (fileInfo.exists) {
        const fileContent = await FileSystem.readAsStringAsync(fileUri);
        const parsedData = JSON.parse(fileContent);
        userDataFromFile = parsedData.user;
        token = parsedData.token;
      }

      if (!userDataFromFile || !token) {
        Alert.alert(
          'Lỗi',
          'Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng!',
          [
            { text: 'OK', onPress: () => router.push('/(auth)/login') },
          ]
        );

        return;
      }

      const maNguoiDung = userDataFromFile?.maNguoiDung;
      if (!maNguoiDung) {
        Alert.alert('Lỗi', 'Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại!', [
          { text: 'OK', onPress: () => router.push('/(auth)/login') },
        ]);
        return;
      }

      if (selectedSizeIndex === null) {
        Alert.alert('Lỗi', 'Vui lòng chọn kích thước trước khi thêm vào giỏ hàng!');
        return;
      }

      if (!id || Array.isArray(id)) {
        Alert.alert('Lỗi', 'ID sản phẩm không hợp lệ!');
        return;
      }

      const selectedProduct = products[selectedColorIndex];
      const selectedSize = selectedProduct.sizes[selectedSizeIndex];
      const cartData = {
        IDNguoiDung: maNguoiDung,
        IDSanPham: id.split('_')[0] || id,
        MauSac: selectedProduct.colorCode,
        KichThuoc: selectedSize.size,
        SoLuong: quantity,
      };

      await apiFetch(`${API_BASE_URL}/Cart/ThemSanPhamVaoGioHang`, 'AddToCart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(cartData),
      });

      Alert.alert('Thành công', 'Đã thêm vào giỏ hàng thành công!');
    } catch (err) {
      console.error('Error in handleAddToCart:', err);
      if (axios.isAxiosError(err)) {
        const errorMessage = err.response?.data?.message || 'Có lỗi xảy ra khi thêm vào giỏ hàng!';
        if (err.response?.status === 401) {
          Alert.alert('Lỗi', 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại!', [
            { text: 'OK', onPress: () => router.push('/(auth)/login') },
          ]);
        } else {
          Alert.alert('Lỗi', errorMessage);
        }
      } else {
        Alert.alert('Lỗi', 'Đã có lỗi không xác định xảy ra!');
      }
    }
  };

  const handleAddComment = async () => {
    try {
      if (!newComment || rating < 1 || rating > 5) {
        Alert.alert('Lỗi', 'Vui lòng nhập nội dung bình luận và chọn đánh giá từ 1 đến 5 sao!');
        return;
      }

      if (!userData?.maNguoiDung || !authToken) {
        Alert.alert('Lỗi', 'Vui lòng đăng nhập trước khi thêm bình luận!', [
          { text: 'OK', onPress: () => router.push('/(auth)/login') },
        ]);
        return;
      }

      if (!id || Array.isArray(id)) {
        Alert.alert('Lỗi', 'ID sản phẩm không hợp lệ!');
        return;
      }

      const commentData = {
        maSanPham: id.split('_')[0] || id,
        tenSanPham: products[0]?.name,
        maNguoiDung: userData.maNguoiDung,
        hoTen: userData?.hoTen,
        noiDungBinhLuan: newComment,
        danhGia: rating,
        ngayBinhLuan: new Date().toISOString(),
        trangThai: 0,
        hinhAnh: userData?.hinhAnh,
      };

      await apiFetch(`${API_BASE_URL}/Comment/add`, 'AddComment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(commentData),
      });

      setNewComment('');
      setRating(0);
      Alert.alert('Thành công', 'Bình luận của bạn đã được ghi lại và chờ duyệt!');
    } catch (err) {
      console.error('Error in handleAddComment:', err);
      Alert.alert('Lỗi', 'Có lỗi xảy ra khi thêm bình luận!');
    }
  };

  const handleDeleteComment = async (maBinhLuan: string) => {
    Alert.alert('Xác nhận', 'Bạn có chắc muốn xóa bình luận này không?', [
      { text: 'Không', style: 'cancel' },
      {
        text: 'Có',
        onPress: async () => {
          try {
            if (!authToken) {
              Alert.alert('Lỗi', 'Bạn cần đăng nhập để thực hiện chức năng này!', [
                { text: 'OK', onPress: () => router.push('/(auth)/login') },
              ]);
              return;
            }

            await apiFetch(`${API_BASE_URL}/Comment/delete/${maBinhLuan}`, 'DeleteComment', {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${authToken}` },
            });

            setComments(prev => {
              const updatedComments = prev.filter(comment => comment.maBinhLuan !== maBinhLuan);
              const totalRating = updatedComments.reduce((sum, comment) => sum + comment.danhGia, 0);
              const averageRating = updatedComments.length > 0 ? totalRating / updatedComments.length : 0;
              const roundedAverageRating = Number(averageRating.toFixed(1));

              setProducts(prevProducts =>
                prevProducts.map(product => ({ ...product, rating: roundedAverageRating }))
              );

              return updatedComments;
            });

            Alert.alert('Thành công', 'Xóa bình luận thành công!');
          } catch (err) {
            console.error('Error in handleDeleteComment:', err);
            Alert.alert('Lỗi', 'Có lỗi xảy ra khi xóa bình luận!');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        <Text style={[styles.errorText, { color: themeColors.textPrimary }]}>Đang tải...</Text>
      </View>
    );
  }

  if (error || !products.length) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        <Text style={[styles.errorText, { color: themeColors.textPrimary }]}>
          Lỗi: {error || 'Không tìm thấy sản phẩm'}
        </Text>
      </View>
    );
  }

  const currentProduct = products[selectedColorIndex];
  const availableSizes = currentProduct.sizes;
  const selectedPrice =
    selectedSizeIndex !== null ? currentProduct.sizes[selectedSizeIndex].price : currentProduct.price;
  const currentUserId = userData?.maNguoiDung;

  return (
    <ScrollView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/products')} style={styles.backButton}>
          <ArrowLeft size={24} color={themeColors.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleToggleLike} style={styles.wishlistButton}>
          <Heart size={24} color={isLiked ? '#ff0000' : themeColors.iconPrimary} fill={isLiked ? '#ff0000' : 'none'} />
        </TouchableOpacity>
      </View>

      <Image source={{ uri: currentProduct.images[selectedImage] }} style={styles.productImage} />
      <View style={styles.thumbnailContainer}>
        {currentProduct.images.map((image, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.thumbnail,
              selectedImage === index && { borderColor: themeColors.iconPrimary, borderWidth: 2 },
            ]}
            onPress={() => setSelectedImage(index)}
          >
            <Image source={{ uri: image }} style={styles.thumbnailImage} />
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.content}>
        <Text style={[styles.name, { color: themeColors.textPrimary }]}>{currentProduct.name}</Text>
        <View style={styles.ratingContainer}>
          {Array.from({ length: 5 }).map((_, index) => (
            <Star
              key={index}
              size={16}
              color={index < Math.floor(currentProduct.rating) ? '#facc15' : '#d1d5db'}
              fill={index < Math.floor(currentProduct.rating) ? '#facc15' : 'none'}
            />
          ))}
          <Text style={[styles.ratingText, { color: themeColors.textSecondary }]}>
            {currentProduct.rating}
          </Text>
        </View>
        <Text style={[styles.price, { color: themeColors.iconPrimary }]}>
          {(selectedPrice / 1000)?.toFixed(3)} VND
        </Text>

        <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>Màu sắc</Text>
        <View style={styles.colorsContainer}>
          {products.map((product, index) => (
            <TouchableOpacity
              key={product.id}
              style={[
                styles.colorButton,
                { backgroundColor: product.color },
                selectedColorIndex === index && { borderColor: themeColors.iconPrimary, borderWidth: 2 },
              ]}
              onPress={() => {
                setSelectedColorIndex(index);
                setSelectedSizeIndex(null);
              }}
            />
          ))}
        </View>

        <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>Kích thước</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sizesContainer}>
          {availableSizes.map((sizeObj, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.sizeButton,
                { backgroundColor: themeColors.secondaryBackground },
                selectedSizeIndex === index && { backgroundColor: themeColors.iconPrimary },
              ]}
              onPress={() => setSelectedSizeIndex(index)}
            >
              <Text
                style={[
                  styles.sizeText,
                  { color: selectedSizeIndex === index ? '#fff' : themeColors.textPrimary },
                ]}
              >
                {sizeObj.size}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>Số lượng</Text>
        <View style={styles.quantityContainer}>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => setQuantity(Math.max(1, quantity - 1))}
            disabled={quantity <= 1}
          >
            <Text style={[styles.quantityText, { color: themeColors.textPrimary }]}>-</Text>
          </TouchableOpacity>
          <Text style={[styles.quantityValue, { color: themeColors.textPrimary }]}>{quantity}</Text>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() =>
              setQuantity(
                Math.min(
                  selectedSizeIndex !== null ? availableSizes[selectedSizeIndex].quantity : availableSizes[0].quantity,
                  quantity + 1
                )
              )
            }
          >
            <Text style={[styles.quantityText, { color: themeColors.textPrimary }]}>+</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>Thông tin sản phẩm</Text>
        <Text style={[styles.description, { color: themeColors.textTertiary }]}>
          Chất liệu: {currentProduct.material}
        </Text>
        <Text style={[styles.description, { color: themeColors.textTertiary }]}>
          Thương hiệu: {currentProduct.brand}
        </Text>
        <Text style={[styles.description, { color: themeColors.textTertiary }]}>
          Loại sản phẩm: {currentProduct.productType}
        </Text>
        <Text style={[styles.description, { color: themeColors.textTertiary }]}>
          {currentProduct.description}
        </Text>

        <TouchableOpacity
          style={[styles.addToCartButton, { backgroundColor: themeColors.iconPrimary }]}
          onPress={handleAddToCart}
        >
          <ShoppingBag size={20} color="#fff" />
          <Text style={styles.addToCartText}>Thêm vào giỏ hàng</Text>
        </TouchableOpacity>

        <Text style={[styles.sectionTitle, { color: themeColors.textPrimary, fontSize: 24 }]}>Đánh giá sản phẩm</Text>
        <View style={styles.commentForm}>
          <View style={styles.ratingInput}>
            {Array.from({ length: 5 }).map((_, index) => (
              <TouchableOpacity key={index} onPress={() => setRating(index + 1)}>
                <Star
                  size={24}
                  color={index < rating ? '#facc15' : '#d1d5db'}
                  fill={index < rating ? '#facc15' : 'none'}
                />
              </TouchableOpacity>
            ))}
          </View>
          <View style={[styles.inputWrapper, { borderColor: themeColors.textTertiary }]}>
            <TextInput
              style={[styles.commentInput, { color: themeColors.textPrimary }]}
              placeholder="Nhập đánh giá của bạn..."
              placeholderTextColor={themeColors.textTertiary}
              value={newComment}
              onChangeText={setNewComment}
              multiline
            />
            <TouchableOpacity style={styles.submitIcon} onPress={handleAddComment}>
              <Send size={20} color={themeColors.iconPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.commentsContainer}>
          {comments.length === 0 ? (
            <Text style={[styles.noComments, { color: themeColors.textTertiary }]}>
              Chưa có đánh giá nào.
            </Text>
          ) : (
            comments.map(comment => (
              <View key={comment.maBinhLuan} style={[styles.comment, { backgroundColor: themeColors.secondaryBackground }]}>
                <View style={styles.commentHeader}>
                  <View style={styles.commentAuthorContainer}>
                    {comment.hinhAnh ? (
                      <Image
                        source={{ uri: `data:image/jpeg;base64,${comment.hinhAnh}` }}
                        style={styles.commentAvatar}
                      />
                    ) : (
                      <View style={[styles.commentAvatar, styles.placeholderAvatar]}>
                        <Text style={styles.placeholderText}>
                          {comment.hoTen?.charAt(0).toUpperCase() || '?'}
                        </Text>
                      </View>
                    )}
                    <Text style={[styles.commentAuthor, { color: themeColors.textPrimary }]}>
                      {comment.hoTen}
                    </Text>
                  </View>
                  {comment.maNguoiDung === currentUserId && (
                    <TouchableOpacity onPress={() => handleDeleteComment(comment.maBinhLuan)}>
                      <Trash2 size={20} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                </View>
                <View style={styles.ratingContainer}>
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star
                      key={index}
                      size={16}
                      color={index < comment.danhGia ? '#facc15' : '#d1d5db'}
                      fill={index < comment.danhGia ? '#facc15' : 'none'}
                    />
                  ))}
                  <Text style={[styles.commentDate, { color: themeColors.textSecondary }]}>
                    {new Date(comment.ngayBinhLuan).toLocaleDateString()}
                  </Text>
                </View>
                <Text style={[styles.commentText, { color: themeColors.textPrimary }]}>
                  {comment.noiDungBinhLuan}
                </Text>
              </View>
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingTop: 48,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wishlistButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productImage: {
    width: '100%',
    height: 200,
  },
  thumbnailContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
    overflow: 'hidden',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  content: {
    padding: 24,
  },
  category: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    marginBottom: 8,
  },
  name: {
    fontSize: 24,
    fontFamily: 'Poppins_600SemiBold',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingText: {
    marginLeft: 4,
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
  },
  price: {
    fontSize: 24,
    fontFamily: 'Poppins_700Bold',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    marginBottom: 12,
  },
  colorsContainer: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  colorButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  sizesContainer: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  sizeButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sizeText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  quantityButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
  },
  quantityText: {
    fontSize: 20,
    fontFamily: 'Poppins_500Medium',
  },
  quantityValue: {
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
    marginHorizontal: 16,
  },
  description: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    lineHeight: 24,
    marginBottom: 8,
  },
  addToCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  addToCartText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    marginLeft: 8,
  },
  commentForm: {
    marginBottom: 24,
  },
  ratingInput: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  commentInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  submitIcon: {
    marginLeft: 8,
  },
  commentsContainer: {
    marginBottom: 24,
  },
  comment: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  commentAuthorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  placeholderAvatar: {
    backgroundColor: '#A0AEC0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
  },
  commentAuthor: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
  },
  commentDate: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    marginLeft: 8,
  },
  commentText: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    lineHeight: 20,
  },
  noComments: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
    textAlign: 'center',
    marginTop: 24,
  },
});
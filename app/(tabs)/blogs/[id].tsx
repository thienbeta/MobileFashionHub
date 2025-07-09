import { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    Image,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    TextInput,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "../../context/theme";
import { ArrowLeft, Star, Share as ShareIcon, Trash2, Send } from "lucide-react-native";
import { apiFetch } from "../../../src/utils/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Share } from "react-native";
import * as FileSystem from "expo-file-system";

const API_BASE_URL = "http://192.168.10.32:5261/api";

interface NguoiDung {
    maNguoiDung: string;
    hoTen: string;
    vaiTro: string;
    hinhAnh: string | null;
}

interface Comment {
    maBinhLuan: string;
    maBlog: number;
    maNguoiDung: string;
    hoTen: string;
    noiDungBinhLuan: string;
    danhGia: number;
    ngayBinhLuan: string;
    trangThai: number;
    hinhAnh: string | null;
}

interface Blog {
    maBlog: number;
    maNguoiDung: string;
    ngayTao: string;
    tieuDe: string;
    noiDung: string;
    slug: string | null;
    metaTitle: string | null;
    metaDescription: string | null;
    hinhAnh: string | null;
    moTaHinhAnh: string | null;
    isPublished: boolean;
    tags: string[] | null;
}

export default function BlogDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { theme } = useTheme();
    const isDarkMode = theme === "dark";
    const themeColors = isDarkMode
        ? { background: "#1A202C", textPrimary: "#fff", textSecondary: "#A0AEC0", accent: "#9F7AEA" }
        : { background: "#fff", textPrimary: "#2D3748", textSecondary: "#718096", accent: "#6B46C1" };

    const [blog, setBlog] = useState<Blog | null>(null);
    const [nguoiDung, setNguoiDung] = useState<NguoiDung | null>(null);
    const [userData, setUserData] = useState<NguoiDung | null>(null);
    const [authToken, setAuthToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isFavorite, setIsFavorite] = useState(false);
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState("");
    const [rating] = useState(5);

    const fetchBlogAndComments = async () => {
        try {
            setLoading(true);
            setError(null);
            const baseId = Array.isArray(id) ? id[0] : id;
            if (!baseId) throw new Error("ID không hợp lệ");

            const blogResponse = await apiFetch(`${API_BASE_URL}/Blog/${baseId}`, "BlogDetail");
            setBlog(blogResponse);

            try {
                const nguoiDungResponse = await apiFetch(
                    `${API_BASE_URL}/NguoiDung/${blogResponse.maNguoiDung}`,
                    "User"
                );
                setNguoiDung(nguoiDungResponse);
            } catch {
                setNguoiDung(null);
            }

            const favorites = await AsyncStorage.getItem("favorites");
            if (favorites) {
                const favoriteIds = JSON.parse(favorites);
                setIsFavorite(favoriteIds.includes(blogResponse.maBlog));
            }

            const commentData = await apiFetch(`${API_BASE_URL}/Comment/list`, "Comments");
            const blogComments = commentData
                .filter((comment: Comment) => comment.maBlog === parseInt(baseId) && comment.trangThai === 1)
                .map((comment: Comment) => ({
                    ...comment,
                    maBinhLuan: String(comment.maBinhLuan),
                }));

            let enrichedComments = blogComments;
            if (userData?.maNguoiDung && authToken) {
                const nguoiDungData = await apiFetch(`${API_BASE_URL}/NguoiDung/${userData.maNguoiDung}`, "User");
                enrichedComments = blogComments.map((comment: Comment) => ({
                    ...comment,
                    hoTen: comment.maNguoiDung === userData.maNguoiDung ? userData?.hoTen : comment.hoTen,
                    hinhAnh: comment.maNguoiDung === userData.maNguoiDung ? nguoiDungData.hinhAnh : comment.hinhAnh,
                }));
            }

            setComments(enrichedComments);
        } catch (err) {
            setError("Không thể tải bài viết hoặc bình luận. Vui lòng kiểm tra ID hoặc liên hệ admin.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const loadUserData = async () => {
            try {
                const fileUri = FileSystem.documentDirectory + "user.json";
                const fileInfo = await FileSystem.getInfoAsync(fileUri);
                if (fileInfo.exists) {
                    const fileContent = await FileSystem.readAsStringAsync(fileUri);
                    const parsedUserData = JSON.parse(fileContent);
                    setUserData(parsedUserData.user || null);
                    setAuthToken(parsedUserData.token || null);
                }
            } catch (error) {
                setError("Không thể tải thông tin người dùng.");
            }
        };
        loadUserData();
    }, []);

    useEffect(() => {
        if (id) fetchBlogAndComments();
    }, [id, userData, authToken]);

    const toggleFavorite = async () => {
        try {
            const newFavoriteStatus = !isFavorite;
            setIsFavorite(newFavoriteStatus);

            const favorites = await AsyncStorage.getItem("favorites");
            let favoriteIds = favorites ? JSON.parse(favorites) : [];

            if (newFavoriteStatus) {
                favoriteIds.push(blog!.maBlog);
            } else {
                favoriteIds = favoriteIds.filter((id: number) => id !== blog!.maBlog);
            }

            await AsyncStorage.setItem("favorites", JSON.stringify(favoriteIds));
            Alert.alert("Thành công", `Đã ${newFavoriteStatus ? "thêm" : "bỏ"} bài viết vào danh sách yêu thích!`);
        } catch (err) {
            setIsFavorite(!isFavorite);
            Alert.alert("Lỗi", "Không thể cập nhật danh sách yêu thích.");
        }
    };

    const handleShare = async () => {
        if (blog) {
            try {
                const message = `${blog.tieuDe}\n\n${blog.noiDung.substring(0, 6)}...\nXem chi tiết: ${API_BASE_URL}/blogs/${blog.maBlog}`;
                await Share.share({
                    message: message,
                    title: blog.tieuDe,
                });
            } catch (err) {
                Alert.alert("Lỗi", "Không thể chia sẻ bài viết.");
            }
        }
    };

    const handleAddComment = async () => {
        try {
            if (!newComment) {
                Alert.alert("Lỗi", "Vui lòng nhập nội dung bình luận!");
                return;
            }

            if (!userData?.maNguoiDung || !authToken) {
                Alert.alert("Lỗi", "Vui lòng đăng nhập trước khi thêm bình luận!", [
                    { text: "OK", onPress: () => router.push("/(auth)/login") },
                ]);
                return;
            }

            if (!id || Array.isArray(id)) {
                Alert.alert("Lỗi", "ID blog không hợp lệ!");
                return;
            }

            const commentData = {
                maBlog: parseInt(id),
                maNguoiDung: userData.maNguoiDung,
                hoTen: userData?.hoTen,
                noiDungBinhLuan: newComment,
                danhGia: rating,
                ngayBinhLuan: new Date().toISOString(),
                trangThai: 1,
                hinhAnh: userData?.hinhAnh,
            };

            const newCommentResponse = await apiFetch(`${API_BASE_URL}/Comment/add`, "AddComment", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${authToken}`,
                },
                body: JSON.stringify(commentData),
            });

            setComments((prev) => [
                {
                    maBinhLuan: String(newCommentResponse.maBinhLuan),
                    maBlog: parseInt(id),
                    maNguoiDung: userData.maNguoiDung,
                    hoTen: userData.hoTen,
                    noiDungBinhLuan: newComment,
                    danhGia: rating,
                    ngayBinhLuan: new Date().toISOString(),
                    trangThai: 1,
                    hinhAnh: userData?.hinhAnh,
                },
                ...prev,
            ]);

            setNewComment("");
            Alert.alert("Thành công", "Bình luận của bạn đã được thêm!");
        } catch (err) {
            Alert.alert("Lỗi", "Có lỗi xảy ra khi thêm bình luận!");
        }
    };

    const handleDeleteComment = async (maBinhLuan: string) => {
        Alert.alert("Xác nhận", "Bạn có chắc muốn xóa bình luận này không?", [
            { text: "Không", style: "cancel" },
            {
                text: "Có",
                onPress: async () => {
                    try {
                        if (!authToken) {
                            Alert.alert("Lỗi", "Bạn cần đăng nhập để thực hiện chức năng này!", [
                                { text: "OK", onPress: () => router.push("/(auth)/login") },
                            ]);
                            return;
                        }

                        await apiFetch(`${API_BASE_URL}/Comment/delete/${maBinhLuan}`, "DeleteComment", {
                            method: "DELETE",
                            headers: { Authorization: `Bearer ${authToken}` },
                        });

                        setComments((prev) => prev.filter((comment) => comment.maBinhLuan !== maBinhLuan));
                        Alert.alert("Thành công", "Xóa bình luận thành công!");
                    } catch (err) {
                        Alert.alert("Lỗi", "Có lỗi xảy ra khi xóa bình luận!");
                    }
                },
            },
        ]);
    };

    const retryFetch = () => {
        setLoading(true);
        setError(null);
        fetchBlogAndComments();
    };

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: themeColors.background }]}>
                <ActivityIndicator size="large" color={themeColors.accent} style={styles.loadingIndicator} />
            </View>
        );
    }

    if (error || !blog) {
        return (
            <View style={[styles.container, { backgroundColor: themeColors.background }]}>
                <Text style={[styles.errorText, { color: themeColors.textPrimary }]}>{error || "Không tìm thấy bài viết"}</Text>
                <TouchableOpacity onPress={retryFetch} style={styles.retryButton}>
                    <Text style={[styles.retryText, { color: themeColors.accent }]}>Thử lại</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const formattedDate = new Date(blog.ngayTao).toLocaleDateString("vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });

    return (
        <ScrollView style={[styles.container, { backgroundColor: themeColors.background }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.push('/blogs')} style={styles.backButton}>
                    <ArrowLeft size={24} color={themeColors.textPrimary} />
                </TouchableOpacity>
                <View style={styles.actionButtons}>
                    <TouchableOpacity onPress={toggleFavorite} style={styles.actionButton}>
                        <Star size={24} color={isFavorite ? themeColors.accent : themeColors.textSecondary} fill={isFavorite ? themeColors.accent : "none"} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleShare} style={styles.actionButton}>
                        <ShareIcon size={24} color={themeColors.textSecondary} />
                    </TouchableOpacity>
                </View>
            </View>

            {blog.hinhAnh && (
                <Image
                    source={{ uri: `data:image/jpeg;base64,${blog.hinhAnh}` }}
                    style={styles.blogImage}
                    resizeMode="cover"
                />
            )}

            <View style={styles.content}>
                <Text style={[styles.title, { color: themeColors.textPrimary }]}>{blog.tieuDe}</Text>
                <View style={styles.meta}>
                    <View style={styles.authorContainer}>
                        {nguoiDung?.hinhAnh ? (
                            <Image
                                source={{ uri: `data:image/jpeg;base64,${nguoiDung.hinhAnh}` }}
                                style={styles.authorAvatar}
                            />
                        ) : (
                            <View style={[styles.authorAvatar, styles.placeholderAvatar]}>
                                <Text style={styles.placeholderText}>
                                    {nguoiDung?.hoTen.charAt(0).toUpperCase() || "?"}
                                </Text>
                            </View>
                        )}
                        <Text style={[styles.author, { color: themeColors.textSecondary }]}>
                            {nguoiDung?.hoTen || blog.maNguoiDung}
                        </Text>
                    </View>
                    <Text style={[styles.date, { color: themeColors.textSecondary }]}>Ngày tạo: {formattedDate}</Text>
                </View>
                <Text style={[styles.contentText, { color: themeColors.textPrimary }]}>{blog.noiDung}</Text>
                {blog.tags && blog.tags.length > 0 && (
                    <View style={styles.tagsContainer}>
                        {blog.tags.map((tag, index) => (
                            <Text key={index} style={[styles.tag, isDarkMode && styles.tagDark]}>{tag}</Text>
                        ))}
                    </View>
                )}

                <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>Bình luận bài viết</Text>
                <View style={styles.commentForm}>
                    <View style={[styles.inputWrapper, { borderColor: themeColors.textSecondary }]}>
                        <TextInput
                            style={[styles.commentInput, { color: themeColors.textPrimary }]}
                            placeholder="Nhập bình luận của bạn..."
                            placeholderTextColor={themeColors.textSecondary}
                            value={newComment}
                            onChangeText={setNewComment}
                            multiline
                        />
                        <TouchableOpacity style={styles.submitIcon} onPress={handleAddComment}>
                            <Send size={20} color={themeColors.accent} />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.commentsContainer}>
                    {comments.length === 0 ? (
                        <Text style={[styles.noComments, { color: themeColors.textSecondary }]}>Chưa có bình luận nào.</Text>
                    ) : (
                        comments.map((comment) => (
                            <View
                                key={comment.maBinhLuan}
                                style={[styles.comment, { backgroundColor: isDarkMode ? '#2D3748' : '#F7FAFC' }]}
                            >
                                <View style={styles.commentHeader}>
                                    <View style={styles.commentAuthorContainer}>
                                        {comment.hinhAnh ? (
                                            <Image
                                                source={{ uri: `data:image/jpeg;base64,${comment.hinhAnh}` }}
                                                style={styles.commentAvatar}
                                            />
                                        ) : (
                                            <View style={[styles.commentAvatar, styles.placeholderAvatar]}>
                                                <Text style={[styles.placeholderText, { color: themeColors.textSecondary }]}>
                                                    {comment.hoTen?.charAt(0)?.toUpperCase() || '?'}
                                                </Text>
                                            </View>
                                        )}
                                        <Text style={[styles.commentAuthor, { color: themeColors.textPrimary }]}>{comment.hoTen}</Text>
                                    </View>
                                    {comment.maNguoiDung === userData?.maNguoiDung && (
                                        <TouchableOpacity onPress={() => handleDeleteComment(comment.maBinhLuan)}>
                                            <Trash2 size={20} color="#ef4444" />
                                        </TouchableOpacity>
                                    )}
                                </View>
                                <View style={styles.commentMeta}>
                                    <Text style={[styles.commentDate, { color: themeColors.textSecondary }]}>
                                        {new Date(comment.ngayBinhLuan).toLocaleDateString()}
                                    </Text>
                                </View>
                                <Text style={[styles.commentText, { color: themeColors.textPrimary }]}>{comment.noiDungBinhLuan}</Text>
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
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 16,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
    },
    actionButtons: {
        flexDirection: "row",
        gap: 16,
    },
    actionButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
    },
    blogImage: {
        width: "100%",
        height: 200,
    },
    content: {
        padding: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        marginBottom: 8,
    },
    meta: {
        marginBottom: 16,
    },
    authorContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 4,
    },
    authorAvatar: {
        width: 24,
        height: 24,
        borderRadius: 12,
        marginRight: 8,
    },
    placeholderAvatar: {
        backgroundColor: "#A0AEC0",
        alignItems: "center",
        justifyContent: "center",
    },
    placeholderText: {
        color: "#fff",
        fontSize: 12,
        fontWeight: "bold",
    },
    author: {
        fontSize: 14,
    },
    date: {
        fontSize: 12,
    },
    contentText: {
        fontSize: 16,
        lineHeight: 24,
        marginBottom: 16,
    },
    tagsContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        marginBottom: 16,
    },
    tag: {
        backgroundColor: "#E6E6FA",
        color: "#2D3748",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        marginRight: 8,
        marginBottom: 4,
        fontSize: 12,
    },
    tagDark: {
        backgroundColor: "#4A5568",
        color: "#fff",
    },
    loadingIndicator: {
        marginTop: 50,
    },
    errorText: {
        textAlign: "center",
        fontSize: 16,
        marginTop: 24,
    },
    retryButton: {
        padding: 8,
        marginTop: 8,
        alignSelf: "center",
    },
    retryText: {
        fontSize: 14,
    },
    sectionTitle: {
        fontSize: 24,
        fontWeight: "bold",
        marginTop: 16,
        marginBottom: 12,
    },
    commentForm: {
        marginBottom: 24,
    },
    inputWrapper: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
    },
    commentInput: {
        flex: 1,
        fontSize: 16,
        minHeight: 100,
        textAlignVertical: "top",
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
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },
    commentAuthorContainer: {
        flexDirection: "row",
        alignItems: "center",
    },
    commentAvatar: {
        width: 24,
        height: 24,
        borderRadius: 12,
        marginRight: 8,
    },
    commentAuthor: {
        fontSize: 14,
        fontWeight: "bold",
    },
    commentMeta: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 8,
    },
    commentDate: {
        fontSize: 12,
        marginLeft: 8,
    },
    commentText: {
        fontSize: 14,
        lineHeight: 20,
    },
    noComments: {
        fontSize: 14,
        textAlign: "center",
    },
});
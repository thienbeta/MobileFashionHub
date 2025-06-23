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
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "../../context/theme";
import { ArrowLeft, Star, Share as ShareIcon } from "lucide-react-native";
import { apiFetch } from "../../../src/utils/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Share } from "react-native";

interface NguoiDung {
    maNguoiDung: string;
    hoTen: string;
    vaiTro: string;
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

const API_BASE_URL = "http://172.23.144.1:5261/api";

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
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isFavorite, setIsFavorite] = useState(false);

    const fetchBlog = async () => {
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
        } catch (err) {
            setError("Không thể tải bài viết. Vui lòng kiểm tra ID hoặc liên hệ admin.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) fetchBlog();
    }, [id]);

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
            console.error("Error toggling favorite:", err);
            setIsFavorite(!isFavorite);
            Alert.alert("Lỗi", "Không thể cập nhật danh sách yêu thích.");
        }
    };

    const handleShare = async () => {
        if (blog) {
            try {
                const shareMessage = `${blog.tieuDe}\n\n${blog.noiDung.substring(0, 100)}...\nXem chi tiết: ${API_BASE_URL}/blogs/${blog.maBlog}`;
                await Share.share({
                    message: shareMessage,
                    title: blog.tieuDe,
                });
            } catch (err) {
                console.error("Error sharing:", err);
                Alert.alert("Lỗi", "Không thể chia sẻ bài viết.");
            }
        }
    };

    const retryFetch = () => {
        fetchBlog();
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
                    <Text style={[styles.author, { color: themeColors.textSecondary }]}>
                        Người tạo: {nguoiDung?.hoTen || blog.maNguoiDung}
                    </Text>
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
        height: 300,
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
    author: {
        fontSize: 14,
        marginBottom: 4,
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
        marginTop: 24,
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
});
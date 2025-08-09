import { useState, useEffect, useMemo } from "react";
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
    Dimensions,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "../../context/theme";
import { ArrowLeft, Star, Share as ShareIcon, Trash2, Send } from "lucide-react-native";
import { apiFetch } from "../../../src/utils/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Share } from "react-native";
import * as FileSystem from "expo-file-system";
import RenderHTML, { CustomBlockRenderer } from "react-native-render-html";
import { convert } from "html-to-text";

const API_BASE_URL = "https://ce5e722365ab.ngrok-free.app/api";

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
    const [htmlError, setHtmlError] = useState(false);

    const { width } = Dimensions.get("window");

    const fetchBlogAndComments = async () => {
        try {
            setLoading(true);
            setError(null);
            setHtmlError(false);
            const baseId = Array.isArray(id) ? id[0] : id;
            if (!baseId) throw new Error("ID không hợp lệ");

            const blogResponse = await apiFetch(`${API_BASE_URL}/Blog/${baseId}`, "BlogDetail");
            if (!blogResponse.isPublished) throw new Error("Bài viết chưa được công khai");
            setBlog(blogResponse);

            try {
                const nguoiDungResponse = await apiFetch(
                    `${API_BASE_URL}/NguoiDung/${blogResponse.maNguoiDung}`,
                    "User"
                );
                setNguoiDung(nguoiDungResponse);
            } catch {
                setNguoiDung({ maNguoiDung: blogResponse.maNguoiDung, hoTen: "Unknown", vaiTro: "", hinhAnh: null });
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
                    hoTen: comment.maNguoiDung === userData.maNguoiDung ? userData.hoTen : comment.hoTen,
                    hinhAnh: comment.maNguoiDung === userData.maNguoiDung ? nguoiDungData.hinhAnh : comment.hinhAnh,
                }));
            }
            setComments(enrichedComments);
        } catch (err: any) {
            setError(err.message || "Không thể tải bài viết hoặc bình luận. Vui lòng kiểm tra lại.");
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
            } catch {
                setError("Không thể tải thông tin người dùng.");
            }
        };
        loadUserData();
    }, []);

    useEffect(() => {
        if (id) fetchBlogAndComments();
    }, [id, userData, authToken]);

    const toggleFavorite = async () => {
        if (!blog) return;
        try {
            const newFavoriteStatus = !isFavorite;
            setIsFavorite(newFavoriteStatus);
            const favorites = await AsyncStorage.getItem("favorites");
            let favoriteIds = favorites ? JSON.parse(favorites) : [];
            if (newFavoriteStatus) {
                favoriteIds.push(blog.maBlog);
            } else {
                favoriteIds = favoriteIds.filter((id: number) => id !== blog.maBlog);
            }
            await AsyncStorage.setItem("favorites", JSON.stringify(favoriteIds));
            Alert.alert("Thành công", `Đã ${newFavoriteStatus ? "thêm" : "bỏ"} bài viết vào danh sách yêu thích!`);
        } catch {
            setIsFavorite(!isFavorite);
            Alert.alert("Lỗi", "Không thể cập nhật danh sách yêu thích.");
        }
    };

    const handleShare = async () => {
        if (!blog) return;
        try {
            const plainText = convert(blog.noiDung, { wordwrap: 130 });
            const message = `${blog.tieuDe}\n\n${plainText.substring(0, 100)}...\nXem chi tiết: ${API_BASE_URL}/blogs/${blog.slug || blog.maBlog}`;
            await Share.share({ message, title: blog.tieuDe });
        } catch {
            Alert.alert("Lỗi", "Không thể chia sẻ bài viết.");
        }
    };

    const handleAddComment = async () => {
        if (!newComment.trim()) {
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
        try {
            const commentData = {
                maBlog: parseInt(id),
                maNguoiDung: userData.maNguoiDung,
                hoTen: userData.hoTen,
                noiDungBinhLuan: newComment.trim(),
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
                    noiDungBinhLuan: newComment.trim(),
                    danhGia: rating,
                    ngayBinhLuan: new Date().toISOString(),
                    trangThai: 1,
                    hinhAnh: userData?.hinhAnh,
                },
                ...prev,
            ]);
            setNewComment("");
            Alert.alert("Thành công", "Bình luận của bạn đã được thêm!");
        } catch {
            Alert.alert("Lỗi", "Có lỗi xảy ra khi thêm bình luận!");
        }
    };

    const handleDeleteComment = async (maBinhLuan: string) => {
        if (!authToken) {
            Alert.alert("Lỗi", "Bạn cần đăng nhập để thực hiện chức năng này!", [
                { text: "OK", onPress: () => router.push("/(auth)/login") },
            ]);
            return;
        }
        Alert.alert("Xác nhận", "Bạn có chắc muốn xóa bình luận này không?", [
            { text: "Không", style: "cancel" },
            {
                text: "Có",
                onPress: async () => {
                    try {
                        await apiFetch(`${API_BASE_URL}/Comment/delete/${maBinhLuan}`, "DeleteComment", {
                            method: "DELETE",
                            headers: { Authorization: `Bearer ${authToken}` },
                        });
                        setComments((prev) => prev.filter((comment) => comment.maBinhLuan !== maBinhLuan));
                        Alert.alert("Thành công", "Xóa bình luận thành công!");
                    } catch {
                        Alert.alert("Lỗi", "Có lỗi xảy ra khi xóa bình luận!");
                    }
                },
            },
        ]);
    };

    const retryFetch = () => {
        setLoading(true);
        setError(null);
        setHtmlError(false);
        fetchBlogAndComments();
    };

    const htmlContent = useMemo(() => {
        if (!blog?.noiDung) return { html: "" };
        try {
            const sanitizedHtml = blog.noiDung
                .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
                .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
                .replace(/on\w+="[^"]*"/g, "");
            return { html: sanitizedHtml };
        } catch (error) {
            console.error("HTML parsing error:", error);
            setHtmlError(true);
            return { html: "" };
        }
    }, [blog?.noiDung]);

    const customRenderers: { img: CustomBlockRenderer } = {
        img: ({ tnode }) => {
            const src = tnode.attributes?.src;
            if (src && src.startsWith("data:image")) {
                return (
                    <Image
                        key={tnode.nodeIndex}
                        source={{ uri: src }}
                        style={{
                            width: width - 32,
                            height: 200,
                            borderRadius: 8,
                            marginVertical: 8,
                        }}
                        resizeMode="contain"
                        onError={(error) => {
                            console.log("Image loading error:", error);
                        }}
                    />
                );
            }
            return null;
        },
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
                <Text style={[styles.errorText, { color: themeColors.textPrimary }]}>
                    {error || "Không tìm thấy bài viết"}
                </Text>
                <TouchableOpacity onPress={retryFetch} style={styles.retryButton} accessibilityLabel="Thử lại">
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
                <TouchableOpacity
                    onPress={() => router.push("/blogs")}
                    style={styles.backButton}
                    accessibilityLabel="Quay lại danh sách bài viết"
                >
                    <ArrowLeft size={24} color={themeColors.textPrimary} />
                </TouchableOpacity>
                <View style={styles.actionButtons}>
                    <TouchableOpacity
                        onPress={toggleFavorite}
                        style={styles.actionButton}
                        accessibilityLabel={isFavorite ? "Bỏ yêu thích" : "Thêm vào yêu thích"}
                    >
                        <Star
                            size={24}
                            color={isFavorite ? themeColors.accent : themeColors.textSecondary}
                            fill={isFavorite ? themeColors.accent : "none"}
                        />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={handleShare}
                        style={styles.actionButton}
                        accessibilityLabel="Chia sẻ bài viết"
                    >
                        <ShareIcon size={24} color={themeColors.textSecondary} />
                    </TouchableOpacity>
                </View>
            </View>

            {blog.hinhAnh ? (
                <Image
                    source={{ uri: `data:image/jpeg;base64,${blog.hinhAnh}` }}
                    style={styles.blogImage}
                    resizeMode="cover"
                    accessibilityLabel={blog.moTaHinhAnh || blog.tieuDe}
                    onError={() => setBlog({ ...blog, hinhAnh: null })}
                />
            ) : (
                <View style={[styles.blogImage, styles.placeholderImage]}>
                    <Text style={styles.placeholderText}>Không có hình ảnh</Text>
                </View>
            )}

            <View style={styles.content}>
                <Text style={[styles.title, { color: themeColors.textPrimary }]}>{blog.tieuDe}</Text>
                <View style={styles.meta}>
                    <View style={styles.authorContainer}>
                        {nguoiDung?.hinhAnh ? (
                            <Image
                                source={{ uri: `data:image/jpeg;base64,${nguoiDung.hinhAnh}` }}
                                style={styles.authorAvatar}
                                accessibilityLabel={`Avatar của ${nguoiDung.hoTen}`}
                                onError={() => setNguoiDung({ ...nguoiDung!, hinhAnh: null })}
                            />
                        ) : (
                            <View style={[styles.authorAvatar, styles.placeholderAvatar]}>
                                <Text style={styles.placeholderText}>
                                    {nguoiDung?.hoTen?.charAt(0)?.toUpperCase() || "?"}
                                </Text>
                            </View>
                        )}
                        <Text style={[styles.author, { color: themeColors.textSecondary }]}>
                            {nguoiDung?.hoTen || blog.maNguoiDung}
                        </Text>
                    </View>
                    <Text style={[styles.date, { color: themeColors.textSecondary }]}>Ngày tạo: {formattedDate}</Text>
                </View>

                {htmlError ? (
                    <Text style={[styles.contentText, { color: themeColors.textPrimary }]}>
                        {convert(blog.noiDung, { wordwrap: 130 }) || "Nội dung không khả dụng"}
                    </Text>
                ) : (
                    <RenderHTML
                        contentWidth={width - 32}
                        source={htmlContent}
                        baseStyle={{
                            fontSize: 16,
                            lineHeight: 24,
                            color: themeColors.textPrimary,
                        }}
                        tagsStyles={{
                            p: {
                                fontSize: 16,
                                lineHeight: 24,
                                marginBottom: 8,
                                color: themeColors.textPrimary,
                            },
                            h1: {
                                fontSize: 24,
                                fontWeight: "bold",
                                marginVertical: 12,
                                color: themeColors.textPrimary,
                            },
                            h2: {
                                fontSize: 20,
                                fontWeight: "bold",
                                marginVertical: 10,
                                color: themeColors.textPrimary,
                            },
                            h3: {
                                fontSize: 18,
                                fontWeight: "bold",
                                marginVertical: 8,
                                color: themeColors.textPrimary,
                            },
                            h4: {
                                fontSize: 16,
                                fontWeight: "bold",
                                marginVertical: 6,
                                color: themeColors.textPrimary,
                            },
                            strong: {
                                fontWeight: "bold",
                                color: themeColors.textPrimary,
                            },
                            em: {
                                fontStyle: "italic",
                                color: themeColors.textPrimary,
                            },
                            ul: {
                                marginLeft: 16,
                                marginBottom: 8,
                            },
                            ol: {
                                marginLeft: 16,
                                marginBottom: 8,
                            },
                            li: {
                                marginBottom: 4,
                                color: themeColors.textPrimary,
                            },
                            a: {
                                color: themeColors.accent,
                                textDecorationLine: "underline",
                            },
                            blockquote: {
                                borderLeftWidth: 4,
                                borderLeftColor: themeColors.accent,
                                paddingLeft: 16,
                                marginVertical: 8,
                                fontStyle: "italic",
                                backgroundColor: isDarkMode ? "#2A2A2A" : "#F5F5F5",
                                padding: 12,
                                borderRadius: 4,
                            },
                            code: {
                                backgroundColor: isDarkMode ? "#2A2A2A" : "#F5F5F5",
                                padding: 4,
                                borderRadius: 4,
                                fontFamily: "monospace",
                                fontSize: 14,
                            },
                            pre: {
                                backgroundColor: isDarkMode ? "#2A2A2A" : "#F5F5F5",
                                padding: 12,
                                borderRadius: 8,
                                marginVertical: 8,
                            },
                            table: {
                                borderWidth: 1,
                                borderColor: themeColors.textSecondary,
                                borderRadius: 4,
                                marginVertical: 8,
                            },
                            th: {
                                backgroundColor: isDarkMode ? "#2A2A2A" : "#F5F5F5",
                                padding: 8,
                                fontWeight: "bold",
                                borderBottomWidth: 1,
                                borderBottomColor: themeColors.textSecondary,
                            },
                            td: {
                                padding: 8,
                                borderBottomWidth: 1,
                                borderBottomColor: themeColors.textSecondary,
                            },
                        }}
                        renderers={customRenderers}
                    />
                )}

                {blog.tags && blog.tags.length > 0 && (
                    <View style={styles.tagsContainer}>
                        <Text style={[styles.tagTitle, { color: themeColors.textPrimary }]}>Tags:</Text>
                        <View style={styles.tagsList}>
                            {blog.tags.map((tag, index) => (
                                <Text
                                    key={index}
                                    style={[
                                        styles.tag,
                                        {
                                            backgroundColor: isDarkMode ? "#4A5568" : "#E6E6FA",
                                            color: isDarkMode ? "#fff" : "#2D3748",
                                        },
                                    ]}
                                    accessibilityLabel={`Tag: ${tag}`}
                                >
                                    #{tag}
                                </Text>
                            ))}
                        </View>
                    </View>
                )}

                <View style={styles.divider} />

                <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>
                    Bình luận ({comments.length})
                </Text>

                <View style={styles.commentForm}>
                    <View style={[styles.inputWrapper, { borderColor: themeColors.textSecondary }]}>
                        <TextInput
                            style={[styles.commentInput, { color: themeColors.textPrimary }]}
                            placeholder="Nhập bình luận của bạn..."
                            placeholderTextColor={themeColors.textSecondary}
                            value={newComment}
                            onChangeText={setNewComment}
                            multiline
                            numberOfLines={4}
                            accessibilityLabel="Nhập bình luận"
                        />
                        <TouchableOpacity
                            style={[
                                styles.submitButton,
                                { backgroundColor: newComment.trim() ? themeColors.accent : themeColors.textSecondary },
                            ]}
                            onPress={handleAddComment}
                            disabled={!newComment.trim()}
                            accessibilityLabel="Gửi bình luận"
                        >
                            <Send size={20} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.commentsContainer}>
                    {comments.length === 0 ? (
                        <View style={styles.noCommentsContainer}>
                            <Text style={[styles.noComments, { color: themeColors.textSecondary }]}>
                                Chưa có bình luận nào. Hãy là người đầu tiên bình luận!
                            </Text>
                        </View>
                    ) : (
                        comments.map((comment) => (
                            <View
                                key={comment.maBinhLuan}
                                style={[
                                    styles.comment,
                                    {
                                        backgroundColor: isDarkMode ? "#2D3748" : "#F7FAFC",
                                        borderColor: isDarkMode ? "#4A5568" : "#E2E8F0",
                                    },
                                ]}
                            >
                                <View style={styles.commentHeader}>
                                    <View style={styles.commentAuthorContainer}>
                                        {comment.hinhAnh ? (
                                            <Image
                                                source={{ uri: `data:image/jpeg;base64,${comment.hinhAnh}` }}
                                                style={styles.commentAvatar}
                                                accessibilityLabel={`Avatar của ${comment.hoTen}`}
                                                onError={() =>
                                                    setComments((prev) =>
                                                        prev.map((c) =>
                                                            c.maBinhLuan === comment.maBinhLuan ? { ...c, hinhAnh: null } : c
                                                        )
                                                    )
                                                }
                                            />
                                        ) : (
                                            <View style={[styles.commentAvatar, styles.placeholderAvatar]}>
                                                <Text style={[styles.placeholderText, { color: "#fff" }]}>
                                                    {comment.hoTen?.charAt(0)?.toUpperCase() || "?"}
                                                </Text>
                                            </View>
                                        )}
                                        <View style={styles.commentInfo}>
                                            <Text style={[styles.commentAuthor, { color: themeColors.textPrimary }]}>
                                                {comment.hoTen}
                                            </Text>
                                            <Text style={[styles.commentDate, { color: themeColors.textSecondary }]}>
                                                {new Date(comment.ngayBinhLuan).toLocaleDateString("vi-VN", {
                                                    year: "numeric",
                                                    month: "short",
                                                    day: "numeric",
                                                })}
                                            </Text>
                                        </View>
                                    </View>
                                    {comment.maNguoiDung === userData?.maNguoiDung && (
                                        <TouchableOpacity
                                            onPress={() => handleDeleteComment(comment.maBinhLuan)}
                                            style={styles.deleteButton}
                                            accessibilityLabel={`Xóa bình luận của ${comment.hoTen}`}
                                        >
                                            <Trash2 size={18} color="#EF4444" />
                                        </TouchableOpacity>
                                    )}
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
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 16,
        paddingTop: 20,
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
        borderRadius: 0,
        marginBottom: 0,
    },
    placeholderImage: {
        backgroundColor: "#E6E6FA",
        justifyContent: "center",
        alignItems: "center",
    },
    content: {
        padding: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        marginBottom: 12,
        lineHeight: 32,
    },
    meta: {
        marginBottom: 20,
    },
    authorContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 8,
    },
    authorAvatar: {
        width: 28,
        height: 28,
        borderRadius: 14,
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
        fontWeight: "500",
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
        marginTop: 20,
        marginBottom: 16,
    },
    tagTitle: {
        fontSize: 14,
        fontWeight: "600",
        marginBottom: 8,
    },
    tagsList: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    tag: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        fontSize: 12,
        fontWeight: "500",
    },
    divider: {
        height: 1,
        backgroundColor: "#E2E8F0",
        marginVertical: 24,
    },
    loadingIndicator: {
        marginTop: 50,
    },
    errorText: {
        textAlign: "center",
        fontSize: 16,
        marginTop: 24,
        paddingHorizontal: 16,
    },
    retryButton: {
        padding: 12,
        marginTop: 12,
        alignSelf: "center",
    },
    retryText: {
        fontSize: 16,
        fontWeight: "600",
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
    submitButton: {
        padding: 12,
        borderRadius: 8,
        marginLeft: 8,
        alignItems: "center",
        justifyContent: "center",
    },
    commentsContainer: {
        marginBottom: 24,
    },
    noCommentsContainer: {
        alignItems: "center",
        padding: 16,
    },
    noComments: {
        fontSize: 14,
        textAlign: "center",
    },
    comment: {
        padding: 12,
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
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
    commentInfo: {
        flexDirection: "column",
    },
    commentAuthor: {
        fontSize: 14,
        fontWeight: "bold",
    },
    commentDate: {
        fontSize: 12,
    },
    commentText: {
        fontSize: 14,
        lineHeight: 20,
    },
    deleteButton: {
        padding: 4,
    },
});
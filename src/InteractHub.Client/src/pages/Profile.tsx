import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/axiosConfig";
import PostCard from "../components/PostCard";
import CommentModal from "../components/CommentModal";
import { jwtDecode } from "jwt-decode";
import Header from "../components/Header";
import { subscribeRealtimeEvent } from "../components/realtimeClient";
import {
  Calendar,
  Mail,
  FileText,
  Settings,
  UserPlus,
  UserCheck,
  UserMinus,
} from "lucide-react";
import type {
  CurrentUserSummary,
  PostItem,
  ProfileData,
} from "../components/types";

type JwtPayload = {
  sub?: string;
  nameid?: string;
};

type UserApiResponse = {
  id?: string;
  Id?: string;
  userName?: string;
  UserName?: string;
  fullName?: string;
  FullName?: string;
  avatarUrl?: string;
  AvatarUrl?: string;
  email?: string;
  Email?: string;
  phoneNumber?: string;
  PhoneNumber?: string;
  bio?: string;
  Bio?: string;
};

type FriendsRefreshEvent = {
  userId: string;
};

type PostInteractionEvent = {
  eventType: string;
  postId: number;
  likeCount: number;
  commentCount: number;
  commentId?: number | null;
  actorUserId?: string | null;
};

const mapCurrentUser = (data: UserApiResponse): CurrentUserSummary => ({
  id: data.id || data.Id || "",
  userName: data.userName || data.UserName || "",
  userFullName:
    data.fullName || data.FullName || data.userName || data.UserName || "",
  avatarUrl: data.avatarUrl || data.AvatarUrl || "",
  email: data.email || data.Email,
  phoneNumber: data.phoneNumber || data.PhoneNumber,
  bio: data.bio || data.Bio,
});

const Profile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [headerUser, setHeaderUser] = useState<CurrentUserSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<PostItem | null>(null);
  const [showFullAvatar, setShowFullAvatar] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showFriendMenu, setShowFriendMenu] = useState(false);

  const fetchProfile = async () => {
    if (!userId) return;

    try {
      const [profileRes, friendRes, postRes] = await Promise.all([
        api.get(`/users/profile/${userId}`),
        api.get("/Friends/list-and-requests"),
        api.get(`/Posts/userPosts/${userId}`),
      ]);

      const base = profileRes.data || {};
      const posts: PostItem[] = (postRes.data || []).map(
        (post: Record<string, unknown>) => ({
          id: Number(post.id),
          content: String(post.content || ""),
          imageUrl: (post.imageUrl as string | null | undefined) || null,
          createdAt: String(post.createdAt || ""),
          userId: String(post.userId || userId),
          userName: String(post.userName || base.userName || ""),
          userFullName:
            (post.userFullName as string | null | undefined) ||
            (base.fullName as string | null | undefined) ||
            null,
          fullName:
            (post.fullName as string | null | undefined) ||
            (base.fullName as string | null | undefined) ||
            null,
          avatarUrl:
            (post.avatarUrl as string | null | undefined) ||
            (base.avatarUrl as string | null | undefined) ||
            null,
          userAvatar:
            (post.userAvatar as string | null | undefined) ||
            (base.avatarUrl as string | null | undefined) ||
            null,
          likeCount: Number(post.likeCount ?? 0),
          commentCount: Number(post.commentCount ?? 0),
          hashtags: Array.isArray(post.hashtags)
            ? (post.hashtags as string[])
            : [],
          isLiked: Boolean(post.isLiked),
        }),
      );

      setProfile({
        id: String(base.id || base.Id || userId),
        userName: String(base.userName || base.UserName || ""),
        fullName:
          (base.fullName as string | null | undefined) ||
          (base.FullName as string | null | undefined) ||
          null,
        email:
          (base.email as string | null | undefined) ||
          (base.Email as string | null | undefined) ||
          null,
        phoneNumber:
          (base.phoneNumber as string | null | undefined) ||
          (base.PhoneNumber as string | null | undefined) ||
          null,
        friendStatus: Number(base.friendStatus ?? 0),
        bio:
          (base.bio as string | null | undefined) ||
          (base.Bio as string | null | undefined) ||
          null,
        avatarUrl:
          (base.avatarUrl as string | null | undefined) ||
          (base.AvatarUrl as string | null | undefined) ||
          null,
        joinedAt:
          (base.joinedAt as string | undefined) ||
          (base.JoinedAt as string | undefined) ||
          (base.createdAt as string | undefined),
        friendCount: friendRes.data?.friends?.length ?? 0,
        postCount: posts.length,
        posts,
      });
    } catch (err) {
      console.error("Lỗi lấy profile:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHeaderUser = async () => {
    try {
      const res = await api.get("/users/me");
      setHeaderUser(mapCurrentUser(res.data as UserApiResponse));
    } catch (err) {
      console.error("Lỗi lấy current user cho header:", err);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded = jwtDecode<JwtPayload>(token);
        setCurrentUserId(decoded.sub || decoded.nameid || null);
      } catch {
        console.error("Token error");
      }
    }
    void fetchHeaderUser();
    void fetchProfile();
  }, [userId]);

  useEffect(() => {
    let unsubscribeRefresh: (() => void) | undefined;
    let unsubscribeInteraction: (() => void) | undefined;
    let cancelled = false;

    const setupRealtime = async () => {
      unsubscribeRefresh = await subscribeRealtimeEvent<FriendsRefreshEvent>(
        "friends:refresh",
        () => {
          void fetchProfile();
        },
      );

      unsubscribeInteraction =
        await subscribeRealtimeEvent<PostInteractionEvent>(
          "post:interaction",
          (payload) => {
            if (!payload?.postId) return;

            setProfile((prev) =>
              prev
                ? {
                    ...prev,
                    posts: prev.posts.map((post) =>
                      post.id === payload.postId
                        ? {
                            ...post,
                            likeCount: payload.likeCount,
                            commentCount: payload.commentCount,
                          }
                        : post,
                    ),
                  }
                : prev,
            );

            setSelectedPost((prev) =>
              prev && prev.id === payload.postId
                ? {
                    ...prev,
                    likeCount: payload.likeCount,
                    commentCount: payload.commentCount,
                  }
                : prev,
            );
          },
        );

      if (cancelled) {
        unsubscribeRefresh?.();
        unsubscribeInteraction?.();
      }
    };

    void setupRealtime();

    return () => {
      cancelled = true;
      unsubscribeRefresh?.();
      unsubscribeInteraction?.();
    };
  }, [userId]);

  const handleFriendAction = async (
    action: string,
    targetId: string | null,
  ) => {
    if (actionLoading || !targetId) return;
    setActionLoading(true);
    try {
      const res = await api.post(`/friends/${action}/${targetId}`);
      if (res.status === 200 || res.status === 204) {
        setShowFriendMenu(false);
        await fetchProfile();
      }
    } catch {
      alert("Thao tác thất bại!");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
        <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
        <p className="animate-pulse font-black tracking-widest text-blue-600">
          INTERACTHUB IS LOADING...
        </p>
      </div>
    );
  }

  const profilePosts = profile?.posts ?? [];

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20">
      <Header
        currentUserId={currentUserId}
        userName={headerUser?.userFullName || headerUser?.userName}
        avatarUrl={headerUser?.avatarUrl}
      />

      <div className="relative">
        <div className="relative h-60 overflow-hidden bg-gradient-to-br from-indigo-500 via-blue-500 to-purple-600 md:h-96">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="absolute -bottom-1 left-0 right-0 h-24 bg-gradient-to-t from-[#F8FAFC] to-transparent"></div>
        </div>

        <div className="mx-auto max-w-5xl px-4">
          <div className="relative -mt-24 flex flex-col items-center text-center md:-mt-32">
            <div
              onClick={() => profile?.avatarUrl && setShowFullAvatar(true)}
              className="group relative z-10 h-32 w-32 cursor-pointer rounded-[40px] bg-white p-1.5 shadow-2xl transition-transform hover:scale-105 md:h-48 md:w-48"
            >
              {profile?.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt="Avatar"
                  className="h-full w-full rounded-[34px] object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center rounded-[34px] bg-indigo-600 text-6xl font-black text-white">
                  {profile?.userName?.[0]?.toUpperCase() || "U"}
                </div>
              )}
            </div>

            <div className="mt-6 space-y-2">
              <h1 className="text-3xl font-black tracking-tight text-gray-900 md:text-5xl">
                {profile?.fullName || profile?.userName}
              </h1>
              <p className="mx-auto max-w-lg text-lg font-medium leading-relaxed text-gray-500">
                {profile?.bio || "Chào mừng bạn đến với không gian của Duy! 👋"}
              </p>

              <div className="flex items-center justify-center gap-8 py-4">
                <div className="text-center">
                  <p className="text-xl font-black text-gray-900">
                    {profile?.postCount || 0}
                  </p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                    Bài viết
                  </p>
                </div>
                <div className="h-8 w-px bg-gray-200"></div>
                <div className="text-center">
                  <p className="text-xl font-black text-gray-900">
                    {profile?.friendCount || 0}
                  </p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                    Bạn bè
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4">
              {userId === currentUserId ? (
                <button
                  onClick={() => navigate("/edit-profile")}
                  className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-8 py-3 font-bold text-gray-800 shadow-sm transition hover:bg-gray-50 active:scale-95"
                >
                  <Settings size={18} />
                  Thiết lập trang cá nhân
                </button>
              ) : (
                <div className="flex gap-3">
                  {profile?.friendStatus === 0 && (
                    <button
                      onClick={() =>
                        handleFriendAction("send", userId as string)
                      }
                      className="flex items-center gap-2 rounded-2xl bg-blue-600 px-10 py-3 font-bold text-white shadow-xl shadow-blue-200 transition hover:bg-blue-700 active:scale-95"
                    >
                      <UserPlus size={20} /> Kết bạn
                    </button>
                  )}
                  {profile?.friendStatus === 1 && (
                    <button
                      onClick={() =>
                        handleFriendAction("reject", userId as string)
                      }
                      className="rounded-2xl border border-gray-300 bg-gray-200 px-8 py-3 font-bold text-gray-600 transition hover:bg-red-50 hover:text-red-600"
                    >
                      Hủy yêu cầu
                    </button>
                  )}
                  {profile?.friendStatus === 2 && (
                    <div className="flex gap-3">
                      <button
                        onClick={() =>
                          handleFriendAction("accept", userId as string)
                        }
                        className="rounded-2xl bg-blue-600 px-8 py-3 font-bold text-white shadow-lg shadow-blue-100 transition hover:bg-blue-700"
                      >
                        Chấp nhận
                      </button>
                      <button
                        onClick={() =>
                          handleFriendAction("reject", userId as string)
                        }
                        className="rounded-2xl bg-gray-100 px-8 py-3 font-bold text-gray-600 transition"
                      >
                        Xóa
                      </button>
                    </div>
                  )}
                  {profile?.friendStatus === 3 && (
                    <div className="relative">
                      <button
                        onClick={() => setShowFriendMenu(!showFriendMenu)}
                        className="flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-8 py-3 font-bold text-emerald-700 transition active:scale-95"
                      >
                        <UserCheck size={20} /> <span>Bạn bè</span>
                      </button>
                      {showFriendMenu && (
                        <div className="animate-in slide-in-from-top-2 absolute right-0 z-20 mt-2 w-48 rounded-2xl border border-gray-100 bg-white py-2 shadow-2xl fade-in duration-200">
                          <button
                            onClick={() => {
                              if (window.confirm("Xóa bạn bè nhé Duy?")) {
                                handleFriendAction("reject", userId as string);
                              }
                            }}
                            className="flex w-full items-center gap-3 px-5 py-3 text-left text-sm font-bold text-red-500 transition hover:bg-red-50"
                          >
                            <UserMinus size={18} /> Hủy kết bạn
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-12 grid max-w-5xl grid-cols-1 gap-8 px-4 md:grid-cols-12">
        <div className="space-y-6 md:col-span-4">
          <div className="rounded-[32px] border border-gray-100 bg-white p-6 shadow-sm">
            <h3 className="mb-6 flex items-center gap-2 text-lg font-black text-gray-900">
              <span className="h-6 w-2 rounded-full bg-blue-600"></span>
              Thông tin
            </h3>
            <div className="space-y-5">
              <div className="flex items-center gap-4 text-gray-600">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <FileText size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                    Bài viết
                  </p>
                  <p className="font-bold text-gray-900">
                    {profile?.postCount || 0} bài đăng
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-gray-600">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Mail size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                    Liên hệ
                  </p>
                  <p className="max-w-[180px] truncate font-bold text-gray-900">
                    {profile?.email || "N/A"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-gray-600">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                  <Calendar size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                    Ngày tham gia
                  </p>
                  <p className="font-bold text-gray-900">
                    {new Date(
                      profile?.joinedAt || Date.now(),
                    ).toLocaleDateString("vi-VN")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8 md:col-span-8">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xl font-black text-gray-900">Hoạt động</h3>
            <div className="mx-6 h-px flex-1 bg-gray-100"></div>
          </div>

          {profilePosts.length > 0 ? (
            profilePosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUserId={currentUserId}
                onDelete={() => {
                  setProfile((prev) =>
                    prev
                      ? {
                          ...prev,
                          posts: prev.posts.filter((p) => p.id !== post.id),
                          postCount: Math.max(0, prev.postCount - 1),
                        }
                      : prev,
                  );
                }}
                onLike={(isLiked, count) => {
                  setProfile((prev) =>
                    prev
                      ? {
                          ...prev,
                          posts: prev.posts.map((p) =>
                            p.id === post.id
                              ? { ...p, isLiked, likeCount: count }
                              : p,
                          ),
                        }
                      : prev,
                  );
                  setSelectedPost((prev) =>
                    prev && prev.id === post.id
                      ? { ...prev, isLiked, likeCount: count }
                      : prev,
                  );
                }}
                onOpenComments={() => setSelectedPost(post)}
              />
            ))
          ) : (
            <div className="rounded-[40px] border-2 border-dashed border-gray-100 bg-white py-20 text-center">
              <p className="font-bold text-gray-400">
                Chưa có bài viết nào ở đây cả Duy ơi! 🏝️
              </p>
            </div>
          )}
        </div>
      </div>

      {selectedPost && (
        <CommentModal
          post={selectedPost}
          currentUserId={currentUserId}
          onClose={() => setSelectedPost(null)}
          onUpdateCount={(newCount) => {
            setProfile((prev) =>
              prev
                ? {
                    ...prev,
                    posts: prev.posts.map((p) =>
                      p.id === selectedPost.id
                        ? { ...p, commentCount: newCount }
                        : p,
                    ),
                  }
                : prev,
            );
            setSelectedPost((prev) =>
              prev ? { ...prev, commentCount: newCount } : prev,
            );
          }}
        />
      )}

      {showFullAvatar && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md"
          onClick={() => setShowFullAvatar(false)}
        >
          <img
            src={profile?.avatarUrl || ""}
            className="max-h-[85vh] max-w-full animate-in rounded-[40px] shadow-2xl zoom-in duration-300"
            alt="Full"
          />
        </div>
      )}
    </div>
  );
};

export default Profile;

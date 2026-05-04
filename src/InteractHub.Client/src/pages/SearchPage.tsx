import Header from "../components/Header";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import PostCard from "../components/PostCard";
import CommentModal from "../components/CommentModal";
import { SearchResultsSkeleton } from "../components/PageSkeletons";
import { useAuth } from "../context/AuthContext";
import { useDebounce } from "../hooks/useDebounce";
import { searchPosts } from "../utils/postService";
import { fetchCurrentUser } from "../utils/userService";
import type { CurrentUserSummary, PostItem } from "../components/types";

interface SearchUser {
  id: string | number;
  userName: string;
  fullName?: string | null;
  avatarUrl?: string | null;
  bio?: string;
}

interface SearchResults {
  users: SearchUser[];
  posts: PostItem[];
  hashtags: string[];
}

type PageMode = "post" | "user" | "hashtag" | "full";
type SearchPostApi = Partial<PostItem> & {
  authorName?: string;
};

type SearchUserApi = Partial<SearchUser>;

const AVATAR_COLORS = [
  "bg-indigo-600",
  "bg-blue-500",
  "bg-violet-500",
  "bg-emerald-500",
  "bg-rose-500",
  "bg-amber-500",
];

const mapSearchPost = (p: SearchPostApi): PostItem => ({
  id: Number(p.id || 0),
  content: String(p.content || ""),
  imageUrl: p.imageUrl || null,
  createdAt: String(p.createdAt || ""),
  userId: String(p.userId || ""),
  userName: String(p.userName || p.authorName || "?"),
  userFullName: p.userFullName || p.fullName || p.authorName || null,
  fullName: p.fullName || p.userFullName || p.authorName || null,
  avatarUrl: p.avatarUrl || null,
  userAvatar: p.userAvatar || p.avatarUrl || null,
  likeCount: Number(p.likeCount ?? 0),
  commentCount: Number(p.commentCount ?? 0),
  hashtags: Array.isArray(p.hashtags) ? p.hashtags : [],
  isLiked: Boolean(p.isLiked),
});

const mapSearchUser = (u: SearchUserApi): SearchUser => ({
  id: String(u.id || ""),
  userName: String(u.userName || ""),
  fullName: u.fullName || null,
  avatarUrl: u.avatarUrl || null,
  bio: u.bio,
});

const Avatar: React.FC<{
  name: string;
  avatarUrl?: string | null;
  size?: "md" | "lg";
}> = ({ name, avatarUrl, size = "md" }) => {
  const safeName = name || "U";
  const color = AVATAR_COLORS[safeName.charCodeAt(0) % AVATAR_COLORS.length];
  const dim = size === "lg" ? "w-14 h-14 text-xl" : "w-10 h-10 text-base";

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={safeName}
        className={`${dim} rounded-full object-cover flex-shrink-0`}
      />
    );
  }

  return (
    <div
      className={`${dim} ${color} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0`}
    >
      {safeName[0]?.toUpperCase()}
    </div>
  );
};

const SectionLabel: React.FC<{
  icon: string;
  label: string;
  accent?: boolean;
}> = ({ icon, label, accent }) => (
  <div className="mb-4 flex items-center gap-2">
    <span className="text-sm">{icon}</span>
    <span
      className={`text-[10px] font-black tracking-[0.2em] uppercase ${
        accent ? "text-indigo-500" : "text-gray-400"
      }`}
    >
      {label}
    </span>
  </div>
);

const UserCard: React.FC<{
  user: SearchUser;
  priority?: boolean;
  onClick: () => void;
}> = ({ user, priority, onClick }) => {
  const displayName = user.fullName || user.userName;
  return (
    <div
      onClick={onClick}
      className={`flex cursor-pointer items-center gap-4 rounded-2xl border p-4 transition-all hover:shadow-md ${
        priority
          ? "border-indigo-200 bg-indigo-50 shadow-sm"
          : "border-gray-100 bg-white hover:border-indigo-200"
      }`}
    >
      <Avatar
        name={displayName}
        avatarUrl={user.avatarUrl}
        size={priority ? "lg" : "md"}
      />
      <div className="min-w-0">
        <p className="truncate font-bold text-gray-800">{displayName}</p>
        {user.bio && (
          <p className="mt-0.5 truncate text-xs text-gray-500">{user.bio}</p>
        )}
        <p className="mt-1 text-[10px] font-bold uppercase text-indigo-500">
          Trang cá nhân
        </p>
      </div>
      {priority && (
        <span className="ml-auto flex-shrink-0 rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-black text-white">
          Đã chọn
        </span>
      )}
    </div>
  );
};

const HashtagBadge: React.FC<{ tag: string; large?: boolean }> = ({
  tag,
  large,
}) => (
  <span
    className={`inline-flex cursor-pointer items-center rounded-full bg-gray-100 font-bold text-gray-700 transition-colors hover:bg-indigo-600 hover:text-white ${
      large ? "px-4 py-2 text-sm" : "px-3 py-1.5 text-xs"
    }`}
  >
    #{tag}
  </span>
);

const VipPostWrapper: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <div className="mb-10">
    <div className="ml-4 mb-[-6px] flex items-center">
      <span className="rounded-t-lg bg-yellow-500 px-3 py-0.5 text-[10px] font-black text-white shadow-sm">
        ⭐ NỘI DUNG BẠN CHỌN
      </span>
    </div>
    <div className="overflow-hidden rounded-2xl border-2 border-yellow-400 bg-white shadow-xl shadow-yellow-100">
      {children}
    </div>
  </div>
);

const EmptyState: React.FC<{ query: string }> = ({ query }) => (
  <div className="flex flex-col items-center justify-center gap-3 rounded-[32px] border-2 border-dashed border-gray-100 bg-white py-24">
    <span className="text-5xl">🔍</span>
    <p className="font-bold text-gray-500">Không tìm thấy kết quả nào</p>
    <p className="text-sm text-gray-400">Không có gì khớp với “{query}”</p>
  </div>
);

const SearchPage: React.FC = () => {
  const { currentUserId } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const query = searchParams.get("q") || "";
  const priorityId = searchParams.get("priorityId") || null;
  const priorityUserId = searchParams.get("priorityUserId") || null;
  const debouncedQuery = useDebounce(query, 400);

  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [headerUser, setHeaderUser] = useState<CurrentUserSummary | null>(null);
  const [selectedPost, setSelectedPost] = useState<PostItem | null>(null);

  const isHashtagQuery = debouncedQuery.startsWith("#");
  const cleanTag = isHashtagQuery
    ? debouncedQuery.substring(1).toLowerCase()
    : debouncedQuery.toLowerCase();

  const mode: PageMode = priorityId
    ? "post"
    : priorityUserId
      ? "user"
      : isHashtagQuery
        ? "hashtag"
        : "full";

  useEffect(() => {
    const loadHeaderUser = async () => {
      try {
        setHeaderUser(await fetchCurrentUser());
      } catch (err) {
        console.error("SearchPage current user error:", err);
      }
    };
    void loadHeaderUser();
  }, []);

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults(null);
      setLoading(false);
      return;
    }

    const fetchResults = async () => {
      setLoading(true);
      try {
        const res = await searchPosts(
          debouncedQuery,
          priorityId,
          priorityUserId,
        );
        setResults({
          users: Array.isArray(res.users)
            ? (res.users as SearchUserApi[]).map(mapSearchUser)
            : [],
          posts: Array.isArray(res.posts)
            ? (res.posts as SearchPostApi[]).map(mapSearchPost)
            : [],
          hashtags: Array.isArray(res.hashtags) ? res.hashtags : [],
        });
      } catch (err) {
        console.error("SearchPage fetch error:", err);
        setResults({ users: [], posts: [], hashtags: [] });
      } finally {
        setLoading(false);
      }
    };

    void fetchResults();
  }, [debouncedQuery, priorityId, priorityUserId]);

  const handleLike = useCallback(
    (postId: number, isLiked: boolean, count: number) => {
      setResults((prev) =>
        prev
          ? {
              ...prev,
              posts: prev.posts.map((p) =>
                p.id === postId ? { ...p, isLiked, likeCount: count } : p,
              ),
            }
          : prev,
      );
    },
    [],
  );

  const handleDelete = useCallback((postId: number) => {
    setResults((prev) =>
      prev
        ? { ...prev, posts: prev.posts.filter((p) => p.id !== postId) }
        : prev,
    );
  }, []);

  const handleUpdateCommentCount = useCallback(
    (postId: number, newCount: number) => {
      setResults((prev) =>
        prev
          ? {
              ...prev,
              posts: prev.posts.map((p) =>
                p.id === postId ? { ...p, commentCount: newCount } : p,
              ),
            }
          : prev,
      );
    },
    [],
  );

  const allPosts = results?.posts ?? [];
  const allUsers = results?.users ?? [];
  const allHashtags = results?.hashtags ?? [];

  const vipPost = useMemo(
    () =>
      mode === "post"
        ? allPosts.find((p) => p.id.toString() === priorityId)
        : undefined,
    [allPosts, mode, priorityId],
  );
  const vipUser = useMemo(
    () =>
      mode === "user"
        ? allUsers.find((u) => u.id.toString() === priorityUserId)
        : undefined,
    [allUsers, mode, priorityUserId],
  );

  const hashtagMatchPosts = allPosts.filter((p) =>
    p.hashtags.some((h: string) => h.toLowerCase() === cleanTag),
  );

  const otherPostsExcludingVip = allPosts.filter(
    (p) => p.id.toString() !== priorityId,
  );
  const hashtagPosts = otherPostsExcludingVip.filter((p) =>
    p.hashtags.some((h: string) => h.toLowerCase() === cleanTag),
  );
  const remainingPosts = otherPostsExcludingVip.filter(
    (p) => !hashtagPosts.some((hp) => hp.id === p.id),
  );
  const otherUsers = allUsers.filter((u) => u.id.toString() !== priorityUserId);

  const renderPostCard = (post: PostItem, key?: string | number) => (
    <PostCard
      key={key ?? post.id}
      post={post}
      currentUserId={currentUserId}
      onOpenComments={() => setSelectedPost(post)}
      onDelete={() => handleDelete(post.id)}
      onLike={(isLiked, count) => handleLike(post.id, isLiked, count)}
    />
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <Header
        currentUserId={currentUserId}
        userName={headerUser?.userFullName || headerUser?.userName}
        avatarUrl={headerUser?.avatarUrl}
      />
      <div className="mx-auto max-w-2xl px-4">
        <div className="mb-8">
          <p className="-mt-2 px-1 text-sm text-gray-400">
            Kết quả cho:{" "}
            <span className="font-bold italic text-indigo-600">“{query}”</span>
            {query !== debouncedQuery && (
              <span className="ml-2 text-xs text-indigo-400">
                đang cập nhật...
              </span>
            )}
            {mode !== "full" && debouncedQuery.trim() && (
              <span className="ml-2 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-black uppercase text-indigo-600">
                {mode === "post" && "Bài viết được chọn"}
                {mode === "user" && "Người dùng được chọn"}
                {mode === "hashtag" && `#${cleanTag}`}
              </span>
            )}
          </p>
        </div>

        {loading && <SearchResultsSkeleton />}

        {!loading && results && (
          <>
            {mode === "post" && (
              <>
                {vipPost && (
                  <VipPostWrapper>
                    {renderPostCard(vipPost, `vip-${vipPost.id}`)}
                  </VipPostWrapper>
                )}

                {hashtagPosts.length > 0 && (
                  <div className="mb-10 space-y-5">
                    <SectionLabel
                      icon="🔥"
                      label={`Bài viết gắn thẻ #${cleanTag}`}
                      accent
                    />
                    {hashtagPosts.map((p) => renderPostCard(p))}
                  </div>
                )}

                {allUsers.length > 0 && (
                  <div className="mb-10">
                    <SectionLabel icon="👤" label="Người dùng liên quan" />
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {allUsers.map((u) => (
                        <UserCard
                          key={u.id}
                          user={u}
                          onClick={() => navigate(`/profile/${u.id}`)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {remainingPosts.length > 0 && (
                  <div className="space-y-5">
                    <SectionLabel icon="📖" label="Khám phá thêm" />
                    {remainingPosts.map((p) => renderPostCard(p))}
                  </div>
                )}

                {allHashtags.length > 0 && (
                  <div className="mt-10">
                    <SectionLabel icon="🏷️" label="Hashtag liên quan" />
                    <div className="flex flex-wrap gap-2">
                      {allHashtags.map((tag) => (
                        <HashtagBadge key={tag} tag={tag} />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {mode === "user" && (
              <>
                {vipUser && (
                  <div className="mb-10">
                    <div className="ml-4 mb-[-6px] flex items-center">
                      <span className="rounded-t-lg bg-indigo-600 px-3 py-0.5 text-[10px] font-black text-white shadow-sm">
                        👤 NGƯỜI DÙNG BẠN CHỌN
                      </span>
                    </div>
                    <div className="overflow-hidden rounded-2xl border-2 border-indigo-400 shadow-xl shadow-indigo-100">
                      <UserCard
                        user={vipUser}
                        priority
                        onClick={() => navigate(`/profile/${vipUser.id}`)}
                      />
                    </div>
                  </div>
                )}

                {otherUsers.length > 0 && (
                  <div className="mb-10">
                    <SectionLabel icon="👥" label="Người dùng liên quan" />
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {otherUsers.map((u) => (
                        <UserCard
                          key={u.id}
                          user={u}
                          onClick={() => navigate(`/profile/${u.id}`)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {allHashtags.length > 0 && (
                  <div className="mb-10">
                    <SectionLabel icon="🔥" label="Hashtag liên quan" />
                    <div className="flex flex-wrap gap-2">
                      {allHashtags.map((tag) => (
                        <HashtagBadge key={tag} tag={tag} />
                      ))}
                    </div>
                  </div>
                )}

                {allPosts.length > 0 && (
                  <div className="space-y-5">
                    <SectionLabel icon="📝" label="Bài viết liên quan" />
                    {allPosts.map((p) => renderPostCard(p))}
                  </div>
                )}
              </>
            )}

            {mode === "hashtag" && (
              <>
                <div className="mb-10 flex items-center gap-3">
                  <span className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-5 py-2.5 text-base font-black text-white shadow-lg shadow-indigo-200">
                    🔥 #{cleanTag}
                  </span>
                  {allHashtags.length > 1 && (
                    <div className="flex flex-wrap gap-2">
                      {allHashtags
                        .filter((t) => t.toLowerCase() !== cleanTag)
                        .map((t) => (
                          <HashtagBadge key={t} tag={t} />
                        ))}
                    </div>
                  )}
                </div>

                {hashtagMatchPosts.length > 0 && (
                  <div className="mb-10 space-y-5">
                    <SectionLabel
                      icon="📝"
                      label={`Bài viết với #${cleanTag}`}
                      accent
                    />
                    {hashtagMatchPosts.map((p) => renderPostCard(p))}
                  </div>
                )}

                {allPosts.filter(
                  (p) => !hashtagMatchPosts.some((hp) => hp.id === p.id),
                ).length > 0 && (
                  <div className="mb-10 space-y-5">
                    <SectionLabel icon="📖" label="Bài viết liên quan" />
                    {allPosts
                      .filter(
                        (p) => !hashtagMatchPosts.some((hp) => hp.id === p.id),
                      )
                      .map((p) => renderPostCard(p))}
                  </div>
                )}

                {allUsers.length > 0 && (
                  <div className="mb-10">
                    <SectionLabel icon="👤" label="Người dùng liên quan" />
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {allUsers.map((u) => (
                        <UserCard
                          key={u.id}
                          user={u}
                          onClick={() => navigate(`/profile/${u.id}`)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {mode === "full" && (
              <>
                {allUsers.length > 0 && (
                  <div className="mb-10">
                    <SectionLabel icon="👤" label="Người dùng" />
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {allUsers.map((u) => (
                        <UserCard
                          key={u.id}
                          user={u}
                          onClick={() => navigate(`/profile/${u.id}`)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {allHashtags.length > 0 && (
                  <div className="mb-10">
                    <SectionLabel icon="🔥" label="Hashtag" />
                    <div className="flex flex-wrap gap-2">
                      {allHashtags.map((tag) => (
                        <HashtagBadge key={tag} tag={tag} large />
                      ))}
                    </div>
                  </div>
                )}

                {vipPost && (
                  <VipPostWrapper>
                    {renderPostCard(vipPost, `vip-${vipPost.id}`)}
                  </VipPostWrapper>
                )}

                {hashtagPosts.length > 0 && (
                  <div className="mb-10 space-y-5">
                    <SectionLabel
                      icon="🔥"
                      label={`Bài viết gắn thẻ #${cleanTag}`}
                      accent
                    />
                    {hashtagPosts.map((p) => renderPostCard(p))}
                  </div>
                )}

                {remainingPosts.length > 0 && (
                  <div className="space-y-5">
                    <SectionLabel icon="📝" label="Bài viết" />
                    {remainingPosts.map((p) => renderPostCard(p))}
                  </div>
                )}
              </>
            )}

            {allUsers.length === 0 &&
              allPosts.length === 0 &&
              allHashtags.length === 0 && <EmptyState query={debouncedQuery} />}
          </>
        )}

        {!loading && !results && query.trim() === "" && (
          <div className="flex flex-col items-center gap-3 py-20 text-gray-400">
            <span className="text-5xl">🔍</span>
            <p className="text-sm font-semibold">
              Nhập từ khóa để bắt đầu tìm kiếm
            </p>
          </div>
        )}
      </div>

      {selectedPost && (
        <CommentModal
          post={selectedPost}
          currentUserId={currentUserId}
          onClose={() => setSelectedPost(null)}
          onUpdateCount={(newCount) => {
            handleUpdateCommentCount(selectedPost.id, newCount);
            setSelectedPost((prev) =>
              prev ? { ...prev, commentCount: newCount } : prev,
            );
          }}
        />
      )}
    </div>
  );
};

export default SearchPage;

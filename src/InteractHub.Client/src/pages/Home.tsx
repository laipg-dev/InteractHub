import { useEffect, useMemo, useState } from "react";
import { Layout, Users, Bell, User } from "lucide-react";
import PostCard from "../components/PostCard";
import StoryBar from "../components/StoryBar";
import StoryViewer from "../components/StoryViewer";
import CreatePostCard from "../components/CreatePostCard";
import CommentModal from "../components/CommentModal";
import Header from "../components/Header";
import { FeedSkeleton } from "../components/PageSkeletons";
import { subscribeRealtimeEvent } from "../components/realtimeClient";
import { useNavigate, useSearchParams } from "react-router-dom";
import FriendsManager from "../components/FriendsManager";
import NotificationsManager from "../components/NotificationsManager";
import { useAuth } from "../context/AuthContext";
import {
  createStory,
  fetchFeedPosts,
  fetchPostDetail,
  fetchStories as fetchStoryGroups,
  fetchTrendingHashtags,
} from "../utils/postService";
import {
  fetchCurrentUser,
  fetchFriendSidebarData,
  sendFriendAction,
} from "../utils/userService";
import type {
  CurrentUserSummary,
  FriendRequestItem,
  PostItem,
  StoryGroup,
} from "../components/types";

type HomeView = "feed" | "friends" | "notifications";
type PostInteractionEvent = {
  eventType: string;
  postId: number;
  likeCount: number;
  commentCount: number;
  commentId?: number | null;
  actorUserId?: string | null;
};
type StoryCreatedEvent = {
  senderId: string;
  storyId: number;
};
type PostCreatedEvent = {
  senderId: string;
  postId: number;
};
type FriendsRefreshEvent = {
  userId: string;
};

const POSTS_PER_PAGE = 5;

const Home = () => {
  const { currentUserId } = useAuth();
  const [userData, setUserData] = useState<CurrentUserSummary | null>(null);
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [stories, setStories] = useState<StoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedPost, setSelectedPost] = useState<PostItem | null>(null);
  const [selectedStoryGroup, setSelectedStoryGroup] =
    useState<StoryGroup | null>(null);
  const [trendingTags, setTrendingTags] = useState<string[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequestItem[]>([]);
  const [openUploadModal, setOpenUploadModal] = useState(false);
  const [selectedStoryFile, setSelectedStoryFile] = useState<File | null>(null);
  const [uploadingStory, setUploadingStory] = useState(false);
  const [view, setView] = useState<HomeView>("feed");
  const [visiblePostCount, setVisiblePostCount] = useState(POSTS_PER_PAGE);

  const handleViewChange = (nextView: HomeView) => {
    setView(nextView);
    if (nextView === "feed") {
      setSearchParams({});
      return;
    }
    setSearchParams({ view: nextView });
  };

  const fetchPosts = async () => {
    const nextPosts = await fetchFeedPosts();
    setPosts(nextPosts);
    setVisiblePostCount(POSTS_PER_PAGE);
  };

  const fetchStories = async () => {
    try {
      setStories(await fetchStoryGroups());
    } catch {
      console.error("Lỗi tải danh sách story");
    }
  };

  const handleCreateStory = async () => {
    if (!selectedStoryFile) return;
    try {
      setUploadingStory(true);
      await createStory(selectedStoryFile);
      setOpenUploadModal(false);
      setSelectedStoryFile(null);
      void fetchStories();
      alert("Đăng Story thành công rồi Tuấn nhé!");
    } catch (error) {
      console.error(error);
      alert("Đăng story thất bại.");
    } finally {
      setUploadingStory(false);
    }
  };

  const fetchSidebarData = async () => {
    try {
      const [tags, requests, mappedUser] = await Promise.all([
        fetchTrendingHashtags(),
        fetchFriendSidebarData(),
        fetchCurrentUser(),
      ]);

      setTrendingTags(tags);
      setFriendRequests(requests);
      setUserData(mappedUser);
    } catch (error) {
      console.error("Duy ơi, lỗi load Sidebar rồi:", error);
    }
  };

  const fetchInitialData = async () => {
    try {
      console.log(
        "[HOME] Fetching initial data, currentUserId:",
        currentUserId,
      );
      await Promise.all([fetchPosts(), fetchStories()]);
    } catch {
      console.error("Lỗi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!currentUserId) {
      console.log("[HOME] Waiting for currentUserId...");
      return;
    }
    console.log("[HOME] currentUserId available, fetching initial data");
    void fetchInitialData();
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId) {
      console.log("[HOME] Waiting for currentUserId before sidebar...");
      return;
    }
    console.log("[HOME] currentUserId available, fetching sidebar data");
    void fetchSidebarData();
  }, [currentUserId]);

  useEffect(() => {
    let unsubscribeInteraction: (() => void) | undefined;
    let unsubscribeStory: (() => void) | undefined;
    let unsubscribePostCreated: (() => void) | undefined;
    let unsubscribeFriendsRefresh: (() => void) | undefined;
    let cancelled = false;

    const setupRealtime = async () => {
      unsubscribeInteraction =
        await subscribeRealtimeEvent<PostInteractionEvent>(
          "post:interaction",
          (payload) => {
            if (!payload?.postId) return;

            if (payload.eventType === "admin_post_removed") {
              setPosts((prev) =>
                prev.filter((post) => post.id !== payload.postId),
              );
              setSelectedPost((prev) =>
                prev && prev.id === payload.postId ? null : prev,
              );
              return;
            }

            if (
              payload.eventType === "admin_post_restored" ||
              payload.eventType === "admin_post_updated"
            ) {
              void fetchPosts();
              if (selectedPost?.id === payload.postId) {
                void fetchPostDetail(payload.postId)
                  .then((nextPost) => {
                    setSelectedPost(nextPost);
                  })
                  .catch(() => {
                    setSelectedPost(null);
                  });
              }
              return;
            }

            setPosts((prev) =>
              prev.map((post) =>
                post.id === payload.postId
                  ? {
                      ...post,
                      likeCount: payload.likeCount,
                      commentCount: payload.commentCount,
                    }
                  : post,
              ),
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
      unsubscribeStory = await subscribeRealtimeEvent<StoryCreatedEvent>(
        "story:new",
        () => {
          void fetchStories();
        },
      );

      unsubscribePostCreated = await subscribeRealtimeEvent<PostCreatedEvent>(
        "feed:post_created",
        () => {
          void fetchPosts();
        },
      );

      unsubscribeFriendsRefresh =
        await subscribeRealtimeEvent<FriendsRefreshEvent>(
          "friends:refresh",
          () => {
            void fetchSidebarData();
          },
        );

      if (cancelled) {
        unsubscribeInteraction?.();
        unsubscribeStory?.();
        unsubscribePostCreated?.();
        unsubscribeFriendsRefresh?.();
      }
    };

    void setupRealtime();

    return () => {
      cancelled = true;
      unsubscribeInteraction?.();
      unsubscribeStory?.();
      unsubscribePostCreated?.();
      unsubscribeFriendsRefresh?.();
    };
  }, [selectedPost?.id]);

  useEffect(() => {
    const requestedView = searchParams.get("view");
    if (
      requestedView === "friends" ||
      requestedView === "notifications" ||
      requestedView === "feed"
    ) {
      setView(requestedView);
      return;
    }
    setView("feed");
  }, [searchParams]);

  useEffect(() => {
    const storyUserId = searchParams.get("storyUserId");
    if (storyUserId && stories.length > 0) {
      const storyGroup = stories.find((g) => g.userId === storyUserId);
      if (storyGroup) {
        setSelectedStoryGroup(storyGroup);
        setView("feed");
      }
    }
  }, [searchParams, stories]);

  useEffect(() => {
    const postId = searchParams.get("postId");
    const openComments = searchParams.get("openComments");
    if (postId && openComments === "1" && posts.length > 0) {
      const post = posts.find((p) => p.id === Number(postId));
      if (post) {
        setSelectedPost(post);
        setView("feed");
      }
    }
  }, [searchParams, posts]);

  useEffect(() => {
    const postId = searchParams.get("postId");
    const openComments = searchParams.get("openComments");
    if (postId && openComments !== "1" && posts.length > 0) {
      const post = posts.find((p) => p.id === Number(postId));
      if (post) {
        setView("feed");
        setTimeout(() => {
          const postElement = document.getElementById(`post-${postId}`);
          if (postElement) {
            postElement.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }, 100);
      }
    }
  }, [searchParams, posts]);

  const handleReject = async (friendId: string) => {
    if (!window.confirm("Tuấn chắc chắn muốn bỏ qua lời mời này?")) return;
    try {
      await sendFriendAction("reject", friendId);
      alert("Đã xóa lời mời.");
      setFriendRequests((prev) => prev.filter((req) => req.id !== friendId));
    } catch (error) {
      console.error("Lỗi xóa lời mời:", error);
      alert("Không thể thực hiện thao tác này.");
    }
  };

  const handleAccept = async (friendId: string) => {
    try {
      await sendFriendAction("accept", friendId);
      alert("Đã trở thành bạn bè!");
      setFriendRequests((prev) =>
        prev.filter((req) => req.userId !== friendId),
      );
      void fetchSidebarData();
    } catch (error) {
      console.error("Lỗi khi chấp nhận kết bạn:", error);
      alert("Không thể chấp nhận lời mời lúc này.");
    }
  };

  const visiblePosts = useMemo(
    () => posts.slice(0, visiblePostCount),
    [posts, visiblePostCount],
  );

  if (loading) {
    return <FeedSkeleton />;
  }

  return (
    <div className="min-h-screen bg-[#F3F4F6] flex flex-col font-sans">
      <Header
        currentUserId={currentUserId}
        userName={userData?.userFullName || userData?.userName}
        avatarUrl={userData?.avatarUrl}
      />

      <div className="flex flex-1 max-w-[1440px] mx-auto w-full gap-8 px-8 py-8">
        <aside className="hidden lg:flex flex-col w-64 sticky top-24 h-fit space-y-2">
          <button
            onClick={() => handleViewChange("feed")}
            className={`flex items-center gap-4 px-4 py-3 rounded-2xl font-bold text-sm ${view === "feed" ? "bg-blue-600 text-white shadow-lg" : "text-gray-500 hover:bg-white"}`}
          >
            <Layout size={20} />
            <span>Bảng tin</span>
          </button>

          <button
            onClick={() => handleViewChange("friends")}
            className={`flex items-center gap-4 px-4 py-3 rounded-2xl font-bold text-sm ${view === "friends" ? "bg-blue-600 text-white shadow-lg" : "text-gray-500 hover:bg-white"}`}
          >
            <Users size={20} />
            <span>Bạn bè</span>
          </button>
          <button
            onClick={() => handleViewChange("notifications")}
            className={`flex items-center gap-4 px-4 py-3 rounded-2xl font-bold text-sm ${view === "notifications" ? "bg-blue-600 text-white shadow-lg" : "text-gray-500 hover:bg-white hover:text-blue-600 hover:shadow-sm"}`}
          >
            <Bell size={20} />
            <span>Thông báo</span>
          </button>
          <button
            onClick={() => navigate("/profile/" + currentUserId)}
            className="flex items-center gap-4 px-4 py-3 rounded-2xl font-bold text-sm text-gray-500 hover:bg-white hover:text-blue-600 hover:shadow-sm"
          >
            <User size={20} />
            <span>Tài khoản</span>
          </button>
        </aside>

        <main className="flex-1 max-w-2xl space-y-8">
          {view === "feed" ? (
            <>
              <div className="bg-white rounded-[32px] p-5 shadow-sm border border-gray-50">
                <StoryBar
                  currentUserId={currentUserId || ""}
                  storyGroups={stories}
                  onStoryClick={(group) => setSelectedStoryGroup(group)}
                  onAddStoryClick={() => setOpenUploadModal(true)}
                />
              </div>

              <CreatePostCard
                onPostCreated={fetchInitialData}
                userData={userData}
              />

              <div className="space-y-6">
                {visiblePosts.length > 0 ? (
                  <>
                    {visiblePosts.map((post) => (
                      <PostCard
                        key={post.id}
                        post={post}
                        currentUserId={currentUserId}
                        onDelete={fetchInitialData}
                        onLike={(isLiked, count) =>
                          setPosts((prev) =>
                            prev.map((p) =>
                              p.id === post.id
                                ? { ...p, isLiked, likeCount: count }
                                : p,
                            ),
                          )
                        }
                        onOpenComments={() => setSelectedPost(post)}
                      />
                    ))}

                    {posts.length > visiblePosts.length && (
                      <div className="flex justify-center pt-2">
                        <button
                          type="button"
                          onClick={() =>
                            setVisiblePostCount((prev) => prev + POSTS_PER_PAGE)
                          }
                          className="rounded-2xl bg-white px-6 py-3 text-sm font-bold text-blue-600 shadow-sm border border-blue-100 hover:bg-blue-50"
                        >
                          Xem thêm bài viết
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-10 text-gray-400 font-medium bg-white rounded-3xl">
                    Chưa có bài viết nào để hiển thị.
                  </div>
                )}
              </div>
            </>
          ) : view === "friends" ? (
            <FriendsManager currentUserId={currentUserId} />
          ) : (
            <NotificationsManager />
          )}
        </main>

        <aside className="hidden xl:flex flex-col w-80 sticky top-24 h-fit space-y-6">
          {friendRequests.length > 0 && (
            <div className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-black text-gray-900 text-sm uppercase text-blue-600">
                  Lời mời ({friendRequests.length})
                </h3>
              </div>

              <div className="space-y-4">
                {friendRequests.map((req) => (
                  <div
                    key={req.userId}
                    className="flex flex-col gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-600 flex-shrink-0 flex items-center justify-center text-white font-bold border-2 border-white shadow-sm overflow-hidden">
                        {req.avatarUrl ? (
                          <img
                            src={req.avatarUrl}
                            alt={req.userName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          (req.userName?.[0]?.toUpperCase() ?? "?")
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-gray-900 truncate">
                          {req.fullName || req.userName}
                        </p>
                        <p className="text-[10px] text-gray-500 truncate">
                          @{req.userName}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAccept(req.userId)}
                        className="flex-1 bg-blue-600 text-white py-1.5 rounded-lg text-[10px] font-black hover:bg-blue-700 transition-colors shadow-sm shadow-blue-100"
                      >
                        CHẤP NHẬN
                      </button>
                      <button
                        onClick={() => handleReject(req.userId)}
                        className="flex-1 bg-white text-gray-500 py-1.5 rounded-lg text-[10px] font-black border border-gray-200 hover:bg-red-50 hover:text-red-600 transition-all"
                      >
                        XÓA
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-50">
            <h3 className="font-black text-gray-900 text-sm mb-4 uppercase">
              Xu hướng
            </h3>
            <div className="flex flex-wrap gap-2">
              {trendingTags.length > 0 ? (
                trendingTags.map((tag) => (
                  <span
                    key={tag}
                    className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-xl text-[11px] font-bold hover:bg-blue-600 hover:text-white cursor-pointer transition-all"
                  >
                    #{tag}
                  </span>
                ))
              ) : (
                <p className="text-[10px] text-gray-400">
                  Chưa có xu hướng mới
                </p>
              )}
            </div>
          </div>
        </aside>
      </div>

      {selectedPost && (
        <CommentModal
          post={selectedPost}
          currentUserId={currentUserId}
          onClose={() => setSelectedPost(null)}
          onUpdateCount={(newCount) => {
            setPosts((prev) =>
              prev.map((p) =>
                p.id === selectedPost.id ? { ...p, commentCount: newCount } : p,
              ),
            );
            setSelectedPost((prev) =>
              prev ? { ...prev, commentCount: newCount } : prev,
            );
          }}
        />
      )}

      {selectedStoryGroup && (
        <StoryViewer
          stories={stories}
          initialUserIndex={stories.findIndex(
            (g) => g.userId === selectedStoryGroup.userId,
          )}
          onClose={() => setSelectedStoryGroup(null)}
        />
      )}

      {openUploadModal && (
        <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white p-8 rounded-[32px] w-full max-w-md shadow-2xl border border-gray-100">
            <h2 className="text-2xl font-black text-gray-900 mb-2">
              Đăng khoảnh khắc
            </h2>
            <p className="text-gray-500 text-sm mb-8 font-medium">
              Chia sẻ một tấm ảnh đẹp với bạn bè của Tuấn hôm nay nhé.
            </p>

            <div
              onClick={() => document.getElementById("storyInput")?.click()}
              className="border-2 border-dashed border-gray-200 rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-all mb-6"
            >
              {selectedStoryFile ? (
                <p className="text-blue-600 font-bold text-sm">
                  📸 {selectedStoryFile.name}
                </p>
              ) : (
                <>
                  <span className="text-4xl mb-2">🖼️</span>
                  <p className="text-gray-400 text-xs font-bold">
                    NHẤN ĐỂ CHỌN ẢNH
                  </p>
                </>
              )}
              <input
                id="storyInput"
                type="file"
                accept="image/*"
                hidden
                onChange={(e) =>
                  setSelectedStoryFile(e.target.files?.[0] || null)
                }
              />
            </div>

            <div className="flex justify-end gap-4">
              <button
                onClick={() => {
                  setOpenUploadModal(false);
                  setSelectedStoryFile(null);
                }}
                className="px-6 py-2 text-gray-400 font-bold text-sm hover:text-gray-600"
              >
                HỦY BỎ
              </button>
              <button
                onClick={handleCreateStory}
                disabled={uploadingStory || !selectedStoryFile}
                className="px-8 py-2.5 bg-blue-600 text-white rounded-xl font-black text-sm shadow-lg shadow-blue-100 disabled:opacity-50"
              >
                {uploadingStory ? "ĐANG TẢI..." : "ĐĂNG NGAY"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;

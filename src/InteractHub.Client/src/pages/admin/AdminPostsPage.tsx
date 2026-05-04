import { useEffect, useMemo, useState } from "react";
import api from "../../api/axiosConfig";
import AdminPostDetailPanel from "../../components/admin/posts/AdminPostDetailPanel";
import AdminPostGroupList from "../../components/admin/posts/AdminPostGroupList";
import AdminPostsToolbar from "../../components/admin/posts/AdminPostsToolbar";
import type {
  AdminPostListItemDto,
  AdminPostUserGroupDto,
  AdminPostUserListItemDto,
} from "../../components/admin/posts/types";

type SearchScope = "user" | "post";

const AdminPostsPage = () => {
  const [users, setUsers] = useState<AdminPostUserListItemDto[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserLabel, setSelectedUserLabel] = useState("");
  const [posts, setPosts] = useState<AdminPostListItemDto[]>([]);
  const [selectedPost, setSelectedPost] = useState<AdminPostListItemDto | null>(
    null,
  );
  const [scope, setScope] = useState<SearchScope>("user");
  const [query, setQuery] = useState("");
  const [postState, setPostState] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = async (preferredUserId?: string | null) => {
    setLoadingUsers(true);
    setError(null);

    try {
      const response = await api.get<AdminPostUserListItemDto[]>(
        "/admin/posts/authors",
        {
          params: {
            query: scope === "user" ? query || undefined : undefined,
            sortBy: scope === "user" ? sortBy : "name",
            sortDir: scope === "user" ? sortDir : "asc",
          },
        },
      );

      const nextUsers = Array.isArray(response.data) ? response.data : [];
      setUsers(nextUsers);

      if (!nextUsers.length) {
        setSelectedUserId(null);
        setSelectedUserLabel("");
        setPosts([]);
        setSelectedPost(null);
        return;
      }

      const nextSelectedUser =
        nextUsers.find(
          (user) => user.userId === (preferredUserId || selectedUserId),
        ) || nextUsers[0];

      setSelectedUserId(nextSelectedUser.userId);
      setSelectedUserLabel(
        nextSelectedUser.userFullName ||
          nextSelectedUser.userName ||
          "Người dùng không tên",
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Không tải được danh sách user.",
      );
      setUsers([]);
      setSelectedUserId(null);
      setSelectedUserLabel("");
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadPosts = async (userId: string | null) => {
    if (!userId) {
      setPosts([]);
      setSelectedPost(null);
      return;
    }

    setLoadingPosts(true);
    setError(null);

    try {
      const response = await api.get<AdminPostUserGroupDto[]>(
        "/admin/posts/groups/by-author",
        {
          params: {
            userId,
            query: scope === "post" ? query || undefined : undefined,
            state: postState || undefined,
            sortBy: scope === "post" ? sortBy : "createdAt",
            sortDir: scope === "post" ? sortDir : "desc",
          },
        },
      );

      const groups = Array.isArray(response.data) ? response.data : [];
      const currentGroup =
        groups.find((group) => group.userId === userId) || null;
      const nextPosts = currentGroup?.posts || [];

      setPosts(nextPosts);
      setSelectedUserLabel(
        currentGroup?.userFullName ||
          currentGroup?.userName ||
          users.find((user) => user.userId === userId)?.userFullName ||
          users.find((user) => user.userId === userId)?.userName ||
          "Người dùng không tên",
      );

      setSelectedPost((prev) => {
        if (!nextPosts.length) return null;
        if (!prev) return nextPosts[0];
        return nextPosts.find((post) => post.id === prev.id) || nextPosts[0];
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Không tải được danh sách bài viết.",
      );
      setPosts([]);
      setSelectedPost(null);
    } finally {
      setLoadingPosts(false);
    }
  };

  useEffect(() => {
    void loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, query, sortBy, sortDir]);

  useEffect(() => {
    void loadPosts(selectedUserId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUserId, scope, query, postState, sortBy, sortDir]);

  useEffect(() => {
    if (scope === "user") {
      setSortBy("name");
      setSortDir("asc");
      setPostState("");
    } else {
      setSortBy("createdAt");
      setSortDir("desc");
    }
  }, [scope]);

  const selectedUser = useMemo(
    () => users.find((user) => user.userId === selectedUserId) || null,
    [users, selectedUserId],
  );

  return (
    <div className="mx-auto max-w-[1800px] px-4 py-6">
      <div className="mb-6 rounded-[32px] border border-gray-100 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-black text-slate-900">Quản lý bài viết</h1>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-500">
          Chọn user trước, sau đó xem danh sách bài viết của user đó, rồi mở chi
          tiết bài viết để moderation cùng phần comment ngay bên cạnh.
        </p>
      </div>

      <div className="space-y-6">
        <AdminPostsToolbar
          scope={scope}
          query={query}
          postState={postState}
          sortBy={sortBy}
          sortDir={sortDir}
          onScopeChange={setScope}
          onQueryChange={setQuery}
          onPostStateChange={setPostState}
          onSortByChange={setSortBy}
          onSortDirChange={setSortDir}
          onRefresh={() => {
            void loadUsers(selectedUserId);
            void loadPosts(selectedUserId);
          }}
        />

        {error ? (
          <div className="rounded-[28px] bg-rose-50 px-5 py-4 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[320px_420px_minmax(0,1fr)]">
          <section className="flex h-[calc(100vh-270px)] min-h-[640px] flex-col rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 border-b border-slate-100 pb-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                Users
              </p>
              <h2 className="mt-1 text-lg font-black text-slate-900">
                Danh sách user
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Danh sách này được tìm kiếm và sắp xếp trực tiếp từ API.
              </p>
            </div>

            <div className="flex-1 overflow-y-auto pr-1">
              {loadingUsers ? (
                <div className="py-10 text-center text-sm text-slate-500">
                  Đang tải danh sách user...
                </div>
              ) : users.length ? (
                <div className="space-y-3">
                  {users.map((user) => {
                    const active = user.userId === selectedUserId;
                    return (
                      <button
                        key={user.userId}
                        type="button"
                        onClick={() => {
                          setSelectedUserId(user.userId);
                          setSelectedUserLabel(
                            user.userFullName ||
                              user.userName ||
                              "Người dùng không tên",
                          );
                        }}
                        className={`w-full rounded-[24px] border p-4 text-left transition ${
                          active
                            ? "border-slate-900 bg-slate-50 shadow-sm"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black text-slate-900">
                              {user.userFullName ||
                                user.userName ||
                                "Người dùng không tên"}
                            </p>
                            <p className="mt-1 truncate text-xs text-slate-500">
                              @{user.userName || "unknown-user"}
                            </p>
                            <p className="mt-2 text-xs text-slate-400">
                              {user.postCount} bài viết • {user.totalReports}{" "}
                              báo cáo
                            </p>
                          </div>
                          <span className="rounded-2xl bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                            {user.postCount}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
                  Không có user nào khớp bộ lọc hiện tại.
                </div>
              )}
            </div>
          </section>

          <section className="h-[calc(100vh-270px)] min-h-[640px]">
            <AdminPostGroupList
              title={
                selectedUser
                  ? `Bài viết của ${selectedUserLabel}`
                  : "Danh sách bài viết"
              }
              subtitle={
                selectedUser
                  ? "Danh sách này được tìm kiếm, lọc và sắp xếp trực tiếp từ API backend."
                  : "Chọn một user ở cột bên trái để xem bài viết."
              }
              posts={posts}
              selectedPostId={selectedPost?.id ?? null}
              onSelectPost={setSelectedPost}
              loading={loadingPosts}
              scrollable
            />
          </section>

          <section className="h-[calc(100vh-270px)] min-h-[640px]">
            <AdminPostDetailPanel
              selectedPost={selectedPost}
              onPostChanged={() => {
                void loadUsers(selectedUserId);
                void loadPosts(selectedUserId);
              }}
            />
          </section>
        </div>
      </div>
    </div>
  );
};

export default AdminPostsPage;

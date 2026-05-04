import { useEffect, useMemo, useState } from "react";
import api from "../../api/axiosConfig";
import { subscribeRealtimeEvent } from "../../components/realtimeClient";
import AdminStoryDetailPanel from "../../components/admin/stories/AdminStoryDetailPanel";
import AdminStoryList from "../../components/admin/stories/AdminStoryList";
import AdminStoriesToolbar from "../../components/admin/stories/AdminStoriesToolbar";
import type {
  AdminStoryListItemDto,
  AdminStoryUserListItemDto,
} from "../../components/admin/stories/types";

type SearchScope = "user" | "story";

type AdminStoryUserGroupDto = {
  userId: string;
  userName?: string | null;
  userFullName?: string | null;
  userAvatarUrl?: string | null;
  storyCount: number;
  activeStoryCount: number;
  stories: AdminStoryListItemDto[];
};

type StoryStateChangedEvent = {
  eventType?: string;
  storyId?: number;
  actorUserId?: string | null;
};

const STORY_ADMIN_EVENTS = new Set([
  "admin_story_removed",
  "admin_story_restored",
]);

const AdminStoriesPage = () => {
  const [users, setUsers] = useState<AdminStoryUserListItemDto[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserLabel, setSelectedUserLabel] = useState("");
  const [stories, setStories] = useState<AdminStoryListItemDto[]>([]);
  const [selectedStory, setSelectedStory] =
    useState<AdminStoryListItemDto | null>(null);
  const [scope, setScope] = useState<SearchScope>("user");
  const [query, setQuery] = useState("");
  const [storyState, setStoryState] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingStories, setLoadingStories] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = async (preferredUserId?: string | null) => {
    setLoadingUsers(true);
    setError(null);

    try {
      const response = await api.get<AdminStoryUserListItemDto[]>(
        "/admin/stories/users",
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
        setStories([]);
        setSelectedStory(null);
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

  const loadStories = async (userId: string | null) => {
    if (!userId) {
      setStories([]);
      setSelectedStory(null);
      return;
    }

    setLoadingStories(true);
    setError(null);

    try {
      const response = await api.get<AdminStoryUserGroupDto[]>(
        "/admin/stories/grouped",
        {
          params: {
            userId,
            query: scope === "story" ? query || undefined : undefined,
            state: storyState || undefined,
            sortBy: scope === "story" ? sortBy : "createdAt",
            sortDir: scope === "story" ? sortDir : "desc",
          },
        },
      );

      const groups = Array.isArray(response.data) ? response.data : [];
      const currentGroup =
        groups.find((group) => group.userId === userId) || null;
      const nextStories = currentGroup?.stories || [];

      setStories(nextStories);
      setSelectedUserLabel(
        currentGroup?.userFullName ||
          currentGroup?.userName ||
          users.find((user) => user.userId === userId)?.userFullName ||
          users.find((user) => user.userId === userId)?.userName ||
          "Người dùng không tên",
      );

      setSelectedStory((prev) => {
        if (!nextStories.length) return null;
        if (!prev) return nextStories[0];
        return (
          nextStories.find((story) => story.id === prev.id) || nextStories[0]
        );
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Không tải được danh sách story.",
      );
      setStories([]);
      setSelectedStory(null);
    } finally {
      setLoadingStories(false);
    }
  };

  useEffect(() => {
    void loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, query, sortBy, sortDir]);

  useEffect(() => {
    void loadStories(selectedUserId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUserId, scope, query, storyState, sortBy, sortDir]);

  useEffect(() => {
    if (scope === "user") {
      setSortBy("name");
      setSortDir("asc");
      setStoryState("");
    } else {
      setSortBy("createdAt");
      setSortDir("desc");
    }
  }, [scope]);

  useEffect(() => {
    let unsubscribeStoryState: (() => void) | undefined;
    let cancelled = false;

    const setupRealtime = async () => {
      unsubscribeStoryState =
        await subscribeRealtimeEvent<StoryStateChangedEvent>(
          "story:state_changed",
          (payload) => {
            if (
              !payload?.eventType ||
              !STORY_ADMIN_EVENTS.has(payload.eventType)
            ) {
              return;
            }

            void loadUsers(selectedUserId);
            void loadStories(selectedUserId);
          },
        );

      if (cancelled) {
        unsubscribeStoryState?.();
      }
    };

    void setupRealtime();

    return () => {
      cancelled = true;
      unsubscribeStoryState?.();
    };
  }, [selectedUserId, scope, query, storyState, sortBy, sortDir]);

  const selectedUser = useMemo(
    () => users.find((user) => user.userId === selectedUserId) || null,
    [users, selectedUserId],
  );

  return (
    <div className="mx-auto max-w-[1800px] px-4 py-6">
      <div className="mb-6 rounded-[32px] border border-gray-100 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-black text-slate-900">Quản lý tin</h1>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-500">
          Chọn user có story trước, sau đó xem danh sách story của user đó, rồi
          mở chi tiết để gỡ hoặc khôi phục story khi cần.
        </p>
      </div>

      <div className="space-y-6">
        <AdminStoriesToolbar
          scope={scope}
          query={query}
          storyState={storyState}
          sortBy={sortBy}
          sortDir={sortDir}
          onScopeChange={setScope}
          onQueryChange={setQuery}
          onStoryStateChange={setStoryState}
          onSortByChange={setSortBy}
          onSortDirChange={setSortDir}
          onRefresh={() => {
            void loadUsers(selectedUserId);
            void loadStories(selectedUserId);
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
                Danh sách user có story
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
                              {user.storyCount} story • {user.activeStoryCount}{" "}
                              đang hoạt động
                            </p>
                          </div>
                          <span className="rounded-2xl bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                            {user.storyCount}
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
            <AdminStoryList
              title={
                selectedUser
                  ? `Story của ${selectedUserLabel}`
                  : "Danh sách story"
              }
              subtitle={
                selectedUser
                  ? "Danh sách này được tìm kiếm, lọc và sắp xếp trực tiếp từ API backend."
                  : "Chọn một user ở cột bên trái để xem story."
              }
              stories={stories}
              selectedStoryId={selectedStory?.id ?? null}
              onSelectStory={setSelectedStory}
              loading={loadingStories}
              scrollable
            />
          </section>

          <section className="h-[calc(100vh-270px)] min-h-[640px]">
            <AdminStoryDetailPanel
              selectedStory={selectedStory}
              onStoryChanged={() => {
                void loadUsers(selectedUserId);
                void loadStories(selectedUserId);
              }}
            />
          </section>
        </div>
      </div>
    </div>
  );
};

export default AdminStoriesPage;

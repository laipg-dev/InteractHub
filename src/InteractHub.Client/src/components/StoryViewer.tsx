import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axiosConfig";
import { jwtDecode } from "jwt-decode";
import type { StoryGroup } from "./types";

interface StoryViewerProps {
  stories: StoryGroup[];
  initialUserIndex: number;
  onClose: () => void;
}

type JwtPayload = { sub?: string };

const StoryViewer = ({
  stories,
  initialUserIndex,
  onClose,
}: StoryViewerProps) => {
  const navigate = useNavigate();
  const safeInitialIndex = initialUserIndex >= 0 ? initialUserIndex : 0;
  const [currentUserIndex, setCurrentUserIndex] = useState(safeInitialIndex);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [showMenu, setShowMenu] = useState(false);

  const token = localStorage.getItem("token");
  const decoded = token ? jwtDecode<JwtPayload>(token) : null;
  const currentUserIdLocal = decoded?.sub;

  const currentUser = stories?.[currentUserIndex];
  const currentStory = currentUser?.stories?.[currentStoryIndex];
  const isMyStory = currentUser?.userId === currentUserIdLocal;
  const displayName =
    currentUser?.fullName || currentUser?.userName || "Người dùng";
  const avatarSrc =
    currentUser?.avatarUrl ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=2563eb&color=fff`;

  const currentUserId = currentUser?.userId;
  const currentStoryId = currentStory?.id;

  const storyGroups = useMemo(
    () => stories.filter((group) => (group.stories?.length || 0) > 0),
    [stories],
  );

  useEffect(() => {
    setCurrentUserIndex(safeInitialIndex);
    setCurrentStoryIndex(0);
    setShowMenu(false);
  }, [safeInitialIndex]);

  useEffect(() => {
    if (!storyGroups.length) {
      onClose();
      return;
    }

    if (!currentUserId) {
      setCurrentUserIndex(0);
      setCurrentStoryIndex(0);
      return;
    }

    const nextUserIndex = storyGroups.findIndex(
      (group) => group.userId === currentUserId,
    );

    if (nextUserIndex === -1) {
      onClose();
      return;
    }

    const nextUser = storyGroups[nextUserIndex];
    const nextStoryIndex = nextUser.stories.findIndex(
      (story) => story.id === currentStoryId,
    );

    setCurrentUserIndex(nextUserIndex);
    setCurrentStoryIndex(nextStoryIndex >= 0 ? nextStoryIndex : 0);
  }, [storyGroups, currentUserId, currentStoryId, onClose]);

  const goToProfile = (userId?: string) => {
    if (userId) {
      onClose();
      navigate(`/profile/${userId}`);
    }
  };

  const handleDeleteStory = async () => {
    if (!currentStory) return;
    try {
      await api.delete(`/stories/deleteStory/${currentStory.id}`);
      setShowMenu(false);
      onClose();
    } catch (error) {
      console.error("Xóa story thất bại", error);
    }
  };

  const handleNext = useCallback(() => {
    const userGroup = storyGroups[currentUserIndex];
    if (!userGroup || userGroup.stories.length === 0) {
      onClose();
      return;
    }
    if (currentStoryIndex < userGroup.stories.length - 1) {
      setCurrentStoryIndex((prev) => prev + 1);
      return;
    }
    if (currentUserIndex < storyGroups.length - 1) {
      setCurrentUserIndex((prev) => prev + 1);
      setCurrentStoryIndex(0);
      setShowMenu(false);
      return;
    }
    onClose();
  }, [storyGroups, currentUserIndex, currentStoryIndex, onClose]);

  const handlePrev = useCallback(() => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex((prev) => prev - 1);
    } else if (currentUserIndex > 0) {
      const prevUserIndex = currentUserIndex - 1;
      const prevUser = storyGroups[prevUserIndex];
      setCurrentUserIndex(prevUserIndex);
      setCurrentStoryIndex(
        prevUser?.stories.length ? prevUser.stories.length - 1 : 0,
      );
      setShowMenu(false);
    }
  }, [currentStoryIndex, currentUserIndex, storyGroups]);

  useEffect(() => {
    if (!currentUser || !currentStory) return;
    setProgress(0);
    const duration = 5000;
    const intervalMs = 50;
    const step = 100 / (duration / intervalMs);
    const interval = setInterval(() => {
      setProgress((prev) => Math.min(prev + step, 100));
    }, intervalMs);
    return () => clearInterval(interval);
  }, [currentUserIndex, currentStoryIndex, currentUser, currentStory]);

  useEffect(() => {
    if (progress < 100) return;
    setProgress(0);
    handleNext();
  }, [progress, handleNext]);

  if (!storyGroups.length || currentUserIndex === -1) return null;
  if (!currentUser || currentUser.stories.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col overflow-hidden bg-black md:flex-row">
      <button
        onClick={onClose}
        className="absolute top-4 left-4 z-[210] flex h-10 w-10 items-center justify-center rounded-full bg-gray-800/50 text-white transition-colors hover:bg-gray-700"
      >
        ✕
      </button>

      <div className="hidden w-80 flex-col overflow-y-auto border-r border-gray-800 bg-[#18191a] py-4 md:flex">
        <div className="mb-6 px-4">
          <h2 className="text-2xl font-black text-white">Tin</h2>
        </div>

        <div className="space-y-1">
          <p className="mb-2 px-4 text-sm font-bold text-gray-400">
            Tất cả tin
          </p>

          {storyGroups.map((group, index) => {
            const groupDisplayName =
              group.fullName || group.userName || "Người dùng";
            const groupAvatar =
              group.avatarUrl ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(groupDisplayName)}&background=2563eb&color=fff`;

            return (
              <div
                key={group.userId}
                className={`flex items-center gap-3 px-4 py-3 transition ${
                  index === currentUserIndex
                    ? "bg-gray-800"
                    : "hover:bg-gray-800/50"
                }`}
              >
                <button
                  type="button"
                  onClick={() => goToProfile(group.userId)}
                  className={`rounded-full border-2 p-0.5 ${
                    index === currentUserIndex
                      ? "border-blue-500"
                      : "border-gray-600"
                  }`}
                >
                  <img
                    src={groupAvatar}
                    className="h-10 w-10 rounded-full object-cover"
                    alt={groupDisplayName}
                  />
                </button>
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => goToProfile(group.userId)}
                    className="truncate text-sm font-bold text-white"
                  >
                    {groupDisplayName}
                  </button>
                  <p className="text-xs text-gray-500">
                    {group.stories.length || 0} thẻ mới
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCurrentUserIndex(index);
                    setCurrentStoryIndex(0);
                    setShowMenu(false);
                  }}
                  className="text-[10px] font-black uppercase text-blue-400"
                >
                  Xem
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="group relative flex flex-1 items-center justify-center bg-black">
        {(currentUserIndex > 0 || currentStoryIndex > 0) && (
          <button
            onClick={handlePrev}
            className="absolute left-4 z-30 hidden h-12 w-12 items-center justify-center rounded-full bg-gray-700/50 text-white transition-all hover:bg-gray-600 group-hover:flex"
          >
            ❮
          </button>
        )}

        <div className="relative h-[90vh] max-w-full aspect-[9/16] overflow-hidden rounded-xl bg-gray-900 shadow-2xl">
          <div className="absolute top-2 left-2 right-2 z-20 flex gap-1.5">
            {currentUser.stories.map((_, idx) => (
              <div
                key={idx}
                className="h-1 flex-1 overflow-hidden rounded-full bg-gray-600"
              >
                <div
                  className="h-full bg-white transition-all"
                  style={{
                    width:
                      idx < currentStoryIndex
                        ? "100%"
                        : idx === currentStoryIndex
                          ? `${progress}%`
                          : "0%",
                  }}
                />
              </div>
            ))}
          </div>

          {currentStory?.imageUrl && (
            <img
              src={currentStory.imageUrl}
              className="h-full w-full object-contain"
              alt="Story content"
            />
          )}

          <div className="absolute top-6 left-4 right-4 z-20 flex items-start justify-between">
            <div className="flex items-center gap-3 rounded-lg bg-gradient-to-b from-black/20 to-transparent p-2">
              <button
                type="button"
                onClick={() => goToProfile(currentUser.userId)}
              >
                <img
                  src={avatarSrc}
                  className="h-8 w-8 rounded-full border border-white object-cover"
                  alt={displayName}
                />
              </button>
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={() => goToProfile(currentUser.userId)}
                  className="text-left text-sm font-bold text-white drop-shadow-md"
                >
                  {displayName}
                </button>
                <span className="text-[10px] text-gray-300">
                  {currentStory?.createdAt
                    ? new Date(currentStory.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : ""}
                </span>
              </div>
            </div>

            <div className="relative">
              {isMyStory && (
                <>
                  <button
                    onClick={() => setShowMenu((prev) => !prev)}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white transition hover:bg-black/60"
                  >
                    ...
                  </button>

                  {showMenu && (
                    <div className="absolute right-0 mt-2 w-32 overflow-hidden rounded-xl bg-white shadow-lg">
                      <button
                        onClick={handleDeleteStory}
                        className="w-full px-4 py-3 text-left text-sm font-semibold text-red-600 transition hover:bg-gray-100"
                      >
                        Xóa
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={handleNext}
          className="absolute right-4 z-30 hidden h-12 w-12 items-center justify-center rounded-full bg-gray-700/50 text-white transition-all hover:bg-gray-600 group-hover:flex"
        >
          ❯
        </button>
      </div>
    </div>
  );
};

export default StoryViewer;

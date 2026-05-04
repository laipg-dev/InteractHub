import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import type { StoryGroup } from "./types";

interface StoryBarProps {
  currentUserId: string;
  storyGroups: StoryGroup[];
  onStoryClick: (group: StoryGroup) => void;
  onAddStoryClick: () => void;
}

const StoryBar = ({
  currentUserId,
  storyGroups,
  onStoryClick,
  onAddStoryClick,
}: StoryBarProps) => {
  const navigate = useNavigate();

  const myStoryGroup = useMemo(
    () => storyGroups.find((group) => group.userId === currentUserId) || null,
    [storyGroups, currentUserId],
  );

  const visibleStoryGroups = useMemo(
    () => storyGroups.filter((group) => group.userId !== currentUserId),
    [storyGroups, currentUserId],
  );

  const goToProfile = (userId: string) => {
    if (userId) {
      navigate(`/profile/${userId}`);
    }
  };

  const myDisplayName =
    myStoryGroup?.fullName || myStoryGroup?.userName || "Bạn";
  const myStoryCount = myStoryGroup?.stories?.length || 0;

  return (
    <div className="flex items-center space-x-4 overflow-x-auto pb-4 scrollbar-hide px-2">
      <div className="flex-shrink-0 flex flex-col items-center space-y-1 group">
        <div
          className={`w-16 h-16 md:w-20 md:h-20 rounded-full p-[3px] flex items-center justify-center transition-all relative ${
            myStoryGroup
              ? "bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 shadow-sm group-hover:scale-105"
              : "border-2 border-dashed border-gray-300 bg-gray-50"
          }`}
        >
          <button
            type="button"
            onClick={() => {
              if (myStoryGroup) {
                onStoryClick(myStoryGroup);
                return;
              }
              onAddStoryClick();
            }}
            className="w-full h-full rounded-full border-2 border-white overflow-hidden bg-white flex items-center justify-center"
          >
            {myStoryGroup?.avatarUrl ? (
              <img
                src={myStoryGroup.avatarUrl}
                alt={myDisplayName}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-3xl text-gray-400 font-light">+</span>
            )}
          </button>

          <button
            type="button"
            onClick={onAddStoryClick}
            className="absolute bottom-0 right-0 bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center border-2 border-white text-xs font-bold shadow-sm"
            aria-label="Thêm story"
          >
            +
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            if (myStoryGroup) {
              onStoryClick(myStoryGroup);
              return;
            }
            onAddStoryClick();
          }}
          className="text-[10px] font-black text-gray-500 uppercase tracking-tighter"
        >
          {myStoryCount > 0 ? `Bạn (${myStoryCount})` : "Bạn"}
        </button>
      </div>

      {visibleStoryGroups.map((group) => {
        const displayName = group.fullName || group.userName || "Người dùng";
        const storyCount = group.stories?.length || 0;

        return (
          <div
            key={group.userId}
            className="flex-shrink-0 flex flex-col items-center space-y-1 group"
          >
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full p-[3px] bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 shadow-sm group-hover:scale-105 transition-transform duration-200">
              <button
                type="button"
                onClick={() => goToProfile(group.userId)}
                className="w-full h-full rounded-full border-2 border-white overflow-hidden bg-white"
              >
                {group.avatarUrl ? (
                  <img
                    src={group.avatarUrl}
                    alt={displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-500 font-black text-xl">
                    {displayName[0]?.toUpperCase() || "?"}
                  </div>
                )}
              </button>
            </div>
            <button
              type="button"
              onClick={() => goToProfile(group.userId)}
              className="text-[10px] font-bold text-gray-700 truncate w-16 text-center"
            >
              {displayName}
            </button>
            <button
              type="button"
              onClick={() => onStoryClick(group)}
              className="text-[9px] font-black uppercase text-blue-600"
            >
              {storyCount > 1 ? `Xem ${storyCount} tin` : "Xem tin"}
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default StoryBar;

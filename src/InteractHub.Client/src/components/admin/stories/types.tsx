export type AdminStoryListItemDto = {
  id: number;
  userId: string;
  userName?: string | null;
  userFullName?: string | null;
  userAvatarUrl?: string | null;
  imageUrl?: string | null;
  isDeleted: boolean;
  createdAt: string;
  deletedAt?: string | null;
  isExpired: boolean;
  expiresAt: string;
};

export type AdminStoryUserListItemDto = {
  userId: string;
  userName?: string | null;
  userFullName?: string | null;
  userAvatarUrl?: string | null;
  storyCount: number;
  activeStoryCount: number;
};

export type AdminStoryUserGroupDto = {
  userId: string;
  userName?: string | null;
  userFullName?: string | null;
  userAvatarUrl?: string | null;
  storyCount: number;
  activeStoryCount: number;
  stories: AdminStoryListItemDto[];
};

export type AdminStoryDetailDto = {
  id: number;
  userId: string;
  userName?: string | null;
  userFullName?: string | null;
  userAvatarUrl?: string | null;
  imageUrl?: string | null;
  isDeleted: boolean;
  createdAt: string;
  deletedAt?: string | null;
  isExpired: boolean;
  expiresAt: string;
};

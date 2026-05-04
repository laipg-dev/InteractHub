export type AdminPostListItemDto = {
  id: number;
  userId: string;
  userName?: string | null;
  userFullName?: string | null;
  contentPreview?: string | null;
  imageUrl?: string | null;
  isDeleted: boolean;
  createdAt: string;
  deletedAt?: string | null;
  likeCount: number;
  commentCount: number;
  reportCount: number;
  currentFlag?: string | null;
  hashtags: string[];
};

export type AdminPostUserListItemDto = {
  userId: string;
  userName?: string | null;
  userFullName?: string | null;
  postCount: number;
  totalReports: number;
};

export type AdminPostUserGroupDto = {
  userId: string;
  userName?: string | null;
  userFullName?: string | null;
  postCount: number;
  totalReports: number;
  posts: AdminPostListItemDto[];
};

export type AdminCommentListItemDto = {
  id: number;
  postId: number;
  userId: string;
  userName?: string | null;
  userFullName?: string | null;
  content: string;
  isDeleted: boolean;
  createdAt: string;
  deletedAt?: string | null;
};

export type AdminPostDetailDto = {
  id: number;
  userId: string;
  userName?: string | null;
  userFullName?: string | null;
  userAvatarUrl?: string | null;
  content: string;
  imageUrl?: string | null;
  isDeleted: boolean;
  createdAt: string;
  deletedAt?: string | null;
  likeCount: number;
  activeCommentCount: number;
  totalCommentCount: number;
  reportCount: number;
  currentFlag?: string | null;
  finalStatus?: string | null;
  hashtags: string[];
  comments: AdminCommentListItemDto[];
};

export type UpdateAdminPostRequest = {
  content: string;
  imageUrl?: string;
};

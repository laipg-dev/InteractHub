export interface CurrentUserSummary {
  id: string;
  userName: string;
  userFullName: string;
  avatarUrl: string;
  email?: string;
  phoneNumber?: string;
  bio?: string;
}

export interface PostItem {
  id: number;
  content: string;
  imageUrl?: string | null;
  createdAt: string;
  userId: string;
  userName: string;
  userFullName?: string | null;
  fullName?: string | null;
  avatarUrl?: string | null;
  userAvatar?: string | null;
  likeCount: number;
  commentCount: number;
  hashtags: string[];
  isLiked: boolean;
}

export interface StoryItem {
  id: number;
  imageUrl?: string | null;
  createdAt: string;
}

export interface StoryGroup {
  userId: string;
  userName: string;
  fullName?: string | null;
  avatarUrl?: string | null;
  stories: StoryItem[];
  latestStoryTime: string;
}

export interface FriendRequestItem {
  id?: string;
  userId: string;
  userName?: string;
  fullName?: string | null;
  avatarUrl?: string | null;
}

export interface FriendListResponse {
  friends?: FriendRequestItem[];
  requests?: FriendRequestItem[];
  sent?: FriendRequestItem[];
}

export interface CommentItem {
  id: number;
  userId: string;
  userName?: string | null;
  userFullName?: string | null;
  fullName?: string | null;
  avatarUrl?: string | null;
  content: string;
}

export interface NotificationDto {
  id: number;
  type: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  senderId?: string | null;
  senderName?: string | null;
  senderAvatarUrl?: string | null;
  postId?: number | null;
  commentId?: number | null;
  storyId?: number | null;
}

export interface UnreadCountResponse {
  unreadCount: number;
}

export interface ProfileData {
  id: string;
  userName: string;
  fullName?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  friendStatus: number;
  bio?: string | null;
  avatarUrl?: string | null;
  joinedAt?: string;
  friendCount: number;
  postCount: number;
  posts: PostItem[];
}

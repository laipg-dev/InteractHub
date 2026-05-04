import api from "../api/axiosConfig";
import type {
  CurrentUserSummary,
  FriendRequestItem,
  PostItem,
  ProfileData,
} from "../components/types";

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
  friendStatus?: number;
  friendCount?: number;
  postCount?: number;
};

type FriendSidebarResponse = {
  friends?: FriendRequestItem[];
  requests?: Array<
    Partial<FriendRequestItem> & { username?: string; userFullName?: string }
  >;
  sent?: FriendRequestItem[];
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

const mapFriendRequest = (
  req: Partial<FriendRequestItem> & {
    username?: string;
    userFullName?: string;
  },
): FriendRequestItem => ({
  id: req.id || req.userId || "",
  userId: req.userId || req.id || "",
  userName: req.userName || req.username || "",
  fullName:
    req.fullName || req.userFullName || req.userName || req.username || "",
  avatarUrl: req.avatarUrl || null,
});

export const fetchCurrentUser = async () => {
  const response = await api.get<UserApiResponse>("/users/me");
  return mapCurrentUser(response.data);
};

export const fetchProfileBase = async (userId: string) => {
  const response = await api.get<UserApiResponse>(`/users/profile/${userId}`);
  return response.data;
};

export const fetchFriendCollections = async () => {
  const response = await api.get<FriendSidebarResponse>(
    "/friends/list-and-requests",
  );
  const friends = Array.isArray(response.data?.friends)
    ? response.data.friends
    : [];
  return {
    friends,
    friendsCount: friends.length,
  };
};

export const fetchFriendSidebarData = async () => {
  const response = await api.get<FriendSidebarResponse>(
    "/friends/list-and-requests",
  );
  return Array.isArray(response.data?.requests)
    ? response.data.requests.map(mapFriendRequest)
    : [];
};

export const sendFriendAction = async (action: string, targetId: string) => {
  return api.post(`/friends/${action}/${targetId}`);
};

export const mapProfileData = (
  base: UserApiResponse,
  posts: PostItem[],
  friendsCount: number,
  userId: string,
): ProfileData => ({
  id: base.id || base.Id || userId,
  userName: base.userName || base.UserName || "",
  fullName: base.fullName || base.FullName || null,
  email: base.email || base.Email || null,
  phoneNumber: base.phoneNumber || base.PhoneNumber || null,
  friendStatus: Number(base.friendStatus ?? 0),
  bio: base.bio || base.Bio || null,
  avatarUrl: base.avatarUrl || base.AvatarUrl || null,
  joinedAt: undefined,
  friendCount: Number(base.friendCount ?? friendsCount),
  postCount: Number(base.postCount ?? posts.length),
  posts,
});

export type { UserApiResponse };

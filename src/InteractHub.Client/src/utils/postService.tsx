import api from "../api/axiosConfig";
import type { CommentItem, PostItem, StoryGroup } from "../components/types";

type PostApiResponse = Partial<PostItem> & {
  authorName?: string;
};

type StoryItemApiResponse = {
  id?: number;
  imageUrl?: string | null;
  createdAt?: string;
};

type StoryGroupApiResponse = Partial<StoryGroup> & {
  stories?: StoryItemApiResponse[];
};

type SearchPostsResponse = {
  users?: Array<Record<string, unknown>>;
  posts?: PostApiResponse[];
  hashtags?: string[];
};

const mapPost = (post: PostApiResponse): PostItem => ({
  id: Number(post.id || 0),
  content: String(post.content || ""),
  imageUrl: post.imageUrl || null,
  createdAt: String(post.createdAt || ""),
  userId: String(post.userId || ""),
  userName: String(post.userName || post.authorName || ""),
  userFullName: post.userFullName || post.fullName || post.authorName || null,
  fullName: post.fullName || post.userFullName || post.authorName || null,
  avatarUrl: post.avatarUrl || null,
  userAvatar: post.userAvatar || post.avatarUrl || null,
  likeCount: Number(post.likeCount ?? 0),
  commentCount: Number(post.commentCount ?? 0),
  hashtags: Array.isArray(post.hashtags) ? post.hashtags : [],
  isLiked: Boolean(post.isLiked),
});

const mapComment = (comment: Partial<CommentItem>): CommentItem => ({
  id: Number(comment.id || 0),
  userId: String(comment.userId || ""),
  userName: comment.userName || null,
  userFullName: comment.userFullName || comment.fullName || null,
  fullName: comment.fullName || comment.userFullName || null,
  avatarUrl: comment.avatarUrl || null,
  content: String(comment.content || ""),
});

const mapStoryGroups = (groups: StoryGroupApiResponse[]): StoryGroup[] =>
  groups.map((group) => ({
    userId: String(group.userId || ""),
    userName: String(group.userName || ""),
    fullName: group.fullName || null,
    avatarUrl: group.avatarUrl || null,
    latestStoryTime: String(group.latestStoryTime || ""),
    stories: Array.isArray(group.stories)
      ? group.stories.map((story) => ({
          id: Number(story.id || 0),
          imageUrl: story.imageUrl || null,
          createdAt: String(story.createdAt || ""),
        }))
      : [],
  }));

export const fetchFeedPosts = async () => {
  const response = await api.get<PostApiResponse[]>("/posts/getAllPostByUser");
  return Array.isArray(response.data) ? response.data.map(mapPost) : [];
};

export const fetchUserPosts = async (userId: string) => {
  const response = await api.get<PostApiResponse[]>(
    `/posts/userPosts/${userId}`,
  );
  return Array.isArray(response.data) ? response.data.map(mapPost) : [];
};

export const fetchPostDetail = async (postId: number) => {
  const response = await api.get<PostApiResponse>(`/posts/${postId}`);
  return mapPost(response.data);
};

export const fetchPostComments = async (postId: number) => {
  const response = await api.get<Partial<CommentItem>[]>(
    `/posts/${postId}/comments`,
  );
  return Array.isArray(response.data) ? response.data.map(mapComment) : [];
};

export const createComment = async (postId: number, content: string) => {
  const response = await api.post<Partial<CommentItem>>(
    `/posts/${postId}/comment`,
    {
      content,
    },
  );
  return mapComment(response.data);
};

export const deleteCommentById = async (commentId: number) => {
  return api.delete(`/posts/comment/${commentId}`);
};

export const togglePostLike = async (postId: number) => {
  const response = await api.post<{ isLiked?: boolean; likeCount?: number }>(
    `/posts/${postId}/like`,
  );
  return response.data;
};

export const reportPost = async (
  postId: number,
  reason: string,
  description: string,
) => {
  return api.post(`/postreport`, {
    postId,
    reason,
    description,
  });
};

export const searchPosts = async (
  query: string,
  priorityId?: string | null,
  priorityUserId?: string | null,
) => {
  const params = new URLSearchParams({ q: query });
  if (priorityId) params.set("priorityId", priorityId);
  if (priorityUserId) params.set("priorityUserId", priorityUserId);

  const response = await api.get<SearchPostsResponse>(
    `/posts/search?${params.toString()}`,
  );
  return response.data;
};

export const fetchTrendingHashtags = async () => {
  const response = await api.get<string[]>("/posts/trending-hashtags");
  return Array.isArray(response.data) ? response.data : [];
};

export const fetchStories = async () => {
  const response = await api.get<StoryGroupApiResponse[]>("/stories");
  return Array.isArray(response.data) ? mapStoryGroups(response.data) : [];
};

export const createStory = async (image: File) => {
  const formData = new FormData();
  formData.append("image", image);
  return api.post("/stories/createStory", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

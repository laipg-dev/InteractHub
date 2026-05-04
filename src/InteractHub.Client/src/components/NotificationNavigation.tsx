import type { NotificationDto } from "./types";

export const getNotificationPath = (notification: NotificationDto): string => {
  switch (notification.type) {
    case "FriendRequestReceived":
      return "/home?view=friends&tab=requests";
    case "FriendAccepted":
      return notification.senderId
        ? `/profile/${notification.senderId}`
        : "/home?view=friends&tab=friends";
    case "PostLiked":
      return notification.postId
        ? `/home?postId=${notification.postId}`
        : "/home";
    case "PostCommented":
      return notification.postId
        ? `/home?postId=${notification.postId}&openComments=1`
        : "/home";
    case "NewPost":
      return notification.postId
        ? `/home?postId=${notification.postId}`
        : "/home";
    case "NewStory":
      return notification.senderId
        ? `/home?storyUserId=${notification.senderId}`
        : "/home";
    default:
      return "/home?view=notifications";
  }
};

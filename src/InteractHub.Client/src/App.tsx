import { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import RequireAdmin from "./components/auth/RequireAdmin";
import RequireAuth from "./components/auth/RequireAuth";
import { RouteLoading } from "./components/PageSkeletons";
import { AuthProvider } from "./context/AuthContext";

const EditProfile = lazy(() => import("./components/EditProfile"));
const ChangePassword = lazy(() => import("./pages/ChangePassword"));
const Home = lazy(() => import("./pages/Home"));
const Login = lazy(() => import("./pages/Login"));
const PostDetail = lazy(() => import("./pages/PostDetail"));
const Profile = lazy(() => import("./pages/Profile"));
const Register = lazy(() => import("./pages/Register"));
const SearchPage = lazy(() => import("./pages/SearchPage"));
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));
const AdminCommentsPage = lazy(() => import("./pages/admin/AdminCommentsPage"));
const AdminPostsPage = lazy(() => import("./pages/admin/AdminPostsPage"));
const AdminReportDetailPage = lazy(
  () => import("./pages/admin/AdminReportDetailPage"),
);
const AdminReportsPage = lazy(() => import("./pages/admin/AdminReportsPage"));
const AdminStoriesPage = lazy(() => import("./pages/admin/AdminStoriesPage"));
const AdminUserDetailPage = lazy(
  () => import("./pages/admin/AdminUserDetailPage"),
);
const AdminUsersPage = lazy(() => import("./pages/admin/AdminUsersPage"));

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<RouteLoading />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/register" element={<Register />} />

            <Route element={<RequireAuth />}>
              <Route path="/home" element={<Home />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/posts/:postId" element={<PostDetail />} />
              <Route path="/profile/:userId" element={<Profile />} />
              <Route path="/edit-profile" element={<EditProfile />} />
              <Route path="/change-password" element={<ChangePassword />} />
              <Route
                path="/notifications"
                element={<Navigate to="/home?view=notifications" replace />}
              />
            </Route>

            <Route element={<RequireAdmin />}>
              <Route path="/admin" element={<AdminLayout />}>
                <Route
                  index
                  element={<Navigate to="/admin/reports" replace />}
                />
                <Route path="reports" element={<AdminReportsPage />} />
                <Route
                  path="reports/:reportId"
                  element={<AdminReportDetailPage />}
                />
                <Route path="users" element={<AdminUsersPage />} />
                <Route path="users/:userId" element={<AdminUserDetailPage />} />
                <Route path="posts" element={<AdminPostsPage />} />
                <Route
                  path="posts/:postId"
                  element={<Navigate to="/admin/posts" replace />}
                />
                <Route path="comments" element={<AdminCommentsPage />} />
                <Route path="stories" element={<AdminStoriesPage />} />
              </Route>
            </Route>

            <Route path="/" element={<Navigate to="/login" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

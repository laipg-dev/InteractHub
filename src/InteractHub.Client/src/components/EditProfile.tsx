import React, { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import api from "../api/axiosConfig";

type EditProfileFormValues = {
  id: string;
  fullName: string;
  bio: string;
  email: string;
  phoneNumber: string;
  avatarUrl: string;
};

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

const EditProfile = () => {
  const navigate = useNavigate();
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [submitError, setSubmitError] = useState("");
  const [showFullAvatar, setShowFullAvatar] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<EditProfileFormValues>({
    defaultValues: {
      id: "",
      fullName: "",
      bio: "",
      email: "",
      phoneNumber: "",
      avatarUrl: "",
    },
    mode: "onBlur",
  });

  const avatarUrl = watch("avatarUrl");
  const fullName = watch("fullName");

  useEffect(() => {
    const fetchCurrentInfo = async () => {
      try {
        const res = await api.get("/users/me");
        reset({
          id: res.data.id || "",
          fullName: res.data.fullName || "",
          bio: res.data.bio || "",
          email: res.data.email || "",
          phoneNumber: res.data.phoneNumber || "",
          avatarUrl: res.data.avatarUrl || "",
        });
      } catch {
        setSubmitError("Không load được thông tin hiện tại.");
      } finally {
        setLoadingProfile(false);
      }
    };

    void fetchCurrentInfo();
  }, [reset]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const avatarFallback = useMemo(() => {
    return fullName?.trim()?.charAt(0)?.toUpperCase() || "U";
  }, [fullName]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setSubmitError("Avatar chỉ hỗ trợ JPG, PNG hoặc WEBP.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setSubmitError("Avatar phải nhỏ hơn 5MB.");
      return;
    }

    setSubmitError("");
    setAvatarFile(file);

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const nextPreviewUrl = URL.createObjectURL(file);
    setPreviewUrl(nextPreviewUrl);
    setValue("avatarUrl", nextPreviewUrl, { shouldDirty: true });
  };

  const onSubmit = async (values: EditProfileFormValues) => {
    setSubmitError("");

    try {
      const data = new FormData();
      data.append("fullName", values.fullName || "");
      data.append("bio", values.bio || "");
      data.append("email", values.email || "");
      data.append("phoneNumber", values.phoneNumber || "");

      if (avatarFile) {
        data.append("avatarFile", avatarFile);
      }

      await api.put("/users/update", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      navigate(`/profile/${values.id}`);
    } catch {
      setSubmitError("Có lỗi khi lưu thông tin rồi!");
    }
  };

  if (loadingProfile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-blue-600 font-semibold">
        Đang tải hồ sơ...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-8 md:p-12">
          <h2 className="text-2xl font-black text-gray-800 mb-10">
            Chỉnh sửa hồ sơ
          </h2>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="grid grid-cols-1 md:grid-cols-3 gap-10"
            noValidate
          >
            <div className="flex flex-col items-center space-y-4">
              <div className="relative group">
                <div
                  onClick={() => avatarUrl && setShowFullAvatar(true)}
                  className="w-32 h-32 md:w-40 md:h-40 bg-indigo-600 rounded-full flex items-center justify-center text-white text-4xl font-black border-4 border-white shadow-xl overflow-hidden cursor-zoom-in"
                >
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    avatarFallback
                  )}
                </div>

                <label className="absolute bottom-2 right-2 bg-blue-600 p-2 rounded-full border-2 border-white text-white hover:bg-blue-700 cursor-pointer transition shadow-lg">
                  <span className="text-[10px] font-bold">ĐỔI 📷</span>
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleAvatarChange}
                    accept="image/*"
                  />
                </label>
              </div>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest text-center">
                Click ảnh để xem to <br /> Click icon để đổi
              </p>
            </div>

            <div className="md:col-span-2 space-y-6">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase mb-2 ml-1">
                  Họ và Tên
                </label>
                <input
                  type="text"
                  {...register("fullName", {
                    required: "Vui lòng nhập họ và tên.",
                    minLength: {
                      value: 2,
                      message: "Họ và tên phải có ít nhất 2 ký tự.",
                    },
                  })}
                  className="w-full bg-gray-50 border-none rounded-2xl py-3 px-4 focus:ring-2 focus:ring-blue-500 transition"
                />
                {errors.fullName && (
                  <p className="mt-1 text-sm text-red-500">
                    {errors.fullName.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-black text-gray-400 uppercase mb-2 ml-1">
                  Giới thiệu (Bio)
                </label>
                <textarea
                  rows={3}
                  {...register("bio", {
                    maxLength: {
                      value: 160,
                      message: "Bio tối đa 160 ký tự.",
                    },
                  })}
                  className="w-full bg-gray-50 border-none rounded-2xl py-3 px-4 focus:ring-2 focus:ring-blue-500 transition"
                />
                {errors.bio && (
                  <p className="mt-1 text-sm text-red-500">
                    {errors.bio.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase mb-2 ml-1">
                    Email
                  </label>
                  <input
                    type="email"
                    {...register("email", {
                      required: "Vui lòng nhập email.",
                      pattern: {
                        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                        message: "Email không đúng định dạng.",
                      },
                    })}
                    className="w-full bg-gray-50 border-none rounded-2xl py-3 px-4 focus:ring-2 focus:ring-blue-500"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-500">
                      {errors.email.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase mb-2 ml-1">
                    Số điện thoại
                  </label>
                  <input
                    type="text"
                    {...register("phoneNumber", {
                      pattern: {
                        value: /^[0-9+()\-\s]{8,15}$/,
                        message: "Số điện thoại không hợp lệ.",
                      },
                    })}
                    className="w-full bg-gray-50 border-none rounded-2xl py-3 px-4 focus:ring-2 focus:ring-blue-500"
                  />
                  {errors.phoneNumber && (
                    <p className="mt-1 text-sm text-red-500">
                      {errors.phoneNumber.message}
                    </p>
                  )}
                </div>
              </div>

              {submitError && (
                <div className="text-red-500 text-sm bg-red-50 p-3 rounded border border-red-200 text-center">
                  {submitError}
                </div>
              )}

              <div className="pt-6 flex space-x-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-2xl hover:bg-blue-700 shadow-lg transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="px-8 py-3 bg-gray-100 text-gray-500 font-bold rounded-2xl hover:bg-gray-200 transition"
                >
                  Hủy
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {showFullAvatar && avatarUrl && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setShowFullAvatar(false)}
        >
          <img
            src={avatarUrl}
            alt="Full Avatar"
            className="max-w-full max-h-full rounded-2xl shadow-2xl"
          />
          <button className="absolute top-10 right-10 text-white font-black text-2xl">
            ✕
          </button>
        </div>
      )}
    </div>
  );
};

export default EditProfile;

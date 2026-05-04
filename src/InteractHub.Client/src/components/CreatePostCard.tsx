import React, { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Image as ImageIcon, Hash } from "lucide-react";
import api from "../api/axiosConfig";
import type { CurrentUserSummary } from "./types";

interface CreatePostCardProps {
  onPostCreated: () => void;
  userData: CurrentUserSummary | null;
}

type CreatePostFormValues = {
  content: string;
  hashtags: string;
};

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

const CreatePostCard = ({ onPostCreated, userData }: CreatePostCardProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreatePostFormValues>({
    defaultValues: {
      content: "",
      hashtags: "",
    },
    mode: "onChange",
  });

  const content = watch("content");

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const displayName =
    userData?.userFullName || userData?.userName || "Người dùng";
  const avatarUrl = userData?.avatarUrl || null;
  const avatarFallback = displayName.charAt(0).toUpperCase() || "U";

  const canSubmit = useMemo(() => {
    return Boolean(content.trim() || selectedFile);
  }, [content, selectedFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setSubmitError("Ảnh chỉ hỗ trợ JPG, PNG hoặc WEBP.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setSubmitError("Ảnh phải nhỏ hơn 5MB.");
      return;
    }

    setSubmitError("");
    setSelectedFile(file);

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const removePreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onSubmit = async (values: CreatePostFormValues) => {
    if (!values.content.trim() && !selectedFile) {
      setSubmitError("Bạn cần nhập nội dung hoặc chọn ảnh trước khi đăng.");
      return;
    }

    setSubmitError("");

    try {
      const formData = new FormData();
      formData.append("Content", values.content.trim());
      if (selectedFile) formData.append("image", selectedFile);

      const tagList = values.hashtags
        .split(/[\s,]+/)
        .filter((t) => t.trim() !== "")
        .map((tag) => (tag.startsWith("#") ? tag.slice(1) : tag));

      tagList.forEach((tag) => formData.append("Hashtags", tag));

      await api.post("/posts/CreatePost", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      reset();
      removePreview();
      onPostCreated();
    } catch {
      setSubmitError("Lỗi đăng bài rồi!");
    }
  };

  return (
    <div className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-50 mb-8">
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-600 flex-shrink-0 flex items-center justify-center text-white font-black border-2 border-white overflow-hidden">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              avatarFallback
            )}
          </div>
          <div className="flex-1 space-y-3">
            <textarea
              placeholder={`${displayName} đang nghĩ gì thế?`}
              className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-100 outline-none resize-none transition-all font-medium"
              rows={3}
              {...register("content", {
                maxLength: {
                  value: 500,
                  message: "Nội dung bài viết tối đa 500 ký tự.",
                },
              })}
            />
            {errors.content && (
              <p className="text-sm text-red-500">{errors.content.message}</p>
            )}

            <div className="mt-4">
              <div className="group flex items-center gap-3 bg-blue-50/40 border border-blue-100 rounded-2xl px-4 py-3 transition-all focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100">
                <div className="bg-blue-600 p-1 rounded-lg text-white shadow-md shadow-blue-100">
                  <Hash size={14} />
                </div>
                <input
                  type="text"
                  placeholder="Gắn thẻ nội dung (ví dụ: IT, Audit, TechLead)..."
                  className="w-full bg-transparent border-none outline-none text-xs font-black text-blue-600 placeholder:text-blue-300 tracking-tight"
                  {...register("hashtags")}
                />
              </div>
            </div>

            {previewUrl && (
              <div className="relative inline-block mt-2">
                <img
                  src={previewUrl}
                  className="max-h-60 rounded-2xl border"
                  alt="Preview"
                />
                <button
                  type="button"
                  onClick={removePreview}
                  className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full hover:bg-red-500"
                >
                  ✕
                </button>
              </div>
            )}

            {submitError && (
              <div className="text-red-500 text-sm bg-red-50 p-3 rounded border border-red-200 text-center">
                {submitError}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-50">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 text-gray-500 hover:text-blue-600 px-3 py-2 rounded-xl transition font-bold text-xs"
          >
            <ImageIcon size={18} className="text-blue-500" />
            <span>Thêm ảnh</span>
            <input
              type="file"
              ref={fileInputRef}
              hidden
              accept="image/*"
              onChange={handleFileChange}
            />
          </button>

          <button
            type="submit"
            disabled={isSubmitting || !canSubmit}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-xl font-black text-xs shadow-lg shadow-blue-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting ? "ĐANG XỬ LÝ..." : "ĐĂNG BÀI"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreatePostCard;

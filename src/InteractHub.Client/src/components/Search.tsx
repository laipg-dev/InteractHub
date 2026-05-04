/**
 * Search.tsx
 * Thanh tìm kiếm với dropdown gợi ý nhanh cho InteractHub.
 */

import React, { useState, useEffect, useCallback, useRef, memo } from "react";
import { useNavigate } from "react-router-dom";
import { Search as SearchIcon } from "lucide-react";
import _ from "lodash";
import api from "../api/axiosConfig";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SuggestedUser {
  id: string | number;
  userName: string;
  fullName?: string | null;
  avatarUrl?: string | null;
  bio?: string;
}
export interface SuggestedPost {
  id: string | number;
  authorName: string;
  authorAvatarUrl?: string | null;
  content: string;
}

export interface SuggestionsResult {
  users: SuggestedUser[];
  posts: SuggestedPost[];
  hashtags: string[];
}

interface SearchProps {
  embedded?: boolean;
}

// ─── Avatar helper ────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "bg-indigo-500",
  "bg-blue-500",
  "bg-violet-500",
  "bg-emerald-500",
  "bg-rose-500",
  "bg-amber-500",
];

const Avatar: React.FC<{
  name: string;
  avatarUrl?: string | null;
  size?: "sm" | "md";
}> = memo(({ name, avatarUrl, size = "sm" }) => {
  const safeName = name || "U";
  const color = AVATAR_COLORS[safeName.charCodeAt(0) % AVATAR_COLORS.length];
  const dim = size === "sm" ? "w-8 h-8 text-xs" : "w-10 h-10 text-sm";

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={safeName}
        className={`${dim} rounded-full object-cover flex-shrink-0`}
      />
    );
  }

  return (
    <div
      className={`${dim} ${color} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0`}
    >
      {safeName[0]?.toUpperCase()}
    </div>
  );
});

// ─── Dropdown section label ───────────────────────────────────────────────────

const SectionHeading: React.FC<{ icon: string; label: string }> = ({
  icon,
  label,
}) => (
  <div className="flex items-center gap-1.5 px-3 pt-2 pb-1">
    <span className="text-xs leading-none">{icon}</span>
    <span className="text-[10px] font-black tracking-widest text-gray-400 uppercase">
      {label}
    </span>
  </div>
);

// ─── Dropdown ─────────────────────────────────────────────────────────────────

interface DropdownProps {
  results: SuggestionsResult;
  query: string;
  onSelectUser: (u: SuggestedUser) => void;
  onSelectPost: (p: SuggestedPost) => void;
  onSelectHashtag: (tag: string) => void;
  onClose: () => void;
  embedded?: boolean;
}

const SearchDropdown: React.FC<DropdownProps> = memo(
  ({
    results,
    query,
    onSelectUser,
    onSelectPost,
    onSelectHashtag,
    onClose,
    embedded = false,
  }) => {
    const isEmpty =
      !results.users.length &&
      !results.posts.length &&
      !results.hashtags.length;

    return (
      <>
        <div className="fixed inset-0 z-10" onClick={onClose} />

        <div
          className={`absolute left-0 right-0 z-20 mt-2 overflow-hidden border max-h-[70vh] overflow-y-auto ${
            embedded
              ? "top-full rounded-3xl border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
              : "top-full rounded-2xl border-gray-100 bg-white shadow-2xl"
          }`}
        >
          {isEmpty ? (
            <div className="flex flex-col items-center gap-2 py-10 text-gray-400">
              <span className="text-3xl">🔍</span>
              <p className="text-sm">
                Không tìm thấy gì cho &ldquo;{query}&rdquo;
              </p>
            </div>
          ) : (
            <>
              {results.users.length > 0 && (
                <div className="pb-1">
                  <SectionHeading icon="👤" label="Người dùng" />
                  {results.users.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => onSelectUser(u)}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-blue-50 transition-colors text-left dark:hover:bg-slate-800"
                    >
                      <Avatar
                        name={u.fullName || u.userName}
                        avatarUrl={u.avatarUrl}
                      />

                      <div className="min-w-0">
                        <p className="font-bold text-sm text-gray-800 dark:text-slate-100 truncate">
                          {u.fullName || u.userName}
                        </p>
                        {u.bio && (
                          <p className="text-xs text-gray-400 dark:text-slate-400 truncate">
                            {u.bio}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {results.hashtags.length > 0 && (
                <>
                  {results.users.length > 0 && (
                    <div className="h-px bg-gray-100 mx-3 dark:bg-slate-800" />
                  )}
                  <div className="pb-2">
                    <SectionHeading icon="🔥" label="Xu hướng" />
                    <div className="flex flex-wrap gap-2 px-3">
                      {results.hashtags.map((tag) => (
                        <button
                          key={tag}
                          onClick={() => onSelectHashtag(tag)}
                          className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-bold hover:bg-indigo-600 hover:text-white transition-colors dark:bg-slate-800 dark:text-slate-200"
                        >
                          #{tag}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {results.posts.length > 0 && (
                <>
                  {(results.users.length > 0 ||
                    results.hashtags.length > 0) && (
                    <div className="h-px bg-gray-100 mx-3 dark:bg-slate-800" />
                  )}
                  <div className="pb-1">
                    <SectionHeading icon="📝" label="Bài viết" />
                    {results.posts.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => onSelectPost(p)}
                        className="w-full flex items-start gap-3 px-3 py-2 hover:bg-gray-50 transition-colors text-left dark:hover:bg-slate-800"
                      >
                        <Avatar
                          name={p.authorName}
                          avatarUrl={p.authorAvatarUrl}
                        />
                        <div className="min-w-0">
                          <span className="block text-sm font-bold text-gray-800 dark:text-slate-100 truncate">
                            {p.authorName}
                          </span>
                          <span className="block text-sm text-gray-600 dark:text-slate-300 line-clamp-1 mt-0.5">
                            {p.content}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </>
    );
  },
);

// ─── Main component ───────────────────────────────────────────────────────────

const Search: React.FC<SearchProps> = ({ embedded = false }) => {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SuggestionsResult | null>(
    null,
  );
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fetchSuggestions = useCallback(
    _.debounce(async (q: string) => {
      if (!q.trim()) {
        setSuggestions(null);
        setIsOpen(false);
        return;
      }
      setIsLoading(true);
      try {
        const res = await api.get(`/posts/search?q=${encodeURIComponent(q)}`);
        setSuggestions(res.data);
        setIsOpen(true);
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setIsLoading(false);
      }
    }, 300),
    [],
  );

  useEffect(() => {
    fetchSuggestions(query);
    return () => fetchSuggestions.cancel();
  }, [query, fetchSuggestions]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && query.trim()) {
      setIsOpen(false);
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    }
    if (e.key === "Escape") setIsOpen(false);
  };

  const handleSelectUser = (u: SuggestedUser) => {
    setIsOpen(false);
    navigate(`/search?q=${encodeURIComponent(query)}&priorityUserId=${u.id}`);
  };

  const handleSelectPost = (p: SuggestedPost) => {
    setIsOpen(false);
    navigate(`/search?q=${encodeURIComponent(query)}&priorityId=${p.id}`);
  };

  const handleSelectHashtag = (tag: string) => {
    const q = `#${tag}`;
    setQuery(q);
    setIsOpen(false);
    navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  const handleClear = () => {
    setQuery("");
    setSuggestions(null);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div
      className={
        embedded ? "relative w-full" : "relative w-full max-w-2xl mx-auto mb-6"
      }
    >
      <div className="relative flex items-center">
        <span className="absolute left-3.5 pointer-events-none z-10 leading-none text-slate-400">
          <SearchIcon size={18} />
        </span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (query && suggestions) setIsOpen(true);
          }}
          placeholder="Tìm kiếm người dùng, bài viết, #hashtag..."
          className={`w-full transition-all text-sm ${
            embedded
              ? "rounded-2xl border border-slate-200/80 bg-white/80 py-3 pl-10 pr-16 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900/75 dark:text-white dark:placeholder:text-slate-400"
              : "rounded-2xl border border-gray-200 bg-white py-3 pl-10 pr-16 shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
          }`}
        />
        <div className="absolute right-3.5 flex items-center gap-2">
          {isLoading && (
            <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          )}
          {query && !isLoading && (
            <button
              onClick={handleClear}
              className="text-gray-400 hover:text-gray-600 text-xl leading-none transition-colors dark:text-slate-400 dark:hover:text-slate-200"
              aria-label="Xóa"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {isOpen && suggestions && (
        <SearchDropdown
          results={suggestions}
          query={query}
          onSelectUser={handleSelectUser}
          onSelectPost={handleSelectPost}
          onSelectHashtag={handleSelectHashtag}
          onClose={() => setIsOpen(false)}
          embedded={embedded}
        />
      )}
    </div>
  );
};

export default Search;

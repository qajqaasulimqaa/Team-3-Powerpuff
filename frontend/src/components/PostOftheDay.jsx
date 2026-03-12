import { useEffect, useState } from 'react';

const API = import.meta.env.VITE_API_URL;

export default function PostOfTheDay({ avatar = 'https://placehold.co/40x40?text=%40', reposts = 0 } = {}) {
  const [postOfTheDay, setPostOfTheDay] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${API}/api/post-of-the-day`)
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        return res.json();
      })
      .then((data) => {
        setPostOfTheDay(data);
      })
      .catch((err) => {
        console.error('Post of the day fetch failed:', err);
        setError(err.message);
      });
  }, []);

  if (error) return <div className="text-center text-sm text-gray-400">Could not load post of the day.</div>;
  if (!postOfTheDay) return <div>Loading...</div>;

  const { content, image_url, profiles } = postOfTheDay;
  const { username, avatar_url } = profiles;

  return (
    <div className="mt-[1.88rem]">
      <h3 className="text-black text-center font-['Montserrat'] text-[1.75rem] not-italic font-medium leading-normal mb-4">
        Post of the day
      </h3>

      <div className="w-92.5 sm:w-full sm:max-w-xl mx-auto rounded-3xl p-6 bg-[#1a3a5c] shadow-xl font-['Poppins']">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <img src={avatar_url ? avatar_url : avatar} alt="avatar" className="w-10 h-10 rounded-full object-cover" />
          <span className="text-white font-semibold text-sm">@{username}</span>
        </div>

        {/* Content */}
        <p className="text-white text-lg font-medium text-center mb-4 leading-snug">{content}</p>

        {/* Image */}
        {image_url && (
          <div className="rounded-2xl overflow-hidden mb-4">
            <img src={image_url} alt="post" className="w-full max-h-64 object-cover" />
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-between items-center mt-2 px-1">
          <button className="flex items-center gap-2 text-[#4ade80] font-semibold text-sm hover:opacity-75 transition-opacity">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 010-6.364z"
              />
            </svg>
            {(postOfTheDay.post_interactions?.length || 0) >= 1000
              ? `${((postOfTheDay.post_interactions?.length || 0) / 1000).toFixed(1)}k`
              : postOfTheDay.post_interactions?.length || 0}
          </button>

          <button className="flex items-center gap-2 text-[#4ade80] font-semibold text-sm hover:opacity-75 transition-opacity">
            {reposts >= 1000 ? `${(reposts / 1000).toFixed(1)}k` : reposts}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import ForumPost from "./ForumPosts";

const API = import.meta.env.VITE_API_URL;

export default function ForumFeed({ searchQuery = "", onError }) {
  const [posts, setPosts] = useState([]);
  const currentUser = JSON.parse(localStorage.getItem("user") || "null");

  function loadPosts() {
    const url = currentUser?.id ? `${API}/api/forum?userId=${currentUser.id}` : `${API}/api/forum`;
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        return res.json();
      })
      .then((data) => setPosts(Array.isArray(data) ? data : []))
      .catch((err) => {
        console.error('Forum feed fetch failed:', err);
        onError?.('Could not load forum posts.');
      });
  }

  useEffect(() => { loadPosts(); }, []);

  function handleDelete(id) {
    setPosts(prev => prev.filter(p => p.id !== id));
  }

  const filtered = posts.filter(post =>
    post.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.profiles?.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col items-center gap-4 py-6 w-full overflow-x-hidden px-4">
      {filtered.length === 0 && searchQuery && (
        <p className="text-gray-400 text-sm">No posts found for "{searchQuery}"</p>
      )}
      {filtered.map(post => (
        <ForumPost key={post.id} post={post} currentUserId={currentUser?.id} onDelete={handleDelete} onRefresh={loadPosts} />
      ))}
    </div>
  );
}
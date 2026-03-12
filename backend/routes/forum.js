import express from 'express';
import { checkAuth } from '../middleware/checkAuth.js';
import { checkAdmin } from '../middleware/checkAdmin.js';
import { supabase } from '../supabase-client.js';
import multer from 'multer';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('forum')
    .select('*, profiles(username, avatar_url)')
    .order('id', { ascending: false });
  if (error) return res.status(400).json({ error: error.message });

  // Count likes from post_interactions for all posts
  const postIds = data.map(p => p.id);
  const { data: allLikes } = await supabase
    .from('post_interactions')
    .select('post_id')
    .in('post_id', postIds)
    .eq('interaction_type', 'like');
  const likeCounts = {};
  (allLikes || []).forEach(i => { likeCounts[i.post_id] = (likeCounts[i.post_id] || 0) + 1; });

  const userId = req.query.userId;
  let likedSet = new Set();
  if (userId) {
    const { data: userLikes } = await supabase
      .from('post_interactions')
      .select('post_id')
      .eq('user_id', userId)
      .eq('interaction_type', 'like');
    likedSet = new Set((userLikes || []).map(i => i.post_id));
  }

  const enriched = data.map(post => ({
    ...post,
    likes: likeCounts[post.id] || 0,
    likedByUser: likedSet.has(post.id),
  }));
  res.json(enriched);
});

router.get('/user/:userId', checkAuth, async (req, res) => {
  const userId = req.params.userId;

  const { data, error } = await supabase
    .from('forum')
    .select('*, profiles(username, avatar_url)')
    .eq('poster_id', userId);

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

router.post('/', checkAuth, upload.single('image'), async (req, res) => {
  try {
    console.log('Body:', req.body);     
    console.log('File:', req.file);  
    const { title, content } = req.body;
    const poster_id = req.user.id;
    let image_url = null;

    if (req.file) {
      const fileName = `${Date.now()}-${req.file.originalname}`;
      const { error: uploadError } = await supabase.storage.from('images').upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
      });

      if (uploadError) return res.status(400).json({ error: uploadError.message });
      const { data: publicUrl } = supabase.storage.from('images').getPublicUrl(fileName);

      image_url = publicUrl.publicUrl;
    }

    const { data, error } = await supabase
      .from('forum')
      .insert([{ poster_id, title, content, image_url, created_at: new Date(), modified_at: new Date() }])
      .select();


    if (error) return res.status(400).json({ error: error.message });

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//Section for like/reblog routes - MUST come BEFORE generic /:id routes

router.post('/:id/like', checkAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const postId = req.params.id;

    const { data: existing } = await supabase
      .from('post_interactions')
      .select('id')
      .eq('user_id', userId)
      .eq('post_id', postId)
      .eq('interaction_type', 'like')
      .maybeSingle();

    if (existing) {
      const { error: delErr } = await supabase.from('post_interactions').delete().eq('id', existing.id);
      if (delErr) console.error('Unlike error:', delErr);
      const { data: updated, error: updErr } = await supabase.from('forum').select('likes').eq('id', postId).single();
      const newLikes = Math.max(0, (updated?.likes || 1) - 1);
      await supabase.from('forum').update({ likes: newLikes }).eq('id', postId);
      return res.json({ liked: false, likes: newLikes });
    }

    const { error: insErr } = await supabase.from('post_interactions').insert([{ user_id: userId, post_id: postId, interaction_type: 'like', created_at: new Date() }]);
    if (insErr) {
      console.error('Like insert error:', insErr);
      return res.status(400).json({ error: insErr.message });
    }
    const { data: post } = await supabase.from('forum').select('likes').eq('id', postId).single();
    const newLikes = (post?.likes || 0) + 1;
    const { error: updErr } = await supabase.from('forum').update({ likes: newLikes }).eq('id', postId);
    if (updErr) console.error('Like update error:', updErr);
    res.json({ liked: true, likes: newLikes });
  } catch (err) {
    console.error('Like catch:', err);
    res.status(500).json({ error: err.message });
  }
});

//Here we just use the same pattern for everything but with retweets, so just refer back to the corresponding section in the like code!
router.post('/:id/retweet', checkAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const postId = req.params.id;

    const { data: existing, error: checkError } = await supabase
      .from('post_interactions')
      .select('*')
      .eq('user_id', userId)
      .eq('post_id', postId)
      .eq('interaction_type', 'retweet')
      .single();

    if (existing) return res.status(400).json({ error: 'Already retweeted this post' });

    await supabase
      .from('post_interactions')
      .insert([{ user_id: userId, post_id: postId, interaction_type: 'retweet', created_at: new Date() }]);

    const { error } = await supabase.rpc('increment_retweets', { post_id: parseInt(postId) });

    if (error) return res.status(400).json({ error: error.message });

    res.json({ message: 'Post retweeted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Generic /:id routes AFTER specific ones

router.put('/:id', checkAuth, async (req, res) => {
  const { content } = req.body;
  const { data, error } = await supabase
    .from('forum')
    .update({ content, modified_at: new Date() })
    .eq('id', req.params.id);

  if (error) return res.status(400).json({ error: error.message });

  res.json(data);
});

router.delete('/:id', checkAuth, async (req, res) => {
  const postId = parseInt(req.params.id);
  const userId = req.user.id;

  // verify ownership
  const { data: post, error: fetchErr } = await supabase.from('forum').select('poster_id').eq('id', postId).single();
  if (fetchErr) { console.error('Fetch post error:', fetchErr); return res.status(400).json({ error: fetchErr.message }); }
  if (!post) return res.status(404).json({ error: 'Post not found' });
  if (post.poster_id !== userId) return res.status(403).json({ error: 'Not your post' });

  // delete related rows first (ignore errors if tables don't have matching rows)
  await supabase.from('post_interactions').delete().eq('post_id', postId).then(() => {}).catch(() => {});
  await supabase.from('replies').delete().eq('topic_id', postId).then(() => {}).catch(() => {});

  const { error } = await supabase.from('forum').delete().eq('id', postId);
  if (error) {
    console.error('Delete post error:', error);
    return res.status(400).json({ error: error.message });
  }
  res.json({ message: 'Post deleted' });
});
//admin route for deleting mean posts :<
router.delete('/admin/:id', checkAdmin, async (req, res) => {
  const { error } = await supabase.from('forum').delete().eq('id', req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: 'Topic deleted' });
});

export default router;

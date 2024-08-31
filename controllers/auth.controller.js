const fs = require('fs');
const supabase = require('../lib/supabaseAPI');

// @PUT /api/auth/profile
exports.updateProfile = async (req, res) => {
  console.log('updateProfile');

  const token = req.headers.authorization.split('Bearer ')[1];
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user) {
    return res.status(401).json({ error: 'tokenが無効です' });
  }

  // * profileデータの更新
  const profileData = req.body.profileData;
  const { data: updatedUser, error: updatedUserError } = await supabase.from('profiles').update(profileData).eq('id', user.id);
  if (updatedUserError) {
    return res.status(401).json({ error: updatedUserError.message });
  }

  // * supabaeのdisplayNameを更新
  const { data, error: authError } = await supabase.auth.admin.updateUserById(user.id, {
    user_metadata: {
      displayName: profileData.name
    }
  });
  if (authError) {
    return res.status(401).json({ error: authError.message });
  }

  res.status(200).json({ message: 'Profile updated' });
};

// @GET /api/auth/profile
exports.getProfile = async (req, res) => {
  console.log('getProfile');
  try {
    const token = req.headers.authorization?.split('Bearer ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    // console.log('data =>', user);
    if (userError || !user) {
      return res.status(401).json({ error: 'tokenが無効です' });
    }
    const { data: profile, error: profileError } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (profileError) {
      return res.status(401).json({ error: profileError.message });
    }
    res.status(200).json({ profile, user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'error' });
  }
};
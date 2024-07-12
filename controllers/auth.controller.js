const supabase = require('../lib/supabaseAPI');

// @POST /api/auth/signup
exports.signup = async (req, res) => {
  const { email, password, name } = req.body;
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { displayName: name }
    }
  });
  console.log('data', data.user);
  if (error) {
    return res.status(400).json({ error: error.message });
  }
  const { data: profile, error: profileError } = await supabase.from('profiles').update({ name: name }).eq('id', data.user.id);
  if (profileError) {
    return res.status(400).json({ error: profileError.message });
  }
  res.status(200).json(data.session.access_token);
};

// @POST /api/auth/signin
exports.signin = async (req, res) => {
  const { email, password } = req.body;
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  console.log('SignIn Data =>', data);
  if (error) {
    return res.status(400).json({ error: error.message });
  }
  return res.status(400).json(data.session.access_token);
};

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
    if (userError || !user) {
      return res.status(401).json({ error: 'tokenが無効です' });
    }
    const { data: profile, error: profileError } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (profileError) {
      return res.status(401).json({ error: profileError.message });
    }
    res.status(200).json({ profile });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'error' });
  }
  res.status(200).json();
};